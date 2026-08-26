import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { workflowPath } from "../../config.js";

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
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => document.body.innerText);
    return text.trim();
  } finally {
    await browser.close();
  }
}

function slugifyForSnapshot(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "_").slice(0, 60);
}

// Raw fetched text is written to a local temp file and never returned inline,
// so it never enters chat context - only the file path does.
function writeJdSnapshot(url: string, rawText: string): string {
  const snapshotDir = workflowPath("workflow_state", "pending", "jd_snapshots");
  mkdirSync(snapshotDir, { recursive: true });
  const snapshotPath = join(snapshotDir, `${slugifyForSnapshot(url)}_${Date.now()}.txt`);
  writeFileSync(snapshotPath, `=== ${url} ===\n\n${rawText}`, "utf-8");
  return snapshotPath;
}

function readJdTextMd(): string {
  const p = workflowPath("JD Text.md");
  if (!existsSync(p)) throw new Error("JD Text.md not found in workflowRoot.");
  return readFileSync(p, "utf-8");
}

// Step 1: fetch the JD. Pasted/JD-text-file input returns text directly (already
// in the caller's context, nothing new to hide). URL input is fetched headless and
// written straight to a snapshot file - raw page text never enters chat context,
// only the file path does. Caller reads the file once, cleans it, then deletes it.
export async function processJd({ input, company, role, jdContent: providedContent }: ProcessJdInput): Promise<string> {
  const isUrl = /^https?:\/\//i.test(input.trim());

  if (input.trim().toLowerCase() === "next") {
    const raw = readJdTextMd();
    if (!raw.trim() || raw.trim() === "<!-- Add job descriptions below -->") {
      return "JD Text.md is empty. Paste a job description or URL into it first.";
    }
    return [
      `RAW_JD_FETCHED`,
      `Company: ${company ?? "extract from JD text below"}`,
      `Role: ${role ?? "extract from JD text below"}`,
      `Source: JD Text.md`,
      `Link: See JD Text.md`,
      `---RAW_TEXT_START---`,
      raw,
      `---RAW_TEXT_END---`,
      ``,
      `Now clean this text: extract role summary, Skills (Required / Nice to have), Experience, Responsibilities, Location, Visa, Education. Remove all company background, values, benefits, compensation, boilerplate, nav, and footer. Then call save_jd_snapshot with the cleaned content.`,
    ].join("\n");
  }

  if (isUrl) {
    const link = input.trim();
    const source = new URL(link).hostname;
    if (providedContent) {
      return [
        `RAW_JD_FETCHED`,
        `Company: ${company ?? "extract from JD text below"}`,
        `Role: ${role ?? "extract from JD text below"}`,
        `Source: ${source}`,
        `Link: ${link}`,
        `---RAW_TEXT_START---`,
        providedContent,
        `---RAW_TEXT_END---`,
        ``,
        `Now clean this text: extract role summary, Skills (Required / Nice to have), Experience, Responsibilities, Location, Visa, Education. Remove all company background, values, benefits, compensation, boilerplate, nav, and footer. Then call save_jd_snapshot with the cleaned content.`,
      ].join("\n");
    }
    try {
      const rawText = await fetchUrl(link);
      const jdSnapshotPath = writeJdSnapshot(link, rawText);
      return [
        `JD_SNAPSHOT_WRITTEN`,
        `Company: ${company ?? "extract from JD text after reading the snapshot"}`,
        `Role: ${role ?? "extract from JD text after reading the snapshot"}`,
        `Source: ${source}`,
        `Link: ${link}`,
        `jdSnapshotPath: ${jdSnapshotPath}`,
        ``,
        `Read the snapshot file once. Clean it: extract role summary, Skills (Required / Nice to have), Experience, Responsibilities, Location, Visa, Education. Remove all company background, values, benefits, compensation, boilerplate, nav, and footer. Call save_jd_snapshot with the cleaned content, then delete the snapshot file.`,
      ].join("\n");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Failed to fetch URL: ${msg}`;
    }
  }

  return [
    `RAW_JD_FETCHED`,
    `Company: ${company ?? "extract from JD text below"}`,
    `Role: ${role ?? "extract from JD text below"}`,
    `Source: pasted`,
    `Link: N/A`,
    `---RAW_TEXT_START---`,
    input,
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