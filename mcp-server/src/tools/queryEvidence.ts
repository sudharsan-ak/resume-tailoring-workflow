import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = resolve(__dirname, "../../evidence_index.json");

interface EvidenceEntry {
  file: string;
  text: string;
  vector: number[];
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

export async function queryEvidence(jdText: string, topN: number = 6): Promise<string> {
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

  const scored = entries.map((entry) => ({
    file: entry.file,
    preview: entry.text,
    score: cosineSimilarity(jdVector, entry.vector),
  }));

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topN);

  const lines = top.map((r, i) =>
    `${i + 1}. [${(r.score * 100).toFixed(1)}%] ${r.file}\n   Preview: ${r.preview.slice(0, 150).replace(/\n/g, " ")}…`
  );

  return `Top ${topN} evidence files for this JD:\n\n${lines.join("\n\n")}`;
}
