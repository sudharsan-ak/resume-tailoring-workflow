import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MCP_SERVER_ROOT = resolve(__dirname, "../../..");
const PYTHON_SERVICE_PATH = resolve(MCP_SERVER_ROOT, "python/evidence_service.py");
const DEFAULT_PORT = 8765;
const STARTUP_TIMEOUT_MS = 90_000;

export type SemanticEngineMode = "typescript" | "python";

export interface VectorCandidate {
  id: string;
  vector: number[];
}

export interface TextCandidate {
  id: string;
  text: string;
}

export interface RankedScore {
  id: string;
  score: number;
}

export interface SemanticEngine {
  readonly name: SemanticEngineMode;
  readonly model: string;
  embed(texts: string[]): Promise<number[][]>;
  rankVectors(queryVector: number[], candidates: VectorCandidate[]): Promise<RankedScore[]>;
  rankTexts(queryVector: number[], candidates: TextCandidate[]): Promise<RankedScore[]>;
}

export function semanticEngineMode(override?: SemanticEngineMode): SemanticEngineMode {
  const value = (override ?? process.env.EVIDENCE_ENGINE ?? "typescript").trim().toLowerCase();
  if (value === "typescript" || value === "python") return value;
  throw new Error(`Unsupported EVIDENCE_ENGINE value "${value}". Use "typescript" or "python".`);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding dimension mismatch: ${a.length} vs ${b.length}.`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

let transformerPipelinePromise: Promise<any> | null = null;

async function getTransformerPipeline(): Promise<any> {
  if (!transformerPipelinePromise) {
    transformerPipelinePromise = import("@xenova/transformers").then(({ pipeline }) =>
      pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
    );
  }
  return transformerPipelinePromise;
}

const typescriptEngine: SemanticEngine = {
  name: "typescript",
  model: "Xenova/all-MiniLM-L6-v2",
  async embed(texts) {
    const pipeline = await getTransformerPipeline();
    const vectors: number[][] = [];
    for (const text of texts) {
      const output = await pipeline(text, { pooling: "mean", normalize: true });
      vectors.push(Array.from(output.data as Float32Array));
    }
    return vectors;
  },
  async rankVectors(queryVector, candidates) {
    return candidates
      .map((candidate) => ({
        id: candidate.id,
        score: cosineSimilarity(queryVector, candidate.vector),
      }))
      .sort((left, right) => right.score - left.score);
  },
  async rankTexts(queryVector, candidates) {
    const vectors = await this.embed(candidates.map((candidate) => candidate.text));
    return candidates
      .map((candidate, index) => ({
        id: candidate.id,
        score: cosineSimilarity(queryVector, vectors[index]),
      }))
      .sort((left, right) => right.score - left.score);
  },
};

function configuredPort(): number {
  const raw = process.env.EVIDENCE_PYTHON_PORT;
  if (!raw) return DEFAULT_PORT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1024 || parsed > 65535) {
    throw new Error(`Invalid EVIDENCE_PYTHON_PORT "${raw}".`);
  }
  return parsed;
}

function serviceBaseUrl(): string {
  return `http://127.0.0.1:${configuredPort()}`;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 2_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function healthReady(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${serviceBaseUrl()}/health`);
    if (!response.ok) return false;
    const body = await response.json() as { service?: string; ready?: boolean };
    return body.service === "resume-evidence-semantic-service" && body.ready === true;
  } catch {
    return false;
  }
}

let ownedChild: ChildProcess | null = null;
let startupPromise: Promise<void> | null = null;
let lastChildFailure: string | null = null;
let exitHookRegistered = false;

function pythonCommand(): { command: string; prefixArgs: string[] } {
  const configured = process.env.RESUME_PYTHON_EXECUTABLE?.trim();
  if (configured) return { command: configured, prefixArgs: [] };

  const localVenv = process.platform === "win32"
    ? resolve(MCP_SERVER_ROOT, ".venv/Scripts/python.exe")
    : resolve(MCP_SERVER_ROOT, ".venv/bin/python");
  if (existsSync(localVenv)) return { command: localVenv, prefixArgs: [] };

  return process.platform === "win32"
    ? { command: "py", prefixArgs: ["-3"] }
    : { command: "python3", prefixArgs: [] };
}

function stopOwnedService(): void {
  if (!ownedChild) return;
  try {
    ownedChild.kill();
  } catch {
    // The Python parent-process watcher is the final cleanup path.
  }
  ownedChild = null;
}

function registerExitHook(): void {
  if (exitHookRegistered) return;
  exitHookRegistered = true;
  process.once("exit", stopOwnedService);
}

async function startPythonService(): Promise<void> {
  if (await healthReady()) return;
  if (!existsSync(PYTHON_SERVICE_PATH)) {
    throw new Error(`Python semantic service not found at ${PYTHON_SERVICE_PATH}.`);
  }

  const { command, prefixArgs } = pythonCommand();
  lastChildFailure = null;
  ownedChild = spawn(command, [
    ...prefixArgs,
    PYTHON_SERVICE_PATH,
    "--host", "127.0.0.1",
    "--port", String(configuredPort()),
    "--parent-pid", String(process.pid),
  ], {
    cwd: dirname(PYTHON_SERVICE_PATH),
    windowsHide: true,
    stdio: "ignore",
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
  registerExitHook();
  ownedChild.once("error", (error) => {
    lastChildFailure = error.message;
  });
  ownedChild.once("exit", (code, signal) => {
    if (code !== null && code !== 0) lastChildFailure = `process exited with code ${code}`;
    if (signal) lastChildFailure = `process exited from signal ${signal}`;
    ownedChild = null;
  });
  ownedChild.unref();

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await healthReady()) return;
    if (lastChildFailure) {
      throw new Error(`Python semantic service failed to start: ${lastChildFailure}.`);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  stopOwnedService();
  throw new Error(`Python semantic service did not become ready within ${STARTUP_TIMEOUT_MS / 1000} seconds.`);
}

async function ensurePythonService(): Promise<void> {
  if (await healthReady()) return;
  if (!startupPromise) {
    startupPromise = startPythonService().finally(() => {
      startupPromise = null;
    });
  }
  await startupPromise;
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  await ensurePythonService();
  const response = await fetchWithTimeout(`${serviceBaseUrl()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }, 120_000);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Python semantic service ${path} failed (${response.status}): ${detail}`);
  }
  return await response.json() as T;
}

const pythonEngine: SemanticEngine = {
  name: "python",
  model: "sentence-transformers/all-MiniLM-L6-v2",
  async embed(texts) {
    if (texts.length === 0) return [];
    const result = await postJson<{ vectors: number[][] }>("/embed", { texts });
    return result.vectors;
  },
  async rankVectors(queryVector, candidates) {
    if (candidates.length === 0) return [];
    const result = await postJson<{ results: RankedScore[] }>("/rank-vectors", {
      query_vector: queryVector,
      candidates,
    });
    return result.results;
  },
  async rankTexts(queryVector, candidates) {
    if (candidates.length === 0) return [];
    const result = await postJson<{ results: RankedScore[] }>("/rank-texts", {
      query_vector: queryVector,
      candidates,
    });
    return result.results;
  },
};

export async function getSemanticEngine(override?: SemanticEngineMode): Promise<SemanticEngine> {
  return semanticEngineMode(override) === "python" ? pythonEngine : typescriptEngine;
}
