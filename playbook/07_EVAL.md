# Stage 7: Eval Pass

Run this pass automatically after every tailor, before reporting the final result. No exceptions. This is a non-blocking quality report, not an approval gate.

## Same Call as the Build, Not a Separate Step

With `build_tailored_resume` (see `03_TAILOR_BUILD.md`), the eval pass and the build are the same tool call. Compute the judgment checks below before calling the tool, pass the result as `evalJudgment`, and the tool appends its own tool-verified mechanical checks (length, verb, metric coverage - see Tool-Owned Checks below) and writes the combined block to `workflow_state/pending/eval_pending.md` automatically on a successful build. There is no separate "run eval" action to remember.

If building manually (no MCP server), run the judgment checks yourself after compile and report them per the Output Format below; you will also need to check length and verb yourself by reading the compiled PDF, since nothing is measuring them mechanically.

## When to Run

Before reporting the final result to the user.

- Single role: the judgment checks happen internally right before the `build_tailored_resume` call for that role
- Batch of 2+: still one `build_tailored_resume` call per role with its own `evalJudgment`; report a consolidated summary after all PDFs are built rather than printing each role's eval as it completes

## What to Evaluate

Every bullet in the compiled `.tex` file - experience and project sections both.

Do NOT eval: summary line, skills section, education, section headers, job titles, dates.

## The Checks

Experience bullets and project bullets are evaluated differently.

---

### Experience Bullets - Judgment Check

#### JD Match

Does the bullet map to one of the top 3 requirements or responsibilities from the JD?

- Use the JD context already in the current chat - do not re-read the JD
- Pass: bullet addresses a core JD skill, responsibility, or keyword
- Fail: bullet is generic, stack-agnostic, or addresses something the JD does not care about
- Exception: bullets that establish credibility (team lead, scale, production ownership) pass even without a direct JD keyword match

---

### Project Bullets - Judgment Check

#### Resume Value

Does this bullet add genuine lift to the resume for this specific role?

- Pass: bullet demonstrates a concrete technical capability, ownership, or outcome that makes the candidate look more capable for this JD
- Fail: bullet is filler, restates the project name, or adds no information a recruiter would notice

---

## Tool-Owned Checks (do NOT evaluate these yourself)

Length, weak-opening-verb, and metric coverage are measured by `build_tailored_resume` from the compiled build and appended to the eval block as a "Mechanical checks" section. Never write length, verb, or metric rows yourself when the tool is available.

- **Length**: any bullet marked with a `%%LC:<id>%%` token and listed in `lineCountTargets` gets its rendered line count measured from the actual compile, not guessed.
- **Verb**: the tool flags a tracked bullet whose text opens with a weak verb ("Helped", "Assisted", "Collaborated", "Worked on", "Supported", "Responsible for", "Involved in", "Participated in", "Contributed to", "Partnered with").
- **Metric coverage**: the tool counts how many tracked bullets contain a concrete number, percentage, scale, or outcome, reported as `X of Y tracked bullets have a metric (Z%)`. Set `countForMetrics: false` on a target's `lineCountTargets` entry to exclude a bullet (e.g. a project bullet) from this stat if you want it scoped to experience bullets only.

Mark every experience and project bullet you want covered by these checks with `%%LC:<id>%%` and a line limit when assembling `texBody` for the Stage 3 build - an unmarked bullet gets none of this.

---

## Two Additional Checks

Run once per resume, not per bullet, before the summary table.

### Summary Quality

Is the summary the strongest truthful top-of-page sell for this specific JD?

- Pass: summary is JD-specific, names the relevant stack and experience level, reads like it was written for this role
- Fail: summary is generic, could apply to any role, or undersells the most relevant evidence for this JD
- If it fails: flag as `SUMMARY` in the details column with a one-line proposed tightening

### Skill Defensibility

Are all skills listed in the Technical Skills section defensible from the resume evidence?

