# Stage 1: Fit Check

Use this stage when the user asks whether one or more roles are worth pursuing.

Triggers:
- `check next role`
- `check JD`
- `rank these roles`
- `fit check`
- user pastes a JD or provides a JD link

## Silence Rule

Do all scoring work silently: no narration, no reasoning shown, no scoring commentary, no file-write confirmations mid-run. Score the role(s) first, then call `write_fit_check_rows` once with the whole batch. Intermediate requirement analysis, evidence analysis, gap analysis, and verdict rationale belong only in that tool call's `notes` field - never as standalone chat text before or after the call.

## Inputs

For demo runs, use sample files per `playbook/00_INDEX.md`.

Real local inputs:
- `JD Text.md`, a JD pasted directly in chat, a JD link, or `workflow_state/fresh_job_jds/...`
- `workflow_state/profile_notes.md`
- `workflow_state/resume_digest.md`
- `master_resume.tex` only if exact bullet verification is needed

### JD Fetching (URL input)

Call `process_jd` with the URL. For pasted text or `JD Text.md`, it returns the text directly in its response - already in context, nothing further needed.

For a URL, `process_jd` fetches the page headlessly and writes the raw text to a local snapshot file instead of returning it inline, so raw page text never enters chat context. It returns `jdSnapshotPath`. Read that file once, clean it (extract role summary, Skills, Experience, Responsibilities, Location, Visa, Education; strip company background/benefits/nav/footer boilerplate), call `save_jd_snapshot` with the cleaned content, then delete the snapshot file. Score from the cleaned content.

## Explicitly Excluded at This Stage

- Do not open the full `.tex` file unless exact wording verification is required
- Do not open `bullet_index.md`
- Do not open any evidence work files
- Do not open project evidence files
- Do not suggest changes, expand on roles, or add commentary after the receipt line

## Persona

Act like a ruthless recruiter or hiring manager for the specific role. Be brutally honest. If the fit is weak, say it plainly. Do not pad scores. Do not invent strengths. Flag every real gap. The goal is to win an interview, not to feel good about a score.

## Scoring Rules

- 1-10 scale only
- Initial score = current resume fit before any tailoring
- Tailored score = best honest achievable score after truthful tailoring with existing evidence
- Never manufacture experience or inflate weak evidence to reach a higher tailored score
- Minimum, required, and explicitly mandatory qualifications drive eligibility and blocker decisions
- Preferred, desired, bonus, and nice-to-have qualifications are additive proof only. When present, they may strengthen the score or break a close tie. Missing one must never by itself trigger `Skip`, impose a score cap, or be described as a blocker
- Language/stack lists without hard requirements = ecosystem context, not a checklist. Covering a meaningful portion is a pass.
- 8.0+ is rare. Requires strong stack, level, responsibility, and domain alignment all at once.
- Visa/sponsorship: generic no-sponsorship/no-visa-support language is a risk flag, not an automatic `Skip` - note it, do not lower the score for it alone. An explicit, unambiguous incompatibility with the candidate's actual work authorization situation (as stated in `profile_notes.md` or the current chat) is a hard blocker.
- Location is never a blocker unless the user has defined it as one in `profile_notes.md`

## Blocker Rules

Do not treat visa, sponsorship, clearance, location, compensation, or other personal preferences as hard blockers unless they are explicitly listed in `workflow_state/profile_notes.md` or stated in the current chat.

If a job violates an explicit hard blocker:
- mark `Verdict` as `Skip`
- show the blocker in the Notes column
- do not spend tokens on deep tailoring analysis

## Output

Score the role(s) internally, then call `write_fit_check_rows` once with the whole batch: `rows: [{company, role, initial, tailored, verdict, link, notes}]`. For every URL-based fit check, `link` is mandatory and must be the canonical employer/ATS URL used for that role; use `N/A` only when the input truly has no URL. The tool renders the fixed-width ASCII table, sorts by Tailored descending, numbers rows, and appends it under today's date in `workflow_state/pending/fit_check_pending.md`. Never write the table manually.

Chat output only after the tool call succeeds, one line per role:

```text
[Company] - [Verdict] [Score]. Written to fit_check_pending.md
```

- Verdict: `Apply` / `Borderline` / `Skip`
- Notes: 2-3 lines max - top strength, biggest gap, blocker flag if relevant

## Deep Dive

If user says `deep dive` on any role, switch to full verbose format instead of the routed-table output:

- Role summary
- Requirements → Evidence table: `Requirement | Evidence | Gap/Concern | Fix`
- Full gap analysis
- Initial + tailored score with detailed reasoning

## STOP Rule

Stop after the tool call and the receipt line. Do NOT suggest changes, expand on any role, or add commentary. Wait for the user to give the next command.
