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

For demo runs, use sample files per `playbook/00_INDEX.md`.

Real local inputs:
- `master_resume.tex`
- approved Stage 2 tailoring plan

## Outputs

- Tailored `.tex` files under `output/tailored_tex/`
- Built PDFs under `output/pdfs/`

Generated outputs are ignored by Git.

## File Naming Convention

Use this format for every tailored output file:

```text
output/tailored_tex/Candidate Name Resume - Company - Role.tex
output/pdfs/Candidate Name Resume - Company - Role.pdf
```

Capitalize the first letter of every word in the company name regardless of how it appears in the JD. Use standard brand casing for known companies (e.g. `ServiceNow` not `Servicenow`, `MongoDB` not `Mongodb`). When in doubt, title-case it.

## Execution Flow

### Straight-to-Tailoring Shortcut

If the user asks to go straight to tailoring:
- Run the full Stage 2 reasoning internally with the same rigor
- Do not print the Stage 2 compact plan unless the user asks for it
- Surface hard blockers, missing inputs, or real ambiguity before building

### Context Reuse Rule

- Do not re-read files already in the current chat context unless the user changed them, exact verification is needed, or there is a concrete blocker
- Do not re-open evidence files during Stage 3 when the approved Stage 2 plan is already available

### Zero-Preamble Rule

When Stage 3 starts and the needed inputs are available, the first substantive action should be copying `master_resume.tex` into `output/tailored_tex/` with the role-specific filename. Do not spend time re-explaining the workflow before taking that action.

### Build Steps

1. Start from `master_resume.tex`, not from another tailored file
2. Copy the master resume into `output/tailored_tex/` with the role-specific filename
3. Apply only the approved tailoring changes
4. Compile the copied `.tex`
5. Confirm the PDF path and page count
6. Clean transient LaTeX artifacts

## Build Commands

Build prerequisites:
- Local PDF builds require a LaTeX distribution such as MiKTeX for Windows (https://miktex.org/download) or TeX Live for macOS/Linux (https://tug.org/texlive/), including `lualatex` and `pdfinfo` (poppler-utils) on PATH
- If LaTeX is not installed, still create the tailored `.tex` file and tell the user PDF build is unavailable locally
- The user can compile the `.tex` later after installing LaTeX or by uploading it to Overleaf

### Preferred: `build_tailored_resume` MCP tool

If the MCP server is configured, use `build_tailored_resume` instead of running scripts by hand. Assemble the complete tailored `.tex` body (master template plus the approved Stage 2 changes) and pass it as `texBody`, along with `fileBaseName`.

To get mechanical line-length enforcement (no bullet over its rendered line limit) instead of eyeballing the PDF: mark any bullet you want checked with a `%%LC:<id>%%` token anywhere on its `\item` line, and list that id with its limit in `lineCountTargets` (2 for experience bullets, 1 for project bullets are reasonable defaults - adjust per the user's actual template). The token itself is stripped before rendering; it does not appear in the compiled PDF. Bullets left unmarked are not checked - marking is optional per bullet, not required for every one.

The tool compiles with `lualatex`, checks page count with `pdfinfo`, checks every marked bullet's measured line count against its limit, and only then atomically publishes to `output/tailored_tex/` and `output/pdfs/` (existing files at those paths are backed up first, restored automatically on any failure). On failure - compile error, page count over 1, or a bullet over its line limit - nothing is published; fix the flagged issue and call the tool again.

```
build_tailored_resume({
  fileBaseName: "Jane Doe Resume - Example Co - Senior Engineer",
  texBody: "...(complete assembled .tex source)...",
  lineCountTargets: [
    { id: "exp-1", limit: 2 },
    { id: "proj-1", limit: 1 }
  ]
})
```

### Fallback: manual scripts (no MCP server)

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

With the manual path, page count and bullet line length are not mechanically enforced - follow the One-Page Rule and Bullet Length Rule below by reading the compiled PDF yourself.

## Project Selection

Before tailoring, read `evidence/projects/INDEX.md` to select the right project set for the role.

Rules:
- Rank available projects by JD-specific resume value before deciding count and order
- Default to the two strongest projects for the role unless a third adds clear incremental value
- Only add a third project if it increases interview probability more than the bullets it displaces from stronger projects
- Do not add a project with only 1 bullet by default. Use a 1-bullet project only when Stage 2 explicitly marked it as a light supporting signal.
- Check if a Role-Specific Extras section exists in any included project file. If it does, read the swap guidance and decide whether the role calls for swapping in alternate bullets. Swap, do not stack.

## One-Page Rule

The final resume must be one page unless the user explicitly wants a longer format.

With `build_tailored_resume`, page count over 1 comes back as an `issues` entry - the build already failed to publish, so there is nothing to undo. With the manual script path, check page count after compile yourself.

If the PDF overflows (either path):
- Remove the weakest project bullet first, regardless of which project it belongs to
- If still over, remove the next weakest project bullet
- Only compress or cut experience bullets after project bullets are already lean
- Do not trim mechanically for project balance - an uneven distribution can be better than cutting the strongest evidence

Do not weaken the most relevant evidence just to preserve project symmetry.

## Bullet Length Rule

- Aim for 2 lines maximum per bullet when rendered in the compiled PDF
- Allow a 3-line bullet only when compressing it would meaningfully weaken the role-specific signal
- Do not let multiple bullets expand just because space happens to exist
- With `build_tailored_resume`, mark bullets with `%%LC:<id>%%` and pass matching `lineCountTargets` so this is measured, not eyeballed - a bullet over its limit comes back in `issues` and the build does not publish. With the manual script path, check this after every compile by reading the PDF.

## Persona at This Stage

Before declaring a tailored resume done, read it as a skeptical hiring manager seeing it cold:
- Does the summary frame the role fit clearly?
- Are the strongest bullets near the top?
- Are any claims unsupported?
- Are any bullets too generic?
- Do repeated lead verbs make the resume feel templated?
- Does the skills section match the actual evidence?
- Are any bullets longer than 2 lines without a strong reason?

Fix issues before calling the resume done.

## Post-Build Tracking

After a successful role-specific build:
- Update `workflow_state/tailored_count.md`
- Update `workflow_state/jobs_fetched_history.md` to mark the role as `Tailored` when enough company, role, and link information is available
- Do not increment the tailored count for rebuilds of an already-tailored role

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