- Pass: every listed skill appears in at least one bullet with real usage context
- Fail: a skill was added as a keyword but has no supporting bullet
- If it fails: flag as `SKILL` in the details column with the specific skill that has no evidence backing

---

## Output Format

Build the `evalJudgment` string from the judgment checks above (JD Match, Resume Value, Summary Quality, Skill Defensibility) - only include rows where a flag exists, passing bullets are completely silent. Pass it to `build_tailored_resume`; the tool appends its own `Mechanical checks (tool-verified):` section (Length, Verbs, Metric coverage) below it in `eval_pending.md` automatically.

After the build call succeeds, report to the user using the same combined shape - your judgment section as composed, followed by the tool's `mechanicalChecks` string from the result:

**With flags:**

```text
Eval Pass

| Role                        | Flags | Details                     |
|-----------------------------|-------|-----------------------------|
| Company - Role              | 1     | JD MISS x1 (bullet context) |

Summary: PASS (role-specific framing reason) | FAIL (what to fix)
Skills: PASS (all backed) | FAIL (specific skill with no backing)

Mechanical checks (tool-verified):
- Length: all pass (measured from compile)
- Verbs: all pass
- Metric coverage: X of Y tracked bullets have a metric (Z%)
```

**Zero flags - single line, plus the tool's mechanical section:**

```text
Eval Pass - Resume is ready. Summary: PASS. Skills: PASS.

Mechanical checks (tool-verified):
- Length: all pass (measured from compile)
- Verbs: all pass
- Metric coverage: X of Y tracked bullets have a metric (Z%)
```

---

## Flag Values

Judgment flags (yours, go in `evalJudgment`):
- `JD MISS` - does not map to JD requirements
- `VALUE` - project bullet adds no genuine lift (project bullets only)
- `SUMMARY` - summary is generic or undersells fit
- `SKILL` - skill listed with no supporting bullet evidence
- Combine with `/` if multiple: `JD MISS/SKILL`

`VERB` and `LONG` are not judgment flags - they appear only in the tool's `Mechanical checks` section, sourced from `build_tailored_resume`'s result, never assigned by you.

---

## Drill-Down

When user says `eval detail [role]`, show the flagged rows table for that role only:

```text
Eval Detail - Company - Role

| # | Section  | Bullet (first 55 chars)        | Flag    | Proposed Fix                          |
|---|----------|-------------------------------|---------|---------------------------------------|
| 3 | Role     | Bullet opening text here...   | JD MISS | Reframe around [JD-specific angle]    |
| 7 | Projects | Project bullet opening...     | VALUE   | Credibility bullet - accept or swap   |
```

If the tool's mechanical section flagged a `Verbs` or `Length` issue for a specific bullet id, include that row too, sourced from the tool's result, not your own read of the PDF.

Notes on proposed fixes:
- Keep the same meaning and evidence - do not invent claims or metrics
- For a tool-flagged weak verb: show the full rewritten opening
- For JD MISS where no better evidence exists: write `Credibility bullet - accept or swap if evidence supports it`
- For a tool-flagged length overage: show a compressed version that fits the bullet's `lineCountTargets` limit

---

## Completion and Behavior After Flagging

- Always declare the resume complete and ready after reporting eval results, whether it has zero flags or more
- Flags are non-blocking optional improvements. The user may proceed with the current tailored resume without accepting or fixing them.
- Do NOT apply any flagged fix until the user explicitly requests it
- `fix [role] flagged` - apply all proposed fixes for that role
- `fix [role] [#]` - apply only the proposed fix for that row number
- After applying any fix: recompile, confirm the PDF is still exactly 1 page, and verify only the changed bullets
- Do not run the full eval again after fixes. Report the limited verification result and keep the resume marked complete.

## Eval Does Not Override Other Rules

- The 1-page rule still applies. If a fix causes overflow, resolve overflow first.
- The no-invented-claims rule still applies.
- The bullet length rule (2 lines max) still applies. A VERB fix that makes a bullet longer is not acceptable.
