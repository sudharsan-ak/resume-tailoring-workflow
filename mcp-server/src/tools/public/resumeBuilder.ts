import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { workflowPath } from "../../config.js";

export interface LineCountTarget {
  id: string;
  limit: number;
  /** Count this bullet toward metric coverage in the eval mechanical checks (default true). Set false for project bullets if you want the metric-coverage stat scoped to experience bullets only. */
  countForMetrics?: boolean;
}

export interface BuildTailoredResumeInput {
  fileBaseName: string;
  texBody: string;
  lineCountTargets?: LineCountTarget[];
  /** AI-authored judgment section (JD Match, Resume Value, Summary Quality, Skill Defensibility). When provided, written to workflow_state/pending/eval_pending.md alongside the tool-computed mechanical checks, in the same call that publishes the PDF. */
  evalJudgment?: string;
}

export interface ValidationIssue {
  bulletId?: string;
  rule: string;
}

export interface BuildTailoredResumeResult {
  ok: boolean;
  pageCount?: number;
  issues?: ValidationIssue[];
  texPath?: string;
  pdfPath?: string;
  message?: string;
  mechanicalChecks?: string;
  evalWrittenTo?: string;
}

const LUA_PREAMBLE = `\\directlua{
  local lc_file = io.open("linecount.txt", "w")
  function write_line_count(id, count)
    lc_file:write(id .. "=" .. count .. string.char(10))
    lc_file:flush()
  end
}`;

// Wraps a marked bullet so its rendered line count is measured via \prevgraf
// and written to the sidecar. Caller marks a bullet by putting %%LC:<id>%%
// anywhere on its \item line; this macro definition does the rest.
const LINE_COUNT_MACRO = `\\newcommand{\\lctrackeditem}[2]{%
  \\item \\par
  {#2\\par}%
  \\directlua{write_line_count("\\luaescapestring{#1}", \\number\\prevgraf)}%
}`;

const LC_MARKER_RE = /%%LC:([A-Za-z0-9_.-]+)%%/;

