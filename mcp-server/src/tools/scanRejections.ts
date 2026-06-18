import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../.env") });

const TOKEN_PATH = resolve(__dirname, "../../gmail-token.json");
const CREDS_PATH = resolve(__dirname, "../../credentials.json");

const SHEET_ID = process.env.REJECTIONS_SHEET_ID!;
const REJECTIONS_GID = process.env.REJECTIONS_GID!;
const REJECTIONS_RANGE = "Rejections Log!A:I";

const REJECTION_LABEL = "label:01---job-applications-03---job-rejections";


function getOAuthClient() {
  const creds = JSON.parse(readFileSync(CREDS_PATH, "utf-8"));
  const { client_id, client_secret } = creds.installed ?? creds.web ?? creds;
  const token = JSON.parse(readFileSync(TOKEN_PATH, "utf-8"));
  const auth = new google.auth.OAuth2(client_id, client_secret);
  auth.setCredentials({
    refresh_token: token.refresh_token,
    access_token: token.access_token,
  });
  return auth;
}

// Extract company name from rejection email subject.
// Role extraction is intentionally NOT done here — Claude reads the actual emails.
function extractCompany(subject: string): string {
  const s = subject.trim();
  let m: RegExpMatchArray | null;

  // "Follow up on your interest in <Role> at <Company>"
  m = s.match(/follow.?up on your interest in\s+.+?\s+at\s+(.+)/i);
  if (m) return m[1].trim();

  // "Thank you for your interest in <Role> at <Company>"
  m = s.match(/thank you for your interest in\s+.+?\s+at\s+(.+)/i);
  if (m) return m[1].trim();

  // "Thank you for your interest in <Company>" (no "at" — whole thing is company)
  m = s.match(/thank you for your interest in\s+(.+)/i);
  if (m) return m[1].trim();

  // "Thank you for applying to/for <Role> at <Company>"
  m = s.match(/thank you for applying (?:to|for)\s+.+?\s+at\s+(.+)/i);
  if (m) return m[1].trim();

  // "Thank you for applying to/for <Company>" (no "at")
  m = s.match(/thank you for applying (?:to|for)\s+(.+)/i);
  if (m) return m[1].trim();

  // "Important information about your application to <Role> - <Company>"
  if (/^important information/i.test(s)) {
    m = s.match(/important information about your application to\s+(.+)/i);
    if (m) {
      const rest = m[1].trim();
      const lastDash = rest.lastIndexOf(" - ");
      if (lastDash !== -1) return rest.slice(lastDash + 3).trim();
      return rest;
    }
  }

  // "Your application to/for <Role> at <Company>"
  m = s.match(/your application (?:to|for|with)\s+.+?\s+at\s+(.+)/i);
  if (m) return m[1].trim();

  // "Your application to/for <Company>" (stops before "has been / was / is")
  m = s.match(/your application (?:to|for|with)\s+(.+?)(?:\s+has been|\s+was|\s+is\b|$)/i);
  if (m) return m[1].trim();

  // "<Company> - Application Update"
  m = s.match(/^(.+?)\s*[-–]\s*application update/i);
  if (m) return m[1].trim();

  // "<Company> Application Update / Status"
  m = s.match(/^(.+?)\s+application (?:update|status)\b/i);
  if (m) return m[1].trim();

  // "<Company> Follow Up / Follow-Up"
  m = s.match(/^(.+?)\s+follow[\s-]?up\b/i);
  if (m) return m[1].trim();

  // "Application Update for <Role> at <Company>"
  m = s.match(/^application (?:update|status)(?:\s+for)?\s+.+?\s+at\s+(.+)/i);
  if (m) return m[1].trim();

  // "<Company> | <Role>"
  m = s.match(/^(.+?)\s*\|\s*.+/);
  if (m) return m[1].trim();

  // "<Company> - <Role>" (last resort generic dash)
  m = s.match(/^(.+?)\s*[-–]\s*.+/);
  if (m) return m[1].trim();

  return s.slice(0, 50);
}

function cleanCompany(raw: string): string {
  return raw
    .replace(/\s*(application status|application update|follow[\s-]?up|careers?)\s*$/i, "")
    .replace(/[.,!?]$/, "")
    .trim();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}


function cutoffDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export interface RejectionRow {
  company: string;
  role: string;
  dateApplied: string;
  dateRejected: string;
  daysGap: number | null;
  stage: string;
  resumeVersion: string;
  notes: string;
}

