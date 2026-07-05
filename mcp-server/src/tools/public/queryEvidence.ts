import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = resolve(__dirname, "../../../evidence_index.json");

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
  fullTextExperienceTopN?: number;
  fullTextProjectTopN?: number;
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

function titleLine(result: ScoredEvidence): string {
  let text = result.preview;
  try {
    text = readFileSync(result.file, "utf-8");
  } catch {
    // fall back to indexed preview
  }
  const heading = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  return heading.replace(/^#+\s*/, "").trim().slice(0, 120);
}

function formatTieredResults(results: ScoredEvidence[], label: string, fullTextN: number): string {
  const fullEntries: string[] = [];
  const headlineEntries: string[] = [];

  results.forEach((result, index) => {
    const rank = `${index + 1}. [${(result.score * 100).toFixed(1)}%] ${result.file}`;
    if (index < fullTextN) {
      let text: string;
      try {
        text = readFileSync(result.file, "utf-8").trim();
      } catch {
        text = `${result.preview.slice(0, 500)}...\n(Could not read file from disk, preview shown instead.)`;
      }
      fullEntries.push(`=== ${rank} ===\n${text}`);
    } else {
      headlineEntries.push(`${rank} | ${titleLine(result)}`);
    }
  });

  let output = `Top ${results.length} ${label} evidence files for this JD. ` +
    `Full text included for the top ${fullEntries.length}; do NOT re-read those files.\n\n` +
    fullEntries.join("\n\n");
  if (headlineEntries.length > 0) {
    output += `\n\nHeadline only (open a file only if its title is clearly JD-relevant):\n` +
      headlineEntries.join("\n");
  }
  return output;
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
    const experienceFullN = categoryAwareLimits.fullTextExperienceTopN ?? 6;
    const projectFullN = categoryAwareLimits.fullTextProjectTopN ?? 3;
    return `${formatTieredResults(experience, "experience", experienceFullN)}\n\n---\n\n` +
      formatTieredResults(projects, "project", projectFullN);
  }

  const filtered = evidenceCategory === "all"
    ? scored
    : scored.filter((entry) => entry.category === evidenceCategory);

  if (filtered.length === 0) {
    return `No ${evidenceCategory} evidence files found in the index. Run rebuild_evidence_index to rebuild it.`;
  }

  return formatResults(filtered.slice(0, topN), evidenceCategory);
}
