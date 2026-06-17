import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { processJd, saveJdSnapshot } from "./tools/processJd.js";
import { queryEvidence } from "./tools/queryEvidence.js";
import { rebuildEvidenceIndex } from "./tools/rebuildIndex.js";
import { scanRejections, getRejectionPatterns, getLoggedRejectionKeys, writeRejections, RejectionRow } from "./tools/scanRejections.js";

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
  "Query the local evidence index using semantic similarity to find the most relevant evidence files for a given JD. Filter by experience or projects so one category cannot crowd out the other. Run rebuild_evidence_index first if the index does not exist.",
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
  },
  async ({ jdText, topN, evidenceCategory, experienceTopN, projectTopN }) => {
    const categoryAwareLimits = experienceTopN !== undefined || projectTopN !== undefined
      ? { experienceTopN: experienceTopN ?? 6, projectTopN: projectTopN ?? 4 }
      : undefined;
    const result = await queryEvidence(
      jdText,
      topN ?? 6,
      evidenceCategory ?? "all",
      categoryAwareLimits
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
  "scan_rejections",
  "Scan Gmail for job rejection emails from the last N days using the '01 - Job Applications > 03 - Job Rejections' label. Returns raw rows (company + rejection date) and already-logged keys from the Rejections Log sheet. Claude then searches Gmail to resolve role, applied date, and stage for each row, filters out duplicates, and presents the final table for approval before writing to the sheet.",
  {
    days_back: z.number().optional().describe("How many days back to scan (default: 30)"),
  },
  async ({ days_back }) => {
    const [{ rows, summary }, loggedKeys] = await Promise.all([
      scanRejections(days_back ?? 30),
      getLoggedRejectionKeys(),
    ]);

    if (rows.length === 0) {
      return { content: [{ type: "text", text: "No rejection emails found in the specified window." }] };
    }

    // Return raw rows + already-logged company|role keys.
    // Claude searches Gmail to resolve role for each row, then filters out already-logged entries
    // using company|role key (normalized lowercase). Same company + different role = new entry.
    const output = [
      `scan_rejections found ${rows.length} rejections in the last ${days_back ?? 30} days.`,
      "",
      summary,
      "",
      "RAW_ROWS:" + JSON.stringify(rows),
      "LOGGED_KEYS:" + JSON.stringify([...loggedKeys]),
    ].join("\n");

    return { content: [{ type: "text", text: output }] };
  }
);

server.tool(
  "write_rejections",
  "Write resolved rejection rows to the Rejections Log sheet. Call this only after the user approves the final table. Rows must be fully resolved (company, role, dateApplied, dateRejected, daysGap, stage).",
  {
    rows: z.string().describe("JSON array of RejectionRow objects to write to the sheet"),
  },
  async ({ rows }) => {
    let parsed: RejectionRow[];
    try {
      parsed = JSON.parse(rows);
    } catch {
      return { content: [{ type: "text", text: "Invalid JSON in rows parameter." }] };
    }
    const result = await writeRejections(parsed);
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "get_rejection_patterns",
  "Read the Rejections Log sheet and return a pattern summary: total rejections, ATS vs Human split, top rejected companies and roles, average days to rejection, and an ATS warning if ≥60% of rejections are within 3 days. Call this at the start of tailoring sessions to inform keyword and formatting strategy.",
  {},
  async () => {
    const result = await getRejectionPatterns();
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
