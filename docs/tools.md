# MCP Tools Reference

The public `mcp-server/` exposes 6 tools. This is the reference for what each one does, its parameters, and an example call/response.

Setup and registration: [mcp-setup.md](mcp-setup.md).
Optional `query_evidence` extensions for pattern files you maintain yourself: [patterns-setup.md](patterns-setup.md).

---

## `process_jd`

Fetches a job description from a URL using a headless browser, accepts pasted JD text directly, or pulls the next unprocessed entry from `JD Text.md`. It does not clean or structure the JD itself - after receiving the result, the AI is expected to clean it and call `save_jd_snapshot` with the structured version.

Pasted text, `JD Text.md`, and a URL fetched with `jdContent` already supplied return raw text directly in the tool response, since that content is already known to the caller. A URL fetched without `jdContent` is different: the raw page text is written straight to a local snapshot file under `workflow_state/pending/jd_snapshots/` and never returned inline, so it never enters chat context - only the file path (`jdSnapshotPath`) does. Read that file once, clean it, call `save_jd_snapshot`, then delete the snapshot file.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `input` | string | yes | A URL to a live job posting, full JD text pasted directly, or the literal string `"next"` to process the next entry in `JD Text.md` |
| `company` | string | when `input` is a URL or raw text | Company name |
| `role` | string | when `input` is a URL or raw text | Role title |
| `jdContent` | string | no | Clean JD text to use instead of fetching the URL, if you already have it |

**Example**

```
process_jd({ input: "https://boards.greenhouse.io/example/jobs/12345", company: "Example Co", role: "Senior Software Engineer" })

→ JD_SNAPSHOT_WRITTEN
   Company: Example Co
   Role: Senior Software Engineer
   Source: boards.greenhouse.io
   Link: https://boards.greenhouse.io/example/jobs/12345
   jdSnapshotPath: workflow_state/pending/jd_snapshots/https___boards_greenhouse..._1234567890.txt

   Read the snapshot file once, clean it, then call save_jd_snapshot and delete the snapshot file.
```

---

## `save_jd_snapshot`

Saves a cleaned JD (the output of cleaning up what `process_jd` returned) into `workflow_state/fresh_job_jds/`. Always called immediately after `process_jd`, never on its own.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `company` | string | yes | Company name |
| `role` | string | yes | Role title |
| `link` | string | yes | Original job posting URL, or `"N/A"` if none |
| `source` | string | yes | Source hostname, `"pasted"`, or `"JD Text.md"` |
| `cleanedContent` | string | yes | Cleaned JD: role summary, Skills (Required / Nice to have), Experience, Responsibilities, Location, Visa, Education |

**Example**

```
save_jd_snapshot({
  company: "Example Co",
  role: "Senior Software Engineer",
  link: "https://boards.greenhouse.io/example/jobs/12345",
  source: "boards.greenhouse.io",
  cleanedContent: "..."
})

→ "Saved to workflow_state/fresh_job_jds/example-co-senior-software-engineer.md"
```

---

## `query_evidence`

Semantic search over your local evidence bank (`E##`/`P##` files) using a local embedding model (`all-MiniLM-L6-v2` via `@xenova/transformers` - no API key, no internet after the first model download). Given a JD's full text, returns the most relevant evidence files ranked by cosine similarity.

**Category-aware mode**: pass `experienceTopN`/`projectTopN` to get two independently ranked sections (experience files and project files), so project evidence can't get crowded out by a large experience bank or vice versa. Within each section, the top `fullTextExperienceTopN`/`fullTextProjectTopN` results are inlined in full; the rest are headline-only (title + rank, open on demand).

**Flat mode**: omit the category params and it returns one ranked list across `evidenceCategory` (`all`, `experience`, or `projects`), each result as a short preview, no full-text tiering.

**Cross-role dedup**: if you're tailoring several roles in one chat, pass `alreadyFullText` (the filenames already returned in full for an earlier role) so a file that's already in context isn't reprinted for every subsequent role - it comes back as rank/score only.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `jdText` | string | yes | Full JD text to match against the evidence bank |
| `topN` | number | no | Top results to return in flat mode (default 6) |
| `evidenceCategory` | `"all"` \| `"experience"` \| `"projects"` | no | Category filter in flat mode (default `"all"`) |
| `experienceTopN` | number | no | Enables category-aware mode; top experience files to rank |
| `projectTopN` | number | no | Top project files to rank in category-aware mode |
| `fullTextExperienceTopN` | number | no | How many of the top experience results get full text (default 6) |
| `fullTextProjectTopN` | number | no | How many of the top project results get full text (default 3) |
| `alreadyFullText` | string[] | no | Filenames already returned full-text earlier in this chat - skip reprinting, return rank/score only |
| `includeTailoringPatterns` | boolean | no | See [patterns-setup.md](patterns-setup.md) |
| `includeWinningPatterns` | boolean | no | See [patterns-setup.md](patterns-setup.md) |
| `alreadyPatterns` | string[] | no | See [patterns-setup.md](patterns-setup.md) |

