import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SemanticEngine } from "./semanticEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MCP_SERVER_ROOT = resolve(__dirname, "../../..");

export interface SemanticIndexPaths {
  evidence: string;
  evidenceMetadata: string;
  patterns: string;
  patternsMetadata: string;
}

export function semanticIndexPaths(engine: SemanticEngine["name"]): SemanticIndexPaths {
  const suffix = engine === "python" ? ".python" : "";
  return {
    evidence: resolve(MCP_SERVER_ROOT, `evidence_index${suffix}.json`),
    evidenceMetadata: resolve(MCP_SERVER_ROOT, `evidence_index${suffix}.meta.json`),
    patterns: resolve(MCP_SERVER_ROOT, `tailoring_patterns_index${suffix}.json`),
    patternsMetadata: resolve(MCP_SERVER_ROOT, `tailoring_patterns_index${suffix}.meta.json`),
  };
}

export function writeSemanticIndexMetadata(
  path: string,
  engine: SemanticEngine,
  dimensions: number,
  entries: number,
): void {
  writeFileSync(path, JSON.stringify({
    schema_version: 1,
    engine: engine.name,
    model: engine.model,
    dimensions,
    entries,
    built_at: new Date().toISOString(),
  }, null, 2), "utf-8");
}
