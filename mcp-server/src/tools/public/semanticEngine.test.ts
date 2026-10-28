import assert from "node:assert/strict";
import test from "node:test";
import { semanticEngineMode } from "./semanticEngine.js";
import { semanticIndexPaths } from "./semanticIndex.js";

test("TypeScript remains the default semantic engine", () => {
  const previous = process.env.EVIDENCE_ENGINE;
  delete process.env.EVIDENCE_ENGINE;
  try {
    assert.equal(semanticEngineMode(), "typescript");
  } finally {
    if (previous === undefined) delete process.env.EVIDENCE_ENGINE;
    else process.env.EVIDENCE_ENGINE = previous;
  }
});

test("engine-specific indexes cannot overwrite each other", () => {
  const typescript = semanticIndexPaths("typescript");
  const python = semanticIndexPaths("python");

  assert.match(typescript.evidence, /evidence_index\.json$/);
  assert.match(python.evidence, /evidence_index\.python\.json$/);
  assert.notEqual(typescript.evidence, python.evidence);
  assert.notEqual(typescript.patterns, python.patterns);
});