export async function scanRejections(daysBack: number = 30): Promise<{
  rows: RejectionRow[];
  summary: string;
}> {
  const auth = getOAuthClient();
  const gmail = google.gmail({ version: "v1", auth });

  const since = cutoffDate(daysBack);

  // Fetch rejection emails
  const rejRes = await gmail.users.messages.list({
    userId: "me",
    q: `${REJECTION_LABEL} after:${since}`,
    maxResults: 100,
  });
  const rejMessages = rejRes.data.messages ?? [];

  // Process each rejection — company + rejection date only
  // Role, applied date, days gap, and stage are all resolved by Claude via Gmail MCP tools
  const rows: RejectionRow[] = [];

  for (const msg of rejMessages) {
    if (!msg.id) continue;
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "metadata",
      metadataHeaders: ["Subject", "Date"],
    });
    const headers = detail.data.payload?.headers ?? [];
    const subject = headers.find(h => h.name === "Subject")?.value ?? "";
    const dateRaw = headers.find(h => h.name === "Date")?.value ?? "";

    const company = cleanCompany(extractCompany(subject));

    rows.push({
      company,
      role: "",
      dateApplied: "",
      dateRejected: formatDate(new Date(dateRaw).toISOString()),
      daysGap: null,
      stage: "",
      resumeVersion: "",
      notes: "",
    });
  }

  // Sort by rejection date descending
  rows.sort((a, b) => new Date(b.dateRejected).getTime() - new Date(a.dateRejected).getTime());

  const total = rows.length;
  const summary = `Found ${total} rejections in the last ${daysBack} days.`;

  return { rows, summary };
}

// Returns a Set of "company|role" keys already logged in the sheet (normalized lowercase)
export async function getLoggedRejectionKeys(): Promise<Set<string>> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${REJECTIONS_GID}`;
  const res = await fetch(url);
  if (!res.ok) return new Set();
  const csv = await res.text();
  const lines = csv.trim().split("\n").slice(1);
  const keys = new Set<string>();
  for (const line of lines) {
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur);
    const company = (cols[0] ?? "").trim().toLowerCase();
    const role = (cols[1] ?? "").trim().toLowerCase();
    if (company) keys.add(`${company}|${role}`);
  }
  return keys;
}

export async function getRejectionPatterns(): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${REJECTIONS_GID}`;
  const res = await fetch(url);
  if (!res.ok) return "Could not read Rejections Log sheet.";

  const csv = await res.text();
  const lines = csv.trim().split("\n").slice(1);

  if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === "")) {
    return "Rejections Log is empty — run scan_rejections first.";
  }

  const rows = lines.map(line => {
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur);
    return {
      company: cols[0] ?? "",
      role: cols[1] ?? "",
      dateApplied: cols[2] ?? "",
      dateRejected: cols[3] ?? "",
      daysGap: parseInt(cols[4] ?? "") || null,
      stage: cols[5] ?? "",
      resumeVersion: cols[6] ?? "",
      notes: cols[7] ?? "",
    };
  });

  const total = rows.length;

  const stageCount = new Map<string, number>();
  rows.forEach(r => stageCount.set(r.stage, (stageCount.get(r.stage) ?? 0) + 1));
  const stageBreakdown = [...stageCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([s, n]) => `${s}: ${n} (${Math.round((n / total) * 100)}%)`)
    .join(", ");

  const companyCount = new Map<string, number>();
  rows.forEach(r => companyCount.set(r.company, (companyCount.get(r.company) ?? 0) + 1));
  const topCompanies = [...companyCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c, n]) => `${c} (${n})`)
    .join(", ");

  const roleCount = new Map<string, number>();
  rows.forEach(r => roleCount.set(r.role, (roleCount.get(r.role) ?? 0) + 1));
  const topRoles = [...roleCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([r, n]) => `${r} (${n})`)
    .join(", ");

  const avgGap = rows.filter(r => r.daysGap !== null).reduce((s, r) => s + (r.daysGap ?? 0), 0) /
    (rows.filter(r => r.daysGap !== null).length || 1);

  return [
    `=== Rejection Patterns (${total} total) ===`,
    `Stage breakdown: ${stageBreakdown || "N/A"}`,
    `Avg days to rejection: ${avgGap.toFixed(1)}`,
    `Top rejected companies: ${topCompanies || "N/A"}`,
    `Top rejected roles: ${topRoles || "N/A"}`,
  ].join("\n");
}

export async function writeRejections(rows: RejectionRow[]): Promise<string> {
  if (rows.length === 0) return "No rows to write.";
  const auth = getOAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const values = rows.map(r => [
    r.company,
    r.role,
    r.dateApplied,
    r.dateRejected,
    r.daysGap !== null ? String(r.daysGap) : "",
    r.stage,
    r.resumeVersion,
    r.notes,
  ]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: REJECTIONS_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return `Written ${rows.length} row${rows.length === 1 ? "" : "s"} to Rejections Log.`;
}
