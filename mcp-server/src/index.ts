import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { processJd, saveJdSnapshot } from "./tools/public/processJd.js";
import { queryEvidence } from "./tools/public/queryEvidence.js";
import { rebuildEvidenceIndex } from "./tools/public/rebuildIndex.js";
import { writeFitCheckRows } from "./tools/public/fitCheckWriter.js";
import { buildTailoredResume } from "./tools/public/resumeBuilder.js";

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
    company: z.string().optional().describe("Company name - required when input is a URL or raw JD text"),
    role: z.string().optional().describe("Role title - required when input is a URL or raw JD text"),
    jdContent: z.string().optional().describe("Clean JD text to use instead of fetching the URL - use when you already have the text"),
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
  "Query the local evidence index using semantic similarity to find the most relevant evidence files for a given JD. Filter by experience or projects so one category cannot crowd out the other. Run rebuild_evidence_index first if the index does not exist. Optionally also surfaces tailoring_patterns.md and winning_patterns.json if you maintain them - see docs/patterns-setup.md.",
  {
    jdText: z.string().describe("The full job description text to match against the evidence bank"),
    topN: z.number().optional().describe("Number of top results to return (default: 6)"),
    evidenceCategory: z.enum(["all", "experience", "projects"]).optional().describe(
      "Evidence category to search: experience, projects, or all (default: all)"
    ),
    experienceTopN: z.number().optional().describe(
      "Return this many top experience files in one category-aware result"
    ),
    projectTopN: z.number().optional().describe(
      "Return this many top project files in one category-aware result"
    ),
    alreadyFullText: z.array(z.string()).optional().describe(
      "Filenames (short form, e.g. E01_example.md - as returned in results, not full paths) already returned full-text earlier in this chat (e.g. from a prior role in the same batch) - skip reprinting their body, return rank/score only"
    ),
    includeWinningPatterns: z.boolean().optional().describe(
      "First role of the chat only: also return a compact copy of Shared Memory/Winning Patterns/winning_patterns.json, if you maintain one (see docs/patterns-setup.md). No-op if the file does not exist. Do not pass true again later in the same chat - the content is already in context."
    ),
    includeTailoringPatterns: z.boolean().optional().describe(
      "Call every role: also return the top JD-relevant entries from Shared Memory/Tailoring/tailoring_patterns.md, if you maintain one (see docs/patterns-setup.md), ranked the same way as evidence. No-op if the file or its index does not exist. Pass alreadyPatterns to skip reprinting patterns already surfaced earlier in this chat."
    ),
    alreadyPatterns: z.array(z.string()).optional().describe(
      "Pattern IDs (e.g. P-001) already returned full-text earlier in this chat - skip reprinting, return rank/ID only"
    ),
  },
  async ({ jdText, topN, evidenceCategory, experienceTopN, projectTopN, alreadyFullText, includeWinningPatterns, includeTailoringPatterns, alreadyPatterns }) => {
    const categoryAwareLimits = experienceTopN !== undefined || projectTopN !== undefined
      ? { experienceTopN: experienceTopN ?? 6, projectTopN: projectTopN ?? 4 }
      : undefined;
    const result = await queryEvidence(
      jdText,
      topN ?? 6,
      evidenceCategory ?? "all",
      categoryAwareLimits,
      alreadyFullText,
      includeWinningPatterns,
      includeTailoringPatterns,
      alreadyPatterns
    );
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

server.tool(
  "write_fit_check_rows",
  "Append fit-check rows as a fixed-width ASCII table under today's date to workflow_state/pending/fit_check_pending.md; handles formatting, sorting, numbering. promote (no rows) copies rows from workflow_state/fresh_jobs_fit_check.md into the pending file instead. Never write these tables manually.",
  {
    rows: z.array(z.object({
      company: z.string(),
      role: z.string(),
      initial: z.string().describe("Score e.g. '6.5' or 'N/A'"),
      tailored: z.string().describe("Score e.g. '8.0' or 'N/A'"),
      verdict: z.string().describe("Apply, Borderline, or Skip"),
      notes: z.string().describe("2-3 line notes: top strength, biggest gap, any blocker flag"),
      link: z.string().describe("Canonical employer/ATS URL. Required for every row; pass N/A only when the source truly has no URL."),
      source: z.string().optional().describe("fresh_jobs target only"),
      posted: z.string().optional().describe("fresh_jobs target only"),
    })).optional().describe("All rows for this batch in one call; omit when using promote"),
    promote: z.array(z.object({
      company: z.string().describe("Company whose fresh-jobs rows to promote"),
      role: z.string().optional().describe("Role title or fragment; omit for all roles from that company's latest scan"),
    })).optional().describe("Selectors to copy rows from fresh_jobs_fit_check.md into fit_check_pending.md"),
    target: z.enum(["fit_check_pending", "fresh_jobs"]).optional().describe(
      "fit_check_pending (default) or fresh_jobs (workflow_state/fresh_jobs_fit_check.md)"
    ),
    batchLabel: z.string().optional().describe("Optional label for the search source, rendered as a subheading above the table"),
  },
  async ({ rows, promote, target, batchLabel }) => {
    const result = writeFitCheckRows({ rows, promote, target, batchLabel });
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "build_tailored_resume",
  "Compiles an assembled LaTeX resume with lualatex, measures rendered line count for marked bullets, and enforces a fail-closed page-count and line-limit gate before publishing. Mark any bullet you want line-count-checked with a %%LC:<id>%% token anywhere on its \\item line (the token itself is stripped) and list that id with its line limit in lineCountTargets. On success the .tex and .pdf are published atomically to output/tailored_tex/ and output/pdfs/ (any existing files at those paths are backed up first and restored on failure). On failure (compile error, page count > 1, or a tracked bullet over its line limit) nothing is published and the temp build dir is cleaned up. If evalJudgment is provided, on success the tool also appends an eval block (your judgment plus its own tool-verified mechanical checks: length, weak-opening-verb, and metric-coverage) to workflow_state/pending/eval_pending.md - the eval pass and the build are the same call, not a separate step.",
  {
    fileBaseName: z.string().describe("Output filename without extension, e.g. 'Jane Doe Resume - Example Co - Senior Engineer'"),
    texBody: z.string().describe("The complete assembled LaTeX document (documentclass through \\end{document}). Mark trackable bullets with %%LC:<id>%% on the \\item line."),
    lineCountTargets: z.array(z.object({
      id: z.string().describe("Matches a %%LC:<id>%% marker in texBody"),
      limit: z.number().describe("Max rendered lines allowed for this bullet, e.g. 2 for experience bullets, 1 for project bullets"),
      countForMetrics: z.boolean().optional().describe("Include this bullet in the eval mechanical checks' metric-coverage stat (default true). Set false for project bullets if you want that stat scoped to experience bullets only."),
    })).optional().describe("Bullets to mechanically check. Omit or leave empty to skip line-count enforcement (page-count and compile checks still run)."),
    evalJudgment: z.string().optional().describe("Your judgment-based eval findings for this build: JD Match, Resume/Project Value, Summary Quality, Skill Defensibility. Free-form text. When provided, written to eval_pending.md alongside the tool's own mechanical checks on a successful build."),
  },
  async ({ fileBaseName, texBody, lineCountTargets, evalJudgment }) => {
    const result = await buildTailoredResume({ fileBaseName, texBody, lineCountTargets, evalJudgment });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
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
