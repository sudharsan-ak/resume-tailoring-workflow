import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { processJd, saveJdSnapshot } from "./tools/processJd.js";
import { queryEvidence } from "./tools/queryEvidence.js";
import { rebuildEvidenceIndex } from "./tools/rebuildIndex.js";

const server = new McpServer({
  name: "resume-tailoring-mcp",
  version: "1.0.0",
});

server.tool(
  "process_jd",
  "Fetch a job description from a URL using a headless browser. Returns the raw page text for the AI to clean and structure. After receiving the raw text, clean it and call save_jd_snapshot with the structured result.",
  {
    input: z.string().describe(
      "One of: (1) a URL to a live job posting, (2) full JD text pasted directly, or (3) the string 'next' to process the next entry in JD Text.md"
    ),
    company: z.string().optional().describe("Company name — required when input is a URL or raw JD text"),
    role: z.string().optional().describe("Role title — required when input is a URL or raw JD text"),
    jdContent: z.string().optional().describe("Clean JD text to use instead of fetching the URL — use when you already have the text"),
  },
  async ({ input, company, role, jdContent }) => {
    const result = await processJd({ input, company, role, jdContent });
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "save_jd_snapshot",
  "Save a cleaned JD snapshot to workflow_state/fresh_job_jds/. Call this after process_jd returns raw text and you have cleaned it into structured sections.",
  {
    company: z.string().describe("Company name"),
    role: z.string().describe("Role title"),
    link: z.string().describe("Original job posting URL or 'N/A'"),
    source: z.string().describe("Source hostname, 'pasted', or 'JD Text.md'"),
    cleanedContent: z.string().describe("Cleaned JD: role summary, Skills (Required / Nice to have), Experience, Responsibilities, Location, Visa, Education"),
  },
  async ({ company, role, link, source, cleanedContent }) => {
    const result = await saveJdSnapshot({ company, role, link, source, cleanedContent });
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "query_evidence",
  "Query the local evidence index using semantic similarity to find the most relevant evidence files for a given JD. Returns top-N ranked file paths with similarity scores. Run rebuild_evidence_index first if the index does not exist.",
  {
    jdText: z.string().describe("The full job description text to match against the evidence bank"),
    topN: z.number().optional().describe("Number of top results to return (default: 6)"),
  },
  async ({ jdText, topN }) => {
    const result = await queryEvidence(jdText, topN ?? 6);
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "rebuild_evidence_index",
  "Rebuild the local evidence index by embedding all .md files in the configured evidencePath. Run this once after initial setup and again whenever evidence files are added or significantly updated.",
  {},
  async () => {
    const result = await rebuildEvidenceIndex();
    return { content: [{ type: "text", text: result }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Resume Tailoring MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
