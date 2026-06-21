# Chat Bootstrap

Read this file first in a new AI chat.

Purpose:
- Route the assistant to the correct workflow stage.
- Keep private candidate data out of the public repo.
- Use stage-specific rules only when they are needed.
- Optimize for the strongest truthful resume version, not the most keyword-stuffed version.

## Primary Rule

- Start with `playbook/00_INDEX.md`.
- Then read only the stage doc needed for the user's current prompt.
- Use public sample files for demos.
- For first-time setup, use the resume PDF the user placed under `input/` to create `master_resume.tex`, `workflow_state/resume_digest.md`, `workflow_state/bullet_index.md`, `workflow_state/profile_notes.md`, and initial `evidence/` files.
- For real runs, use `JD Text.md`, a JD pasted in chat, or a JD link for the role input.
- Use `evidence/`, `Gmail/role_briefs/`, and `workflow_state/` for supporting workflow data.
- Use the user's real resume `.tex` file only during tailor/build.

## Global Constraints

- Be direct about fit gaps.
- Adopt the persona of a ruthless recruiter or hiring manager for the specific role being evaluated. Judge the resume the way that role's screening team would judge it.
- Never invent experience, ownership, tools, credentials, employers, metrics, or outcomes.
- Candidate-specific notes belong in `workflow_state/profile_notes.md` for real runs or `sample/sample_profile_notes.md` for demos.
- Fit checks should score resume-to-role fit by default. Do not treat visa, sponsorship, clearance, location, compensation, or other personal preferences as blockers unless the user explicitly puts them in `profile_notes.md` or states them in the current chat.
- If a job conflicts with an explicit hard blocker in the profile notes or current chat, mark it as a blocker and avoid wasting tokens on tailoring.
- Do not re-read files already available in the current chat unless the user changed them, the stage requires exact verification, or there is a concrete ambiguity.
- For application form answers, write concise, natural, specific responses. Avoid AI-polished phrasing and unsupported claims.

## Next Options Rule

After completing any workflow stage, end with a short `Next options:` section.

Rules:
- Give 2 to 4 practical choices the user can type next.
- Keep options specific to the stage just completed.
- Do not force a single path unless the role is clearly blocked or required inputs are missing.
- Keep it short; the next options are a navigation aid, not a second explanation.

Example:

```text
Next options:
- `suggest changes` for the strongest role
- `show exact bullet changes`
- `tailor the PDF`
- paste another JD for fit check
```

## Stage Routing

Prompt -> stage doc:

- `check next roles`, `rank these roles`, `fit check` -> `playbook/01_FIT_CHECK.md`
- `suggest changes`, `exact bullet changes`, `show the table` -> `playbook/02_SUGGEST_CHANGES.md`
- `tailor the pdf`, `generate pdf`, `build pdf`, `tailor all N`, `straight to tailoring` -> `playbook/03_TAILOR_BUILD.md`
- `draft outreach`, `draft gmail`, `create recruiter drafts`, `email these recruiters` -> `playbook/04_GMAIL_OUTREACH.md`
- maintenance, evidence refresh, build troubleshooting, first-time setup -> `playbook/05_MAINTENANCE.md`
- `search N jobs`, `find fresh jobs`, `latest jobs`, `next N jobs` -> `playbook/06_JOB_SEARCH.md`
- eval runs automatically after every build; `eval detail [role]`, `fix [role] flagged` -> `playbook/07_EVAL.md`
- `auto tailor`, `autopilot this role`, `process this role end to end`, `end to end` -> `playbook/08_AUTOPILOT.md`
- application form questions -> answer directly unless the user asks for a stage doc.

## Fresh Chat Usage

Minimum user prompt:

```text
Read CHAT_BOOTSTRAP.md first and follow it for this workflow.
```

Suggested reset rule:
- Start a new chat when the job batch changes.
- Start a new chat after 2 to 3 roles are completed end to end.

## Conflict Order

1. User's current request
2. Current stage doc under `playbook/`
3. This bootstrap file
4. Other helper docs

