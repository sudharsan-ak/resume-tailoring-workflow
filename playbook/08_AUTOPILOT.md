# Stage 8: Autopilot

Use this stage when the user wants to run the full workflow end to end for a role in a single triggered flow.

Triggers:
- `auto tailor`
- `autopilot this role`
- `process this role`
- `process this role end to end`
- `end to end`

## What This Stage Is

Autopilot chains fit check → suggest changes → tailor + build → eval into a single triggered flow with a mandatory human checkpoint before any file is written. All existing stage rules still apply in full — this file only defines the sequencing and checkpoint behavior.

## Flow

### Step 1 — Fit Check

Run the fit check per `playbook/01_FIT_CHECK.md`.

- If tailored score is below 6.5: stop. Report the score and the reason. Do not proceed to suggest changes.
- If tailored score is 6.5 or above: continue to Step 2.

### Step 2 — Suggest Changes

Run Pass 1A per `playbook/02_SUGGEST_CHANGES.md`.

- Print the compact Pass 1A output as normal.
- This is the human checkpoint. Stop here and wait.

### Step 3 — Checkpoint (mandatory pause)

After printing the suggest-changes output, append this exact line and stop:

```text
Autopilot paused. Reply with a clear approval to tailor and build, or give corrections first.
```

Do NOT proceed to Step 4 without explicit approval. Clear approval language includes `go`, `proceed`, `execute`, `approved`, `go ahead`, `continue`, and equivalent unambiguous wording. Silence is not approval.

If the user gives corrections instead of approval:
- Apply the corrections to the proposed tailoring plan only
- Display the revised plan
- Pause again and wait for explicit approval before tailoring or writing files
- Corrections alone are not approval, even when phrased as direct instructions

### Step 4 — Tailor + Build + Eval

On explicit user approval:

- Run tailor + build per `playbook/03_TAILOR_BUILD.md`
- Run eval pass per `playbook/07_EVAL.md` automatically after the PDF is confirmed 1 page

## Rules

- Each step uses its own stage file in full. No shortcuts, no rule relaxation.
- The fit check threshold (6.5 tailored) is a hard stop, not a soft warning.
- If suggest changes surfaces a hard blocker (impossible build, genuine evidence gap): stop and report before building.
- Do not skip the checkpoint. Even if the user says "auto tailor no questions" — still print the suggest-changes plan and pause. The checkpoint exists to catch wrong tailoring angles before wasting a build.
- Batch autopilot: if the user gives multiple roles, run the full flow role by role sequentially. Print all suggest-changes plans first, then pause once for all roles before building any.
- If the user gives corrections for one or more roles in a batch, display all revised affected plans and pause again.
- One clear approval authorizes all current batch plans unless the user explicitly excludes one or more roles.
