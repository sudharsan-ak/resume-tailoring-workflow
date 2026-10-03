import { existsSync, readFileSync, writeFileSync } from "fs";
import { workflowPath } from "../../config.js";

const PENDING_PATH = workflowPath("workflow_state", "pending", "suggest_changes_pending.md");

function normMatchText(s: string): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Pass 1A blocks look like:
//   ## [Company] | [Role] | Initial -> Projected | Verdict
//   Angle: ...
//   ...
//   ---
// A block runs from its "## " heading up to (and including) the next line that
// is exactly "---", or to the next "## " heading / end of file if no separator
// is present.
function findBlockRange(lines: string[], start: number): number {
  let end = start + 1;
  while (end < lines.length) {
    if (lines[end].trim() === "---") return end + 1;
    if (/^## /.test(lines[end])) return end;
    end++;
  }
  return end;
}

function parseHeadingCompanyRole(heading: string): { company: string; role: string } | null {
  // "## [Company] | [Role] | Initial -> Projected | Verdict"
  const parts = heading.replace(/^##\s*/, "").split("|").map((p) => p.trim());
  if (parts.length < 2) return null;
  return { company: parts[0], role: parts[1] };
}

export interface SuggestChangesRemoval {
  removed: boolean;
  message: string;
  /** The block's own company/role text, exactly as written in the file. Reused to drive the fit_check removal so a build call whose company/role args are phrased slightly differently still matches the original row. Undefined when nothing was removed. */
  matched?: { company: string; role: string };
}

/**
 * Removes a role's directives block from suggest_changes_pending.md after a
 * successful tailored build. Matches by company+role first; if that misses,
 * falls back to role title alone (company names can drift in formatting
 * between the original packet and the build call - mirrors the private
 * workflow's two-tier match). No-op (and reports not-found) if the file
 * doesn't exist or the role has no block in it.
 */
export function removeSuggestChangesBlock(company: string, role: string): SuggestChangesRemoval {
  if (!existsSync(PENDING_PATH)) {
    return { removed: false, message: "suggest_changes_pending.md not found; nothing to remove." };
  }
  const targetCompany = normMatchText(company);
  const targetRole = normMatchText(role);
  const lines = readFileSync(PENDING_PATH, "utf-8").replace(/\r\n/g, "\n").split("\n");

  // First pass: locate the match (company+role, else role alone) without
  // mutating anything, so the removal pass below has a single fixed target.
  let matched: { company: string; role: string } | undefined;
  for (let i = 0; i < lines.length;) {
    if (/^## /.test(lines[i])) {
      const parsed = parseHeadingCompanyRole(lines[i]);
      const end = findBlockRange(lines, i);
      if (parsed) {
        const isExact = normMatchText(parsed.company) === targetCompany && normMatchText(parsed.role) === targetRole;
        const isRoleOnly = !matched && normMatchText(parsed.role) === targetRole;
        if (isExact || isRoleOnly) matched = parsed;
        if (isExact) break;
      }
      i = end;
      continue;
    }
    i++;
  }

  if (!matched) {
    return { removed: false, message: `${company} - ${role} not found in suggest_changes_pending.md.` };
  }

  const kept: string[] = [];
  for (let i = 0; i < lines.length;) {
    if (/^## /.test(lines[i])) {
      const parsed = parseHeadingCompanyRole(lines[i]);
      const end = findBlockRange(lines, i);
      if (parsed && normMatchText(parsed.company) === normMatchText(matched.company) && normMatchText(parsed.role) === normMatchText(matched.role)) {
        i = end;
        continue;
      }
      kept.push(...lines.slice(i, end));
      i = end;
      continue;
    }
    kept.push(lines[i]);
    i++;
  }

  const cleaned = kept.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  writeFileSync(PENDING_PATH, cleaned, "utf-8");
  return { removed: true, message: `Removed ${matched.company} - ${matched.role} from suggest_changes_pending.md.`, matched };
}