function sanitizeFilename(s: string): string {
  return s.replace(/[\/\\:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
}

// Rewrites lines like `\item %%LC:B1%% Some bullet text` into a call to the
// tracked-item macro so the sidecar gets a line-count entry for that id.
// Lines without a marker, or ids not present in lineCountTargets, pass through
// untouched - tracking is opt-in per bullet, not automatic for every \item.
// Also returns each tracked bullet's plain text, needed for the verb/metric
// mechanical checks - the sidecar only carries measured line counts, not text.
function injectLineTracking(
  texBody: string,
  targets: LineCountTarget[]
): { tex: string; foundIds: Set<string>; bulletText: Record<string, string> } {
  const targetIds = new Set(targets.map((t) => t.id));
  const foundIds = new Set<string>();
  const bulletText: Record<string, string> = {};

  const lines = texBody.split("\n").map((line) => {
    const match = LC_MARKER_RE.exec(line);
    if (!match) return line;
    const id = match[1];
    if (!targetIds.has(id)) return line;
    foundIds.add(id);
    const withoutMarker = line.replace(LC_MARKER_RE, "").trim();
    const withoutItem = withoutMarker.replace(/^\\item\s*/, "");
    bulletText[id] = withoutItem;
    return `\\lctrackeditem{${id}}{${withoutItem}}`;
  });

  return { tex: lines.join("\n"), foundIds, bulletText };
}

const BANNED_FIRST_WORDS = new Set([
  "helped", "assisted", "collaborated", "worked", "supported",
  "responsible", "involved", "participated", "contributed", "partnered",
]);

function firstWord(text: string): string {
  return text.replace(/\\textbf\{/g, "").trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
}

function buildMechanicalChecks(
  targets: LineCountTarget[],
  bulletText: Record<string, string>,
  lineCounts: Record<string, number>
): string {
  const verbFlags = targets
    .filter((t) => BANNED_FIRST_WORDS.has(firstWord(bulletText[t.id] ?? "")))
    .map((t) => `${t.id} ("${(bulletText[t.id] ?? "").replace(/\\textbf\{|\}/g, "").slice(0, 40)}...")`);

  const lengthFlags = targets
    .filter((t) => (lineCounts[t.id] ?? 0) > t.limit)
    .map((t) => `${t.id} (${lineCounts[t.id]} lines)`);

  const metricTargets = targets.filter((t) => t.countForMetrics !== false);
  const withMetric = metricTargets.filter((t) => /\d/.test(bulletText[t.id] ?? "")).length;
  const pct = metricTargets.length > 0 ? Math.round((withMetric / metricTargets.length) * 100) : 0;

  const lines = [
    `Mechanical checks (tool-verified):`,
    `- Length: ${lengthFlags.length === 0 ? "all pass (measured from compile)" : "FAIL " + lengthFlags.join(", ")}`,
    `- Verbs: ${verbFlags.length === 0 ? "all pass" : "FAIL " + verbFlags.join(", ")}`,
    `- Metric coverage: ${metricTargets.length === 0 ? "no tracked bullets" : `${withMetric} of ${metricTargets.length} tracked bullets have a metric (${pct}%)`}`,
  ];
  return lines.join("\n");
}

function injectPreambleAndMacro(texBody: string): string {
  const docClassIdx = texBody.indexOf("\\documentclass");
  if (docClassIdx === -1) {
    // No preamble to anchor to - prepend both blocks as-is.
    return `${LUA_PREAMBLE}\n${LINE_COUNT_MACRO}\n${texBody}`;
  }
  const lineEnd = texBody.indexOf("\n", docClassIdx);
  const insertAt = lineEnd === -1 ? texBody.length : lineEnd + 1;
  return texBody.slice(0, insertAt) + `${LUA_PREAMBLE}\n${LINE_COUNT_MACRO}\n` + texBody.slice(insertAt);
}

function parseSidecar(sidecarPath: string, expectedIds: Set<string>): {
  errors: string[];
  lineCounts: Record<string, number>;
} {
  const errors: string[] = [];
  const lineCounts: Record<string, number> = {};

  if (expectedIds.size === 0) return { errors, lineCounts };

  if (!existsSync(sidecarPath)) {
    return { errors: ["Lua instrumentation produced no sidecar - line-count validation cannot proceed"], lineCounts };
  }

  const lines = readFileSync(sidecarPath, "utf-8").split("\n").filter((l) => l.trim() !== "");
  const seenIds = new Set<string>();

  for (const line of lines) {
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) {
      errors.push(`Malformed sidecar line (no =): "${line}"`);
      continue;
    }
    const id = line.slice(0, eqIdx).trim();
    const count = parseInt(line.slice(eqIdx + 1).trim(), 10);
    if (isNaN(count)) {
      errors.push(`Malformed sidecar line (non-numeric count): "${line}"`);
      continue;
    }
    if (seenIds.has(id)) {
      errors.push(`Duplicate ID in sidecar: "${id}"`);
      continue;
    }
    seenIds.add(id);
    if (!expectedIds.has(id)) {
      errors.push(`Unexpected ID in sidecar (not in lineCountTargets): "${id}"`);
      continue;
    }
    lineCounts[id] = count;
  }

  for (const id of expectedIds) {
    if (!seenIds.has(id)) errors.push(`Expected ID missing from sidecar: "${id}" (marker not found in texBody)`);
  }

  return { errors, lineCounts };
}

function atomicMove(src: string, dst: string): void {
  const tmp = `${dst}.tmp`;
  writeFileSync(tmp, readFileSync(src));
  renameSync(tmp, dst);
}

export async function buildTailoredResume(input: BuildTailoredResumeInput): Promise<BuildTailoredResumeResult> {
  const targets = input.lineCountTargets ?? [];
  const baseName = sanitizeFilename(input.fileBaseName);
  if (!baseName) return { ok: false, message: "fileBaseName resolved to an empty string after sanitizing." };

  const tailoredTexDir = workflowPath("output", "tailored_tex");
  const pdfDir = workflowPath("output", "pdfs");
  mkdirSync(tailoredTexDir, { recursive: true });
  mkdirSync(pdfDir, { recursive: true });

  const finalTexPath = join(tailoredTexDir, `${baseName}.tex`);
  const finalPdfPath = join(pdfDir, `${baseName}.pdf`);

  const tempDir = join(tailoredTexDir, `_tmp_${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });

  const tempTexPath = join(tempDir, `${baseName}.tex`);
  const tempPdfPath = join(tempDir, `${baseName}.pdf`);
  const sidecarPath = join(tempDir, "linecount.txt");

  try {
    const { tex: withTracking, foundIds, bulletText } = injectLineTracking(input.texBody, targets);
    const assembledTex = injectPreambleAndMacro(withTracking);
    writeFileSync(tempTexPath, assembledTex, "utf-8");

    const missingMarkers = targets.filter((t) => !foundIds.has(t.id)).map((t) => t.id);
    if (missingMarkers.length > 0) {
      return {
        ok: false,
        message: `lineCountTargets named ids not found as %%LC:<id>%% markers in texBody: ${missingMarkers.join(", ")}`,
      };
    }

    try {
      execSync(`lualatex -interaction=nonstopmode -halt-on-error "${baseName}.tex"`, {
        cwd: tempDir,
        stdio: "pipe",
      });
    } catch (err: any) {
      const stderr = err.stderr?.toString() ?? "";
      const stdout = err.stdout?.toString() ?? "";
      const detail = [stderr, stdout].filter(Boolean).join("\n") || err.message;
      return { ok: false, message: `lualatex failed:\n${detail}` };
    }

    if (!existsSync(tempPdfPath)) {
      return { ok: false, message: "PDF not produced after compile" };
    }

    let pageCount = 1;
    try {
      const pdfInfo = execSync(`pdfinfo "${baseName}.pdf"`, { cwd: tempDir, stdio: "pipe" }).toString();
      const match = pdfInfo.match(/^Pages:\s*(\d+)/m);
      if (!match) return { ok: false, message: "pdfinfo did not return a Pages field - cannot verify page count" };
      pageCount = parseInt(match[1], 10);
    } catch {
      return { ok: false, message: "pdfinfo failed - cannot verify page count. Install poppler-utils / MiKTeX's pdfinfo." };
    }

    const expectedIds = new Set(targets.map((t) => t.id));
    const { errors: sidecarErrors, lineCounts } = parseSidecar(sidecarPath, expectedIds);
    if (sidecarErrors.length > 0) {
      return { ok: false, pageCount, message: `Line-count validation failed:\n${sidecarErrors.join("\n")}` };
    }

    const issues: ValidationIssue[] = [];
    for (const target of targets) {
      const count = lineCounts[target.id] ?? 0;
      if (count > target.limit) {
        issues.push({ bulletId: target.id, rule: `exceeds ${target.limit} line(s) (measured ${count})` });
      }
    }
    if (pageCount > 1) issues.push({ rule: "resume exceeds 1 page" });

    if (issues.length > 0) {
      return { ok: false, pageCount, issues };
    }

    const texBackup = `${finalTexPath}.bak`;
    const pdfBackup = `${finalPdfPath}.bak`;
    if (existsSync(finalTexPath)) renameSync(finalTexPath, texBackup);
    if (existsSync(finalPdfPath)) renameSync(finalPdfPath, pdfBackup);

    try {
      atomicMove(tempTexPath, finalTexPath);
    } catch (err: any) {
      if (existsSync(texBackup)) renameSync(texBackup, finalTexPath);
      if (existsSync(pdfBackup)) renameSync(pdfBackup, finalPdfPath);
      return { ok: false, message: `TEX publish failed: ${err.message}` };
    }

    try {
      atomicMove(tempPdfPath, finalPdfPath);
    } catch (err: any) {
      if (existsSync(finalTexPath)) rmSync(finalTexPath);
      if (existsSync(texBackup)) renameSync(texBackup, finalTexPath);
      if (existsSync(pdfBackup)) renameSync(pdfBackup, finalPdfPath);
      return { ok: false, message: `PDF publish failed (both outputs restored): ${err.message}` };
    }

    try { if (existsSync(texBackup)) rmSync(texBackup); } catch {}
    try { if (existsSync(pdfBackup)) rmSync(pdfBackup); } catch {}

    const mechanicalChecks = buildMechanicalChecks(targets, bulletText, lineCounts);

    let evalWrittenTo: string | undefined;
    if (input.evalJudgment) {
      const evalPath = workflowPath("workflow_state", "pending", "eval_pending.md");
      mkdirSync(join(evalPath, ".."), { recursive: true });
      const today = new Date().toISOString().slice(0, 10);
      const block = `## ${baseName} | ${today}\n\n${input.evalJudgment.trim()}\n\n${mechanicalChecks}\n`;
      const existing = existsSync(evalPath) ? readFileSync(evalPath, "utf-8") : "# Eval Pending\n";
      writeFileSync(evalPath, existing.trimEnd() + "\n\n" + block, "utf-8");
      evalWrittenTo = evalPath;
    }

    return { ok: true, pageCount, texPath: finalTexPath, pdfPath: finalPdfPath, mechanicalChecks, evalWrittenTo };
  } finally {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}
