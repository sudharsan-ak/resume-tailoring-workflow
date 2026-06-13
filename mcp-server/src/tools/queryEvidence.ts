import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = resolve(__dirname, "../../evidence_index.json");

export type EvidenceCategory = "all" | "experience" | "projects";

interface EvidenceEntry {
  file: string;
  category?: Exclude<EvidenceCategory, "all">;
  text: string;
  vector: number[];
}

export interface CategoryAwareLimits {
  experienceTopN: number;
  projectTopN: number;
}

interface ScoredEvidence {
  file: string;
  category: Exclude<EvidenceCategory, "all">;
  preview: string;
  score: number;
}

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
  const { pipeline } = await import("@xenova/transformers");
  return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
}

async function embed(embedder: any, text: string): Promise<number[]> {
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

function inferCategory(entry: EvidenceEntry): Exclude<EvidenceCategory, "all"> {
  if (entry.category) return entry.category;
  return /[\\/]evidence[\\/]projects[\\/]/i.test(entry.file) ? "projects" : "experience";
}

function formatResults(results: ScoredEvidence[], label: string): string {
  const lines = results.map((result, index) =>
    `${index + 1}. [${(result.score * 100).toFixed(1)}%] ${result.file}\n` +
    `   Preview: ${result.preview.slice(0, 150).replace(/\n/g, " ")}...`
  );
  return `Top ${results.length} ${label} evidence files for this JD:\n\n${lines.join("\n\n")}`;
}

export async function queryEvidence(
  jdText: string,
  topN: number = 6,
  evidenceCategory: EvidenceCategory = "all",
  categoryAwareLimits?: CategoryAwareLimits
): Promise<string> {
  if (!existsSync(INDEX_PATH)) {
    return "evidence_index.json not found. Run rebuild_evidence_index first to build the index.";
  }

  let entries: EvidenceEntry[];
  try {
    entries = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
  } catch {
    return "Failed to parse evidence_index.json. Run rebuild_evidence_index to rebuild it.";
  }

  if (entries.length === 0) {
    return "Evidence index is empty. Run rebuild_evidence_index to rebuild it.";
  }

  const embedder = await getEmbedder();
  const jdVector = await embed(embedder, jdText);
  const scored: ScoredEvidence[] = entries.map((entry) => ({
    file: entry.file,
    category: inferCategory(entry),
    preview: entry.text,
    score: cosineSimilarity(jdVector, entry.vector),
  }));
  scored.sort((a, b) => b.score - a.score);

  if (categoryAwareLimits) {
    const experience = scored
      .filter((entry) => entry.category === "experience")
      .slice(0, categoryAwareLimits.experienceTopN);
    const projects = scored
      .filter((entry) => entry.category === "projects")
      .slice(0, categoryAwareLimits.projectTopN);
    return `${formatResults(experience, "experience")}\n\n---\n\n${formatResults(projects, "project")}`;
  }

  const filtered = evidenceCategory === "all"
    ? scored
    : scored.filter((entry) => entry.category === evidenceCategory);

  if (filtered.length === 0) {
    return `No ${evidenceCategory} evidence files found in the index. Run rebuild_evidence_index to rebuild it.`;
  }

  return formatResults(filtered.slice(0, topN), evidenceCategory);
}
