# Stage 2: Suggest Changes

Use this stage when the user asks how to tailor the resume for a role.

## Trigger / Inputs

Trigger phrases:
- `suggest changes`
- `suggest changes (compact mode)`
- `suggest changes (compact mode with max push)`
- `straight to tailoring`
- `straight to tailoring, skip suggest-changes output`

Pass 1B triggers, only when explicitly requested:
- `exact bullet changes`
- `show exact bullet changes`
- `go deeper into <role>`
- `do pass 1b`

Pass 2 triggers, only when explicitly requested:
- `show the table`
- `do pass 2`

For demo runs, use sample files per `playbook/00_INDEX.md`.

Allowed inputs:
- Stage 1 inputs:
  - `JD Text.md`, a JD pasted directly in chat, a JD link, or `workflow_state/fresh_job_jds/...`
  - `workflow_state/resume_digest.md` by default
  - `workflow_state/bullet_index.md` by default
  - `master_resume.tex` only if exact verification is needed
  - If a JD entry contains Markdown image links, use only those explicitly referenced images for that role
- Skills inventory:
  - `evidence/work/skills_inventory.md`, only when the JD asks for skills or tools missing from the current digest or when deciding whether to bring a removed or optional skill back
  - For every role, explicitly check whether any JD-relevant skill or tool should be backfilled. This is a check, not a requirement to add anything.
- Project bank:
  - `evidence/projects/INDEX.md`, only when project changes or order are being considered
  - Open only the specific `evidence/projects/P*.md` files needed when changing project order, count, or bullet wording

---

## Decision Standard

- Goal: produce the strongest truthful role-tailored resume changes most likely to move the candidate to interview
- Pass 1A is always the strongest truthful tailoring plan, not a conservative preview
- Optimize every role for the highest defensible projected score using deeper evidence, project evidence, skill inventory, bullet swaps, ordering, summary framing, and skill pruning
- Do not wait for the user to ask for max push; present the strongest truthful version by default
- Max push never means inventing tools, ownership, domain experience, metrics, or unsupported keywords
- Evaluate proposed edits like a skeptical recruiter or hiring manager would read them
- Do not sugar-coat weak ideas; if a proposed change is weak, risky, or resume theater, say so directly and explain what would make it defensible
- Maintain brutal honesty about remaining gaps. If major gaps remain after tailoring, state them under `Gaps` without making the plan timid

---

## Evidence Retrieval

- Primary path: call `query_evidence` once per role with the full JD text if the MCP tool is available
- Open the returned experience and project files directly
- Every proposed summary, experience bullet, project bullet, or skill add/backfill must be grounded in the current resume digest, selected evidence file, skills inventory, or existing resume text. If the support is weak, label it as a gap instead of suggesting the change
- Fallback path if `query_evidence` is unavailable:
  - Read `evidence/work/EVIDENCE_ROUTER.md` once per chat
  - Open specific evidence files needed for the role
- Treat deeper evidence as selective support, not a license to expand every strong base bullet
- Stop when each actively reviewed bullet has either a clearly better rewrite or swap, or a clear reason to stay unchanged

---

## Evidence Gap Interview

Run this interview after evidence retrieval and gap identification, before finalizing the Pass 1A output.

### Trigger Conditions

Run the interview only when ALL of the following are true:

- Projected tailored score is 8.0 or above
- At least one hard JD requirement (not a nice-to-have) has weak or no evidence backing in the retrieved files
- The gap is plausibly closeable — meaning it is conceivable that undocumented work experience exists that covers it

### Skip Conditions

Do NOT run the interview when:

