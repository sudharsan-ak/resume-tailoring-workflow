import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = resolve(__dirname, "../../../evidence_index.json");
const WINNING_PATTERNS_PATH = resolve(__dirname, "../../../../../Shared Memory/winning_patterns.json");
const PATTERNS_INDEX_PATH = resolve(__dirname, "../../../tailoring_patterns_index.json");

interface PatternIndexEntry {
  id: string;
  type: string;
  title: string;
  block: string;
  trigger: string;
  vector: number[];
}

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

function shortLabel(file: string): string {
  return file.split(/[\\/]/).pop() ?? file;
}

function formatResults(results: ScoredEvidence[], label: string): string {
  const lines = results.map((result, index) =>
    `${index + 1}. [${(result.score * 100).toFixed(1)}%] ${shortLabel(result.file)}\n` +
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

function formatTieredResults(
  results: ScoredEvidence[],
  label: string,
  fullTextN: number,
  alreadyFullText?: Set<string>
): string {
  const fullEntries: string[] = [];
  const headlineEntries: string[] = [];
  const seenEntries: string[] = [];

  results.forEach((result, index) => {
    const label = shortLabel(result.file);
    const rank = `${index + 1}. [${(result.score * 100).toFixed(1)}%] ${label}`;
    if (alreadyFullText?.has(label) || alreadyFullText?.has(result.file)) {
      seenEntries.push(rank);
    } else if (index < fullTextN) {
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
  if (seenEntries.length > 0) {
    output += `\n\nAlready full-text in this chat (rank/score only, do not re-fetch):\n` +
      seenEntries.join("\n");
  }
  if (headlineEntries.length > 0) {
    output += `\n\nHeadline only (open a file only if its title is clearly JD-relevant):\n` +
      headlineEntries.join("\n");
  }
  return output;
}

// Compact (no pretty-print whitespace) - same content, lower token cost.
// Disk file stays pretty-printed for editing; this only affects what's
// returned into chat context.
function loadWinningPatternsCompact(): string {
  if (!existsSync(WINNING_PATTERNS_PATH)) {
    return "winning_patterns.json not found.";
  }
  try {
    const data = JSON.parse(readFileSync(WINNING_PATTERNS_PATH, "utf-8"));
    return JSON.stringify(data);
  } catch {
    return "Failed to parse winning_patterns.json.";
  }
}

// Flat-ranked (not category-split like experience/project - patterns don't
// have a "guarantee some of each type" requirement the way evidence does).
// Full text for the top N, headline (ID + title) below that, bare rank/ID for
// anything already surfaced this chat (alreadyPatterns) regardless of tier.
async function formatTailoringPatterns(
  jdText: string,
  embedder: any,
  topN: number,
  fullTextN: number,
  alreadyPatterns?: Set<string>
): Promise<string> {
  if (!existsSync(PATTERNS_INDEX_PATH)) {
    return "tailoring_patterns_index.json not found. Run rebuild_evidence_index (or curate_write, which rebuilds it automatically) first.";
  }
  let entries: PatternIndexEntry[];
  try {
    entries = JSON.parse(readFileSync(PATTERNS_INDEX_PATH, "utf-8"));
  } catch {
    return "Failed to parse tailoring_patterns_index.json.";
  }
  if (entries.length === 0) {
    return "Tailoring patterns index is empty.";
  }

  const jdVector = await embed(embedder, jdText);
  const scored = entries
    .map((e) => ({ ...e, score: cosineSimilarity(jdVector, e.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  const fullEntries: string[] = [];
  const headlineEntries: string[] = [];
  const seenEntries: string[] = [];

  scored.forEach((entry, index) => {
    const rank = `${index + 1}. [${(entry.score * 100).toFixed(1)}%] ${entry.id}`;
    if (alreadyPatterns?.has(entry.id)) {
      seenEntries.push(rank);
    } else if (index < fullTextN) {
      fullEntries.push(`=== ${rank} ===\n${entry.block}`);
    } else {
      headlineEntries.push(`${rank} | ${entry.title}`);
    }
  });

  let output = `Top ${scored.length} tailoring patterns for this JD. ` +
    `Full text included for the top ${fullEntries.length}; do NOT re-read tailoring_patterns.md for those.\n\n` +
    fullEntries.join("\n\n");
  if (seenEntries.length > 0) {
    output += `\n\nAlready surfaced this chat (rank/ID only, do not re-fetch):\n` + seenEntries.join("\n");
  }
  if (headlineEntries.length > 0) {
    output += `\n\nHeadline only (id + title; ask if you need the full trigger/grounding for one of these):\n` +
      headlineEntries.join("\n");
  }
  return output;
}

export async function queryEvidence(
  jdText: string,
  topN: number = 6,
  evidenceCategory: EvidenceCategory = "all",
  categoryAwareLimits?: CategoryAwareLimits,
  alreadyFullText?: string[],
  includeWinningPatterns?: boolean,
  includeTailoringPatterns?: boolean,
  alreadyPatterns?: string[]
): Promise<string> {
  const winningPatternsBlock = includeWinningPatterns
    ? `=== Winning Patterns (read once this chat - reuse for all later roles, do not re-fetch) ===\n${loadWinningPatternsCompact()}\n\n---\n\n`
    : "";
  const seenSet = alreadyFullText && alreadyFullText.length > 0 ? new Set(alreadyFullText) : undefined;
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

  const patternsSeenSet = alreadyPatterns && alreadyPatterns.length > 0 ? new Set(alreadyPatterns) : undefined;
  const tailoringPatternsBlock = includeTailoringPatterns
    ? `${await formatTailoringPatterns(jdText, embedder, 8, 4, patternsSeenSet)}\n\n---\n\n`
    : "";

  if (categoryAwareLimits) {
    const experience = scored
      .filter((entry) => entry.category === "experience")
      .slice(0, categoryAwareLimits.experienceTopN);
    const projects = scored
      .filter((entry) => entry.category === "projects")
      .slice(0, categoryAwareLimits.projectTopN);
    const experienceFullN = categoryAwareLimits.fullTextExperienceTopN ?? 6;
    const projectFullN = categoryAwareLimits.fullTextProjectTopN ?? 3;
    return winningPatternsBlock + tailoringPatternsBlock +
      `${formatTieredResults(experience, "experience", experienceFullN, seenSet)}\n\n---\n\n` +
      formatTieredResults(projects, "project", projectFullN, seenSet);
  }

  const filtered = evidenceCategory === "all"
    ? scored
    : scored.filter((entry) => entry.category === evidenceCategory);

  if (filtered.length === 0) {
    return `No ${evidenceCategory} evidence files found in the index. Run rebuild_evidence_index to rebuild it.`;
  }

  return winningPatternsBlock + tailoringPatternsBlock + formatResults(filtered.slice(0, topN), evidenceCategory);
}
