# Stage 7: Eval Pass

Run this pass automatically after every tailor, before reporting the final result. No exceptions. This is a non-blocking quality report, not an approval gate.

## When to Run

After compile confirms 1 page. Before reporting the final result to the user.

- Single role: run immediately after that PDF is confirmed 1 page
- Batch of 2+: skip per-role eval during the batch; run one consolidated eval after all PDFs are built

## What to Evaluate

Every bullet in the compiled `.tex` file — experience and project sections both.

Do NOT eval: summary line, skills section, education, section headers, job titles, dates.

## The Checks

Experience bullets and project bullets are evaluated differently.

---

### Experience Bullets — Three Checks

#### 1. JD Match

Does the bullet map to one of the top 3 requirements or responsibilities from the JD?

- Use the JD context already in the current chat — do not re-read the JD
- Pass: bullet addresses a core JD skill, responsibility, or keyword
- Fail: bullet is generic, stack-agnostic, or addresses something the JD does not care about
- Exception: bullets that establish credibility (team lead, scale, production ownership) pass even without a direct JD keyword match

#### 2. Length

Does the bullet exceed 2 lines when rendered in the compiled PDF?

- Base this on the actual compiled output, not character count
- Pass: 1-2 lines rendered
- Fail: 3+ lines rendered

#### 3. Verb

Does the bullet open with a strong, specific action verb?

- Fail (flag these): "Helped", "Assisted", "Collaborated", "Worked on", "Supported", "Responsible for", "Involved in", "Participated in", "Contributed to", "Partnered with"
- Pass: "Built", "Engineered", "Led", "Developed", "Introduced", "Optimized", "Resolved", "Delivered", "Implemented", "Designed", "Architected", "Migrated", "Reduced", "Increased", and any direct ownership verb

---

### Project Bullets — Three Checks

#### 1. Resume Value

Does this bullet add genuine lift to the resume for this specific role?

- Pass: bullet demonstrates a concrete technical capability, ownership, or outcome that makes the candidate look more capable for this JD
- Fail: bullet is filler, restates the project name, or adds no information a recruiter would notice

#### 2. Length

Same as experience bullets — based on actual PDF render.

#### 3. Verb

Same as experience bullets.

---

### Metric Coverage — Summary Stat Only

Do NOT flag individual bullets for missing metrics. Instead, count how many experience bullets contain a concrete number, percentage, scale, or outcome, and report it as a single summary line.

- Count only experience bullets, not project bullets
- Report as: `Metric coverage: X of Y experience bullets have a metric (Z%)`
- No threshold or flag — this is an observation only, not a pass/fail

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

Only include rows where a flag exists. Passing bullets are completely silent.

**With flags:**

```text
Eval Pass

| Role                        | Flags | Details                     |
|-----------------------------|-------|-----------------------------|
| Company - Role              | 1     | JD MISS x1 (bullet context) |

Summary: PASS (role-specific framing reason) | FAIL (what to fix)
Skills: PASS (all backed) | FAIL (specific skill with no backing)
Metric coverage: X/Y (Z%).
```

**Zero flags — single line:**

```text
Eval Pass — Resume is ready. Summary: PASS. Skills: PASS. Metric coverage: X/Y (Z%).
```

---

## Flag Values

- `VERB` — weak opening verb
- `JD MISS` — does not map to JD requirements
- `LONG` — exceeds 2 lines in rendered PDF
- `VALUE` — project bullet adds no genuine lift (project bullets only)
- `SUMMARY` — summary is generic or undersells fit
- `SKILL` — skill listed with no supporting bullet evidence
- Combine with `/` if multiple: `VERB/JD MISS`

---

## Drill-Down

When user says `eval detail [role]`, show the flagged rows table for that role only:

```text
Eval Detail - Company - Role

| # | Section  | Bullet (first 55 chars)        | Flag    | Proposed Fix                          |
|---|----------|-------------------------------|---------|---------------------------------------|
| 3 | Role     | Bullet opening text here...   | VERB    | "Rewritten opening with stronger verb"|
| 7 | Projects | Project bullet opening...     | VALUE   | Credibility bullet - accept or swap   |
```

Notes on proposed fixes:
- Keep the same meaning and evidence — do not invent claims or metrics
- For VERB: show the full rewritten opening
- For JD MISS where no better evidence exists: write `Credibility bullet - accept or swap if evidence supports it`
- For LENGTH: show a compressed version that fits 2 lines

---

## Completion and Behavior After Flagging

- Always declare the resume complete and ready after reporting eval results, whether it has zero flags or more
- Flags are non-blocking optional improvements. The user may proceed with the current tailored resume without accepting or fixing them.
- Do NOT apply any flagged fix until the user explicitly requests it
- `fix [role] flagged` — apply all proposed fixes for that role
- `fix [role] [#]` — apply only the proposed fix for that row number
- After applying any fix: recompile, confirm the PDF is still exactly 1 page, and verify only the changed bullets
- Do not run the full eval again after fixes. Report the limited verification result and keep the resume marked complete.

## Eval Does Not Override Other Rules

- The 1-page rule still applies. If a fix causes overflow, resolve overflow first.
- The no-invented-claims rule still applies.
- The bullet length rule (2 lines max) still applies. A VERB fix that makes a bullet longer is not acceptable.
