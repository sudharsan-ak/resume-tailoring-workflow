process.env.EVIDENCE_PYTHON_PORT ??= "8876";

const { getSemanticEngine } = await import("../dist/tools/public/semanticEngine.js");

const engine = await getSemanticEngine("python");
const [queryVector] = await engine.embed([
  "React TypeScript frontend architecture and product engineering",
]);

if (queryVector.length !== 384) {
  throw new Error(`Expected 384 embedding dimensions, received ${queryVector.length}.`);
}

const ranked = await engine.rankTexts(queryVector, [
  { id: "frontend", text: "Built React and TypeScript product interfaces." },
  { id: "warehouse", text: "Managed warehouse inventory and shipping schedules." },
]);

if (ranked[0]?.id !== "frontend") {
  throw new Error(`Unexpected semantic ranking: ${JSON.stringify(ranked)}`);
}

console.log("Python semantic service verified: health, 384-d embeddings, and ranking passed.");
