# Stage 3: Tailor + Build PDF

Use this stage when the user has approved changes or asks to build a tailored resume directly.

Triggers:
- `tailor the pdf`
- `generate pdf`
- `build pdf`
- `tailor all`
- `straight to tailoring`
- `direct to tailoring`
- `skip directly to tailoring`
- `straight to tailoring, skip suggest-changes output`

## Inputs

Demo inputs:
- `sample/sample_resume.tex`
- approved Stage 2 tailoring plan

Real local inputs:
- `master_resume.tex`
- approved Stage 2 tailoring plan

## Outputs

- Tailored `.tex` files under `output/tailored_tex/`
- Built PDFs under `output/pdfs/`

Generated outputs are ignored by Git.

## Execution Flow

Straight-to-tailoring shortcut:
- If the user asks to go straight to tailoring, still do Stage 2 reasoning internally.
- Do not print the Stage 2 compact plan unless the user asks for it.
- Surface hard blockers, missing inputs, or real ambiguity before building.

Context reuse rule:
- Do not re-read files already in the current chat context unless the user changed them, exact verification is needed, or there is a concrete blocker.
- Do not re-open evidence files during Stage 3 when the approved Stage 2 plan is already available.

Zero-preamble rule:
- When Stage 3 starts and the needed inputs are available, the first substantive action should be copying `master_resume.tex` into `output/tailored_tex/` with the role-specific filename.
- Do not spend time re-explaining the workflow before taking that action.

1. Start from the master resume `.tex` file, not from another tailored file.
2. Copy the master resume into `output/tailored_tex/` with a role-specific filename.
3. Apply only the approved tailoring changes.
4. Compile the copied `.tex`.
5. Confirm the PDF path and page count.
6. Clean transient LaTeX artifacts.

## Build Commands

Build prerequisites:
- Local PDF builds require a LaTeX distribution such as MiKTeX for Windows (https://miktex.org/download) or TeX Live for macOS/Linux (https://tug.org/texlive/).
- If LaTeX is not installed, still create the tailored `.tex` file and tell the user PDF build is unavailable locally.
- The user can compile the `.tex` later after installing LaTeX or by uploading it to Overleaf.

Build one file:

```powershell
.\scripts\run-resume-task.ps1 -TexPath .\output\tailored_tex\example-role.tex -CleanArtifacts
```

Build the sample resume:

```powershell
.\scripts\run-resume-task.ps1 -TexPath .\sample\sample_resume.tex -CleanArtifacts
```

Build queued files:

```powershell
.\scripts\build-pdfs.ps1
```

Queue files by copying the template to the ignored local task file, then editing `scripts/build-task.json`:

```powershell
Copy-Item .\scripts\build-task.template.json .\scripts\build-task.json
```

```json
{
  "tex_paths": [
    "output/tailored_tex/example-role.tex"
  ],
  "clean_artifacts": true
}
```

`scripts/build-task.json` is ignored because queued role filenames may contain real company or role details.

## One-Page Rule

The final resume should be one page unless the user explicitly wants a longer format.

If the PDF overflows:
- remove the weakest project bullet first
- then compress dense bullets
- then remove lower-signal skills
- only then cut experience content

Do not weaken the most relevant evidence just to preserve project symmetry.

Bullet length rule:
- Aim for 2 lines maximum per bullet.
- Allow a 3-line bullet only when compressing it would meaningfully weaken the role-specific signal.
- Do not let multiple bullets expand just because space happens to exist.

## Cold Review

After a successful build, read the resume like a skeptical hiring manager:
- Does the summary frame the role fit clearly?
- Are the strongest bullets near the top?
- Are any claims unsupported?
- Are any bullets too generic?
- Do repeated lead verbs make the resume feel templated?
- Does the skills section match the actual evidence?
- Are nearby bullets starting with the same verb? If so, vary the lead verbs when a truthful alternative exists.
- Are any bullets longer than 2 lines without a strong reason?

Fix issues before calling the resume done.

## Post-Build Tracking

After a successful role-specific build:
- Update `workflow_state/tailored_count.md`.
- Update `workflow_state/jobs_fetched_history.md` to mark the role as `Tailored` when enough company/role/link information is available.
- Do not increment the tailored count for rebuilds of an already-tailored role.

## Output Format

```text
Built: output/pdfs/<file>.pdf
Pages: 1
Notes: <only if something important changed or failed>
```

If a build fails, show the single root-cause line and stop.

End with `Next options:`. Useful options after a successful build:
- draft recruiter outreach
- tailor another role
- rebuild after edits
- paste another JD for fit check

