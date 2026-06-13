import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, join, extname, basename } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { getConfig } from "../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = resolve(__dirname, "../../evidence_index.json");

interface EvidenceEntry {
  file: string;
  category: EvidenceCategory;
  text: string;
  vector: number[];
}

type EvidenceCategory = "experience" | "projects";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getEmbedder() {
  // Dynamic import so the heavy model loads only when actually needed
  const { pipeline } = await import("@xenova/transformers");
  return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
}

async function embed(embedder: any, text: string): Promise<number[]> {
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

function collectMdFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectMdFiles(full));
    } else if (extname(entry) === ".md" && /^[EP]\d+/i.test(basename(entry))) {
      files.push(full);
    }
  }
  return files;
}

function getEvidenceCategory(file: string): EvidenceCategory {
  return /[\\/]evidence[\\/]projects[\\/]/i.test(file) ? "projects" : "experience";
}

export async function rebuildEvidenceIndex(): Promise<string> {
  const config = getConfig();
  if (!config.evidencePath) {
    return "evidencePath is not set in config.json. Add it and try again.";
  }

  const evidenceDir = config.evidencePath;
  let files: string[];
  try {
    files = collectMdFiles(evidenceDir);
  } catch {
    return `Could not read evidence directory: ${evidenceDir}`;
  }

  if (files.length === 0) {
    return `No .md files found in ${evidenceDir}`;
  }

  const embedder = await getEmbedder();
  const entries: EvidenceEntry[] = [];

  for (const file of files) {
    const text = readFileSync(file, "utf-8");
    const vector = await embed(embedder, text);
    entries.push({ file, category: getEvidenceCategory(file), text: text.slice(0, 500), vector });
  }

  writeFileSync(INDEX_PATH, JSON.stringify(entries, null, 2), "utf-8");

  return `Evidence index rebuilt. ${entries.length} files indexed and saved to evidence_index.json.`;
}
