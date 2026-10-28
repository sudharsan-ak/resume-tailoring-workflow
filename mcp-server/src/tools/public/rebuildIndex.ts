import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs";
import { resolve, join, extname, basename } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { getConfig } from "../../config.js";
import { semanticIndexPaths, writeSemanticIndexMetadata } from "./semanticIndex.js";
import {
  getSemanticEngine,
  semanticEngineMode,
  type SemanticEngineMode,
} from "./semanticEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface EvidenceEntry {
  file: string;
  category: EvidenceCategory;
  text: string;
  vector: number[];
}

type EvidenceCategory = "experience" | "projects";

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

export async function rebuildEvidenceIndex(engineOverride?: SemanticEngineMode): Promise<string> {
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

  const mode = semanticEngineMode(engineOverride);
  const engine = await getSemanticEngine(mode);
  const paths = semanticIndexPaths(mode);
  const texts = files.map((file) => readFileSync(file, "utf-8"));
  const vectors = await engine.embed(texts);
  const entries: EvidenceEntry[] = files.map((file, index) => ({
    file,
    category: getEvidenceCategory(file),
    text: texts[index].slice(0, 500),
    vector: vectors[index],
  }));

  writeFileSync(paths.evidence, JSON.stringify(entries, null, 2), "utf-8");
  writeSemanticIndexMetadata(
    paths.evidenceMetadata,
    engine,
    vectors[0]?.length ?? 0,
    entries.length,
  );

  return `Evidence index rebuilt with ${mode}. ${entries.length} files indexed and saved to ${basename(paths.evidence)}.`;
}

// --- Tailoring patterns index ---
// Same embedding/cosine approach as evidence, applied to tailoring_patterns.md
// blocks instead of E##/P## files. Embeds each pattern's trigger (T:) line,
// since that's the JD-matching condition already written by hand.

const TAILORING_PATTERNS_PATH = resolve(__dirname, "../../../../../Shared Memory/Tailoring/tailoring_patterns.md");

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

export async function rebuildTailoringPatternsIndex(engineOverride?: SemanticEngineMode): Promise<string> {
  if (!existsSync(TAILORING_PATTERNS_PATH)) {
    return "tailoring_patterns.md not found; skipped pattern index rebuild.";
  }
  const mode = semanticEngineMode(engineOverride);
  const engine = await getSemanticEngine(mode);
  const paths = semanticIndexPaths(mode);
  const content = readFileSync(TAILORING_PATTERNS_PATH, "utf-8");
  const parsed = parsePatternBlocks(content);
  if (parsed.length === 0) {
    writeFileSync(paths.patterns, "[]", "utf-8");
    writeSemanticIndexMetadata(paths.patternsMetadata, engine, 0, 0);
    return "No P-### pattern blocks found; wrote empty pattern index.";
  }

  const vectors = await engine.embed(parsed.map((pattern) => pattern.trigger));
  const entries: PatternIndexEntry[] = parsed.map((pattern, index) => ({
    ...pattern,
    vector: vectors[index],
  }));

  writeFileSync(paths.patterns, JSON.stringify(entries), "utf-8");
  writeSemanticIndexMetadata(
    paths.patternsMetadata,
    engine,
    vectors[0]?.length ?? 0,
    entries.length,
  );
  return `Tailoring patterns index rebuilt with ${mode}. ${entries.length} patterns indexed.`;
}

export async function rebuildAllIndexes(engineOverride?: SemanticEngineMode): Promise<string> {
  const evidence = await rebuildEvidenceIndex(engineOverride);
  const patterns = await rebuildTailoringPatternsIndex(engineOverride);
  return `${evidence}\n${patterns}`;
}