- Projected tailored score is below 8.0
- Every remaining gap is a nice-to-have or preferred item in the JD
- The hard gap is a fundamental stack or domain mismatch that no answer from the user can close (e.g. "5+ years of Python" when Python is not the candidate's primary stack)
- All hard JD requirements are already well-covered by existing evidence

### How to Run

Before presenting the Pass 1A output, state briefly which gaps triggered the interview and why they are worth asking about. Then ask targeted questions — maximum 4, one per identified closeable gap.

Questions must be:
- Tied to a specific hard JD requirement that is currently unmet or weakly met
- Framed conversationally, not as a numbered formal list
- Concrete: ask about specific work, outcomes, or scope — not general skill claims

Example framing: "Before I finalize the plan, a couple of things the JD requires that aren't in your evidence files — did you work on anything that involved [X]? Even if it wasn't the primary feature, scope or outcome details here could strengthen a bullet."

### What Answers Become

- Treat user answers as session-level evidence for this role only
- Use them directly to strengthen or close the flagged gap in the Pass 1A plan
- Do not write answers to any evidence file automatically — user decides if they want to formalize it later
- If the user answers "no" or "nothing relevant": note the gap remains, proceed with Pass 1A as normal
- A blank or negative answer is a valid outcome — do not push for invented claims

### Behavior After the Interview

Incorporate confirmed answers into the Pass 1A output before presenting it. The user sees one consolidated Pass 1A — not a pre-interview draft and a post-interview draft. The interview is internal to the Stage 2 flow.

---

## Pass 1A Output

Default for `suggest changes`. This is the compact decision layer.

- The `Initial -> Projected` score must reflect the best truthful projected score after all selected changes, not a first-pass or cautious estimate
- Do not print full rewritten bullets, separate bullet maps, or Keep lists by default
- Use this exact compact structure for each role:

```text
Company | Role | Initial -> Projected | Verdict
Angle: ...
Remove: ...
Change: ...
Skills remove: ...
Skills add/backfill: ...
Skills compress: Merged [Category A] + [Category B] -> "[New Label]" | Dropped: x, y, z
Order: ...
Projects: ...
Gaps: ...
---
```

Formatting rules:
- In `Remove`, `Change`, and `Order`, use inline code for bullet IDs plus short glosses
- In `Change`, say whether each changed bullet is a `rewrite`, `strengthen`, or `swap to ...`
- In `Skills remove`, use inline code for each removed skill
- In `Skills add/backfill`, write `none` if nothing should be added. If support is weak, do not add it; mention the weak support under `Gaps`
- In `Projects`, include selected project order, count, and intended bullet distribution for every project being kept, added, swapped, or removed
- Keep output compact and readable
- End the response with `Next commands:` and at least 2 relevant next-command suggestions unless the user already provided the next command

---

## Pass 1B Output

Only on explicit Pass 1B or exact-change request. Expand only the named role(s), or all roles only if the user asks for all.

- Exact summary text, copy/paste ready
- Selected evidence IDs for expanded roles
- Show exact full text only for bullets being swapped in, rewritten, or partially updated with deeper evidence
- If reordering is recommended, state final bullet order by ID
- Do not reprint unchanged bullets
- Skills: `REMOVE: x, y, z`
- Projects: state selected project IDs, order, and bullet counts. Show exact full changed project bullet text. If project bullets stay unchanged, say so directly.
- Initial score -> projected score

---

## Pass 2 Output

Only on `show the table` / `do pass 2`.

- Requirement -> Evidence table, capped at 6-8 rows:
  - `Requirement | Evidence (current resume) | Gap/Concern | Fix (exact change)`

---

## Summary Rules

- For every JD, explicitly evaluate whether the summary can sell the fit more strongly and truthfully at the top of the page. Keep it unchanged only when it is already the strongest truthful framing.
- Use the summary to set the recruiter reading lens: frontend-first, backend-first, systems/performance, integrations/platform, cloud/full-stack, product, or another JD-driven identity
- Keep summaries specific, human, and defensible. Avoid generic fluff and resume theater.
- Never use the exact JD title in the summary. Use a broader truthful identity.
- Do not add skills or tools to the summary unless that skill is central to the JD angle and directly supported by the selected bullet and project plan
- Only use skills backed by real work experience. Never add skills that only appear in the skills section.

---

## Experience Bullet Rules

- Review every bullet in every experience role for swap, rewrite, and ordering potential against the JD
- Any bullet in any section is movable or replaceable if it adds less value for that JD than a stronger truthful alternative
- Use deeper evidence primarily on weaker base bullets or when a JD-specific angle materially improves fit. If a base bullet is already dense, evidence-rich, and aligned, keep it, lightly reframe it, or reorder it instead of stuffing in more detail.
- After selecting the final bullet set, evaluate strongest-to-weakest ordering wherever it materially improves the section
- No bullet should exceed 2 lines when rendered in the PDF. Allow a 3-line rendered bullet only when compression would materially weaken role-critical signal and no cleaner alternative preserves the same evidence.
- Compress bullet wording before sacrificing project space or readability
- Do not use em-dashes in bullets
- Use ownership and tech-lead wording. Avoid weak verbs: "Helped", "Assisted", "Collaborated on", "Worked on", "Supported", "Responsible for", "Involved in", "Participated in", "Contributed to"
- Avoid repeating the same lead verb across nearby bullets when a truthful alternative exists
- Vary bullet openings deliberately during Pass 1B so sections do not read as templated

---

## Skills Rules

- Always perform the skill-backfill check during Stage 2, even when the final answer is `Skills add/backfill: none`
- Treat the skills inventory as selective support, not a keyword dump. Add a skill or tool only when it is truthful, JD-relevant, and supported by a bullet, project plan, or concrete evidence.
- If inventory support is weak or conditional, either support it with a matching bullet or project change, or leave it out and call out the gap
- Audit every skill currently listed in the resume for the specific JD, not only obviously unrelated tools
- Proactively remove skills that are unsupported by resume evidence, add little recruiter-visible value for the role, or dilute the strongest role-specific positioning
- The visible `Skills remove:` line must contain the complete recommended pruning list. Do not defer avoidable skill-pruning discoveries to the post-build eval pass.
- Compress the skills section to 4 lines for every tailored resume by merging the two weakest remaining categories into one line
- Drop only items not signaled by the JD and not core stack
- Core stack never gets dropped

---

## Project Rules

- Read `evidence/projects/INDEX.md` first when project changes are being considered
- Rank all available projects by JD-specific resume value before selecting count, order, or bullet allocation. Any project can be primary, secondary, supporting, or omitted.
- Choose the highest-value bullets for each selected project against the JD; do not rebalance mechanically from default order
- Prefer fewer projects with meaningful depth over many shallow projects
- Project coherence rule:
  - When a project is included, preserve at least one anchor bullet that explains what the project is and why it exists
  - Do not include a one-bullet project unless that single bullet is self-contained and clearly explains the project's purpose plus role-relevant value
  - Do not select isolated implementation-detail bullets solely for keyword coverage if they make the project read as contextless
  - ATS keyword coverage never justifies an orphaned project bullet that a recruiter or hiring manager cannot understand
- Allocation guidance:
  - Primary project: typically 3-4 bullets; secondary: 2-3; third/supporting: 1-2
  - For 2-project resumes, prefer 3 + 3; allow 4 + 2 when the primary project is materially stronger and explain why
  - Never use a one-bullet second project in a 2-project resume
  - For 3-project resumes, prefer 3 + 2 + 1 or 2 + 2 + 2 based on relevance hierarchy; explain uneven distributions
- Always state project order
- Call out whether project count stays at baseline or changes for the role
- Do not trim project bullets just for compactness; cut them only when the JD-specific value hierarchy or one-page constraint justifies it

---

## Stage Boundaries

- No Gmail drafting in Stage 2
- No PDF builds unless the user explicitly switches to Stage 3
- No resume, evidence, or workflow file edits during Stage 2 unless the user explicitly asks for maintenance edits. Stage 2 produces recommendations only; implementation belongs to Stage 3 after approval.
- Straight-to-tailoring shortcut:
  - If the user says `straight to tailoring`, run the same Stage 2 thinking internally with the same rigor
  - Do not print the compact Stage 2 output
  - Carry the internally selected changes directly into Stage 3 execution
  - This skips only the visible suggestion-review step, not the underlying fit judgment or tailoring logic
  - Hard blockers, genuine ambiguity, or impossible builds still must be surfaced briefly instead of blindly proceeding
