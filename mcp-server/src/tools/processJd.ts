import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { workflowPath } from "../config.js";

interface ProcessJdInput {
  input: string;
  company?: string;
  role?: string;
  jdContent?: string;
}

interface SaveSnapshotInput {
  company: string;
  role: string;
  link: string;
  source: string;
  cleanedContent: string;
}

function todaySlug(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

function toFileSlug(company: string, role: string): string {
  return `${company}_${role}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function fetchUrl(url: string): Promise<string> {
  const { chromium } = await import("playwright-extra");
  const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;
  chromium.use(StealthPlugin());

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "en-US",
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const text = await page.evaluate(() => document.body.innerText);
    return text.trim();
  } finally {
    await browser.close();
  }
}

function readJdTextMd(): string {
  const p = workflowPath("JD Text.md");
  if (!existsSync(p)) throw new Error("JD Text.md not found in workflowRoot.");
  return readFileSync(p, "utf-8");
}

// Step 1: fetch raw JD text and return it for Claude to clean up
export async function processJd({ input, company, role, jdContent: providedContent }: ProcessJdInput): Promise<string> {
  let rawText = "";
  let link = "N/A";
  let source = "manual";

  const isUrl = /^https?:\/\//i.test(input.trim());

  if (input.trim().toLowerCase() === "next") {
    const raw = readJdTextMd();
    if (!raw.trim() || raw.trim() === "<!-- Add job descriptions below -->") {
      return "JD Text.md is empty. Paste a job description or URL into it first.";
    }
    rawText = raw;
    source = "JD Text.md";
    link = "See JD Text.md";
  } else if (isUrl) {
    link = input.trim();
    source = new URL(link).hostname;
    if (providedContent) {
      rawText = providedContent;
    } else {
      try {
        rawText = await fetchUrl(link);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return `Failed to fetch URL: ${msg}`;
      }
    }
  } else {
    rawText = input;
    source = "pasted";
  }

  return [
    `RAW_JD_FETCHED`,
    `Company: ${company ?? "extract from JD text below"}`,
    `Role: ${role ?? "extract from JD text below"}`,
    `Source: ${source}`,
    `Link: ${link}`,
    `---RAW_TEXT_START---`,
    rawText,
    `---RAW_TEXT_END---`,
    ``,
    `Now clean this text: extract role summary, Skills (Required / Nice to have), Experience, Responsibilities, Location, Visa, Education. Remove all company background, values, benefits, compensation, boilerplate, nav, and footer. Then call save_jd_snapshot with the cleaned content.`,
  ].join("\n");
}

// Step 2: save the cleaned snapshot Claude writes
export async function saveJdSnapshot({ company, role, link, source, cleanedContent }: SaveSnapshotInput): Promise<string> {
  const capturedDate = todaySlug();
  const slug = toFileSlug(company, role);
  const snapshotDir = workflowPath("workflow_state", "fresh_job_jds", capturedDate);
  mkdirSync(snapshotDir, { recursive: true });

  const snapshot = `# ${company} - ${role}

- Source: ${source}
- Link: ${link}
- Posted: Not mentioned
- Captured: ${capturedDate}
- Initial: TBD
- Tailored: TBD
- Verdict: TBD

${cleanedContent}
`;

  const snapshotPath = join(snapshotDir, `${slug}.md`);
  writeFileSync(snapshotPath, snapshot, "utf-8");

  return `Snapshot saved: workflow_state/fresh_job_jds/${capturedDate}/${slug}.md`;
}