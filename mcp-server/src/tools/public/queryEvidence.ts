import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { semanticIndexPaths } from "./semanticIndex.js";
import {
  getSemanticEngine,
  semanticEngineMode,
  type SemanticEngine,
  type SemanticEngineMode,
} from "./semanticEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WINNING_PATTERNS_PATH = resolve(__dirname, "../../../../../Shared Memory/Winning Patterns/winning_patterns.json");

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
  patternsIndexPath: string,
  jdVector: number[],
  engine: SemanticEngine,
  topN: number,
  fullTextN: number,
  alreadyPatterns?: Set<string>
): Promise<string> {
  if (!existsSync(patternsIndexPath)) {
    return `${patternsIndexPath.split(/[\\/]/).pop()} not found. Run rebuild_evidence_index with engine "${engine.name}" first.`;
  }
  let entries: PatternIndexEntry[];
  try {
    entries = JSON.parse(readFileSync(patternsIndexPath, "utf-8"));
  } catch {
    return `Failed to parse ${patternsIndexPath.split(/[\\/]/).pop()}.`;
  }
  if (entries.length === 0) {
    return "Tailoring patterns index is empty.";
  }

  const ranked = await engine.rankVectors(
    jdVector,
    entries.map((entry, index) => ({ id: String(index), vector: entry.vector })),
  );
  const scored = ranked.slice(0, topN).map((result) => ({
    ...entries[Number(result.id)],
    score: result.score,
  }));

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
  alreadyPatterns?: string[],
  engineOverride?: SemanticEngineMode,
): Promise<string> {
  const mode = semanticEngineMode(engineOverride);
  const engine = await getSemanticEngine(mode);
  const paths = semanticIndexPaths(mode);
  const winningPatternsBlock = includeWinningPatterns
    ? `=== Winning Patterns (read once this chat - reuse for all later roles, do not re-fetch) ===\n${loadWinningPatternsCompact()}\n\n---\n\n`
    : "";
  const seenSet = alreadyFullText && alreadyFullText.length > 0 ? new Set(alreadyFullText) : undefined;
  if (!existsSync(paths.evidence)) {
    return `${paths.evidence.split(/[\\/]/).pop()} not found. Run rebuild_evidence_index with engine "${mode}" first.`;
  }

  let entries: EvidenceEntry[];
  try {
    entries = JSON.parse(readFileSync(paths.evidence, "utf-8"));
  } catch {
    return `Failed to parse ${paths.evidence.split(/[\\/]/).pop()}. Run rebuild_evidence_index with engine "${mode}".`;
  }

  if (entries.length === 0) {
    return "Evidence index is empty. Run rebuild_evidence_index to rebuild it.";
  }

  const [jdVector] = await engine.embed([jdText]);
  const ranked = await engine.rankVectors(
    jdVector,
    entries.map((entry, index) => ({ id: String(index), vector: entry.vector })),
  );
  const scored: ScoredEvidence[] = ranked.map((result) => {
    const entry = entries[Number(result.id)];
    return {
      file: entry.file,
      category: inferCategory(entry),
      preview: entry.text,
      score: result.score,
    };
  });

  const patternsSeenSet = alreadyPatterns && alreadyPatterns.length > 0 ? new Set(alreadyPatterns) : undefined;
  const tailoringPatternsBlock = includeTailoringPatterns
    ? `${await formatTailoringPatterns(paths.patterns, jdVector, engine, 8, 4, patternsSeenSet)}\n\n---\n\n`
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