**Example**

```
query_evidence({
  jdText: "Senior Full Stack Engineer... backend reliability, API design...",
  experienceTopN: 10,
  projectTopN: 5
})

→
Top 10 experience evidence files for this JD. Full text included for the top 6; do NOT re-read those files.

=== 1. [48.3%] E12_example_bullet.md ===
### 12. Example bullet
- ...

Headline only (open a file only if its title is clearly JD-relevant):
7. [29.6%] E20_other_bullet.md | ### 20. Other bullet
...

---

Top 5 project evidence files for this JD. Full text included for the top 3; do NOT re-read those files.
...
```

Run `rebuild_evidence_index` first if you get `evidence_index.json not found`.

---

## `rebuild_evidence_index`

Re-embeds every evidence file (and `tailoring_patterns.md`, if you maintain one - see [patterns-setup.md](patterns-setup.md)) and writes the local index files to disk. No parameters. Run once after first-time setup, and again any time you add, remove, or edit an evidence file or a tailoring pattern - the index does not update itself.

**Example**

```
rebuild_evidence_index({})

→ "Evidence index rebuilt. 46 files indexed and saved to evidence_index.json.
   Tailoring patterns index rebuilt. 12 patterns indexed."
```

(Second line only appears if `tailoring_patterns.md` exists.)

---

## `write_fit_check_rows`

Appends fit-check results as a fixed-width ASCII table under today's date to `workflow_state/pending/fit_check_pending.md`. Handles table formatting, sorting by Tailored score descending, row numbering, and merging with any rows already logged today for the same company/role. Never write this table by hand - always route fit-check output through this tool.

With `promote` instead of `rows`, it copies matching rows out of `workflow_state/fresh_jobs_fit_check.md` (the fresh-job-search history table) into the pending file, for when a role found during a job search batch should move into the active tailoring queue.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `rows` | array | one of `rows`/`promote` | `{company, role, initial, tailored, verdict, notes, link, source?, posted?}` per role. Omit when using `promote`. |
| `promote` | array | one of `rows`/`promote` | `{company, role?}` selectors. Omit `role` to promote every role from that company's latest search batch. |
| `target` | `"fit_check_pending"` \| `"fresh_jobs"` | no | Which table to write to (default `"fit_check_pending"`) |
| `batchLabel` | string | no | Optional subheading rendered above the table, e.g. to label a search source |

**Example**

```
write_fit_check_rows({
  rows: [{
    company: "Example Co",
    role: "Senior Software Engineer",
    initial: "6.5",
    tailored: "8.0",
    verdict: "Apply",
    notes: "Strong stack overlap. Gap: no direct GraphQL experience.",
    link: "https://boards.greenhouse.io/example/jobs/12345",
  }],
})

→ "Wrote 1 row(s) to fit_check_pending.md under 08/25/2026."
```

---

## `build_tailored_resume`

Compiles an assembled LaTeX resume with `lualatex`, mechanically measures the rendered line count of any bullet you choose to track, and enforces a fail-closed page-count and line-limit gate before publishing anything. On success the `.tex` and `.pdf` are published atomically to `output/tailored_tex/` and `output/pdfs/` (any existing files at those paths are backed up first and restored automatically if publishing fails partway through). On failure - a LaTeX compile error, page count over 1, or a tracked bullet over its line limit - nothing is published and the temp build directory is cleaned up.

**Line tracking**: mark any bullet you want checked with a `%%LC:<id>%%` token anywhere on its `\item` line in `texBody`, then list that `id` with its line limit in `lineCountTargets`. The token is stripped before rendering and never appears in the compiled PDF. Bullets left unmarked are not checked - tracking is opt-in per bullet, not automatic for every `\item` in the document. This works with any resume section shape; nothing about bullet counts or section structure is hardcoded.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `fileBaseName` | string | yes | Output filename without extension, e.g. `"Jane Doe Resume - Example Co - Senior Engineer"` |
| `texBody` | string | yes | The complete assembled LaTeX document, `\documentclass` through `\end{document}` |
| `lineCountTargets` | array | no | `{id, limit}` per bullet to check. Omit or pass `[]` to skip line-count enforcement (page-count and compile checks still run) |

**Example**

```
build_tailored_resume({
  fileBaseName: "Jane Doe Resume - Example Co - Senior Engineer",
  texBody: "\\documentclass[10pt]{article}\n...\\item %%LC:exp-1%% Built a thing...\n...",
  lineCountTargets: [
    { id: "exp-1", limit: 2 },
    { id: "proj-1", limit: 1 }
  ]
})

→ { "ok": true, "pageCount": 1, "texPath": "...output/tailored_tex/Jane Doe Resume - Example Co - Senior Engineer.tex", "pdfPath": "...output/pdfs/Jane Doe Resume - Example Co - Senior Engineer.pdf" }
```

On a failed build:

```
→ { "ok": false, "pageCount": 1, "issues": [{ "bulletId": "exp-1", "rule": "exceeds 2 line(s) (measured 3)" }] }
```
