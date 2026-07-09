import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs";
import { resolve, join, extname, basename } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { getConfig } from "../../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = resolve(__dirname, "../../../evidence_index.json");

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

// --- Tailoring patterns index ---
// Same embedding/cosine approach as evidence, applied to tailoring_patterns.md
// blocks instead of E##/P## files. Embeds each pattern's trigger (T:) line,
// since that's the JD-matching condition already written by hand.

const TAILORING_PATTERNS_PATH = resolve(__dirname, "../../../../../Shared Memory/tailoring_patterns.md");
const PATTERNS_INDEX_PATH = resolve(__dirname, "../../../tailoring_patterns_index.json");

export interface PatternIndexEntry {
  id: string;
  type: string;
  title: string;
  block: string; // full P-### block text (T:/G:/X:), returned verbatim on a match
  trigger: string; // T: line alone, used only to build the embedding
  vector: number[];
}

function parsePatternBlocks(content: string): { id: string; type: string; title: string; block: string; trigger: string }[] {
  const normalized = content.replace(/\r\n/g, "\n");
  const blocks = normalized.split(/\n\n+/).filter((b) => /^P-\d+\s*\|/.test(b.trim()));
  const results: { id: string; type: string; title: string; block: string; trigger: string }[] = [];
  for (const raw of blocks) {
    const block = raw.trim();
    const headerMatch = /^P-(\d+)\s*\|\s*(\w)\s*\|\s*(.+)$/m.exec(block);
    const triggerMatch = /^T:\s*(.+)$/m.exec(block);
    if (!headerMatch) continue;
    results.push({
      id: `P-${headerMatch[1]}`,
      type: headerMatch[2],
      title: headerMatch[3].trim(),
      block,
      trigger: triggerMatch ? triggerMatch[1].trim() : block,
    });
  }
  return results;
}

export async function rebuildTailoringPatternsIndex(): Promise<string> {
  if (!existsSync(TAILORING_PATTERNS_PATH)) {
    return "tailoring_patterns.md not found; skipped pattern index rebuild.";
  }
  const content = readFileSync(TAILORING_PATTERNS_PATH, "utf-8");
  const parsed = parsePatternBlocks(content);
  if (parsed.length === 0) {
    writeFileSync(PATTERNS_INDEX_PATH, "[]", "utf-8");
    return "No P-### pattern blocks found; wrote empty pattern index.";
  }

  const embedder = await getEmbedder();
  const entries: PatternIndexEntry[] = [];
  for (const p of parsed) {
    const vector = await embed(embedder, p.trigger);
    entries.push({ id: p.id, type: p.type, title: p.title, block: p.block, trigger: p.trigger, vector });
  }

  writeFileSync(PATTERNS_INDEX_PATH, JSON.stringify(entries), "utf-8");
  return `Tailoring patterns index rebuilt. ${entries.length} patterns indexed.`;
}
