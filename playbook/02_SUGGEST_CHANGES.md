# Stage 2: Suggest Changes

Use this stage when the user asks how to tailor the resume for a role.

## Inputs

Demo inputs:
- `sample/sample_job_description.md`
- `sample/sample_profile_notes.md`
- `sample/sample_resume.tex`
- `sample/sample_bullet_index.md`
- `sample/sample_resume_digest.md`
- `sample/sample_evidence_bank.md`

Real local inputs:
- `JD Text.md`, a JD pasted directly in chat, a JD link, or `workflow_state/fresh_job_jds/...`
- `workflow_state/profile_notes.md`
- `master_resume.tex` when exact bullet verification is needed
- `workflow_state/bullet_index.md`
- `workflow_state/resume_digest.md`
- `evidence/work/EVIDENCE_ROUTER.md`
- `evidence/work/INDEX.md`
- specific `evidence/work/E*.md` files needed for the role
- `evidence/projects/INDEX.md`
- specific `evidence/projects/P*.md` files when project changes are being considered

## Excluded Work

- Do not build a PDF unless the user switches to Stage 3.
- Do not draft outreach unless the user switches to Stage 4.
- Do not modify real local workflow files unless the user explicitly asks for execution.

## Goal

Produce the strongest truthful tailoring plan for the role.

The plan should answer:
- What is the resume angle for this job?
- Which bullets should stay, move, be rewritten, or be replaced?
- Which skills should be removed or added based only on real evidence?
- Which projects should be shown, hidden, or reordered?
- What gaps remain even after tailoring?

## Pass System

Use this pass system so Codex, Claude Code, and other coding assistants respond consistently.

### Pass 1A: Compact Decision Layer

Default trigger:
- `suggest changes`

Purpose:
- decide the role angle
- identify swaps, rewrites, removals, skill changes, project order, and remaining gaps
- keep output compact

Do not print full rewritten bullets by default.

### Pass 1B: Exact Change Layer

Triggers:
- `exact bullet changes`
- `show exact bullet changes`
- `go deeper`
- `do pass 1b`

Purpose:
- show exact copy-ready bullet changes for the requested role
- include selected evidence IDs when useful
- show changed bullets only
- summarize unchanged sections briefly

### Pass 2: Requirement Table

Triggers:
- `show the table`
- `do pass 2`

Purpose:
- map JD requirements to current evidence, gaps, and exact fixes

Output:

```text
Requirement | Evidence | Gap/Concern | Fix
```

Cap at 6 to 8 rows.

## Evidence Rules

- Open the evidence bank only after the role is worth tailoring.
- Select evidence by job requirement, not by favorite project.
- Prefer evidence that proves recent, relevant, recruiter-visible outcomes.
- Do not use evidence that cannot be defended in an interview.
- Do not turn weak evidence into broad claims.
- If a metric is not in the evidence bank or resume, do not invent it.
- See `evidence/work/EVIDENCE_ROUTER_TEMPLATE.md` for an example of how to structure the router by JD shape.

## Pass 1A Output: Compact Plan

Use this format for each role:

```text
Company | Role | Initial -> Projected | Verdict
Angle: ...
Remove: ...
Change: ...
Skills remove: ...
Skills add: ...
Order: ...
Projects: ...
Gaps: ...
```

Use `---` between roles.

Keep this compact. Do not print full rewritten bullets unless the user asks for Pass 1B.

End with `Next options:`. Useful options after Pass 1A:
- `show exact bullet changes` or `do pass 1b`
- `show the table` or `do pass 2`
- `tailor the PDF`
- revise the plan before tailoring

## Pass 1B Output: Exact Bullet Changes

Use exact bullet output only when the user asks for:
- `exact bullet changes`
- `show exact bullet changes`
- `go deeper`
- `do pass 1b`

For exact output:
- Show only bullets that change.
- State unchanged sections briefly.
- Include selected evidence IDs if the evidence bank uses IDs.
- Keep bullets short enough to fit a one-page resume.
- Avoid repeating the same lead verb across nearby bullets.
- End with `Next options:` including `tailor the PDF`, revise a bullet, or show the requirement table.

## Pass 2 Output: Requirement Table

Use this only when the user asks for `show the table` or `do pass 2`.

```text
Requirement | Evidence | Gap/Concern | Fix
```

Cap the table at 6 to 8 rows.

End with `Next options:` including `show exact bullet changes`, `tailor the PDF`, or revise the selected evidence.

## Rigor Rules

- Strengthen the summary only when the new framing is more truthful and useful.
- Do not preserve a generic summary by habit.
- Prefer a smaller number of strong bullets over a larger number of weak bullets.
- Reorder sections when it improves recruiter scanning.
- If a suggested change is risky or unsupported, say so directly.
- If a role has a real gap that tailoring cannot fix, keep the gap visible.

