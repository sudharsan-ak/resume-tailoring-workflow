# MCP Tools Reference

The public `mcp-server/` exposes 4 tools. This is the reference for what each one does, its parameters, and an example call/response.

Setup and registration: [mcp-setup.md](mcp-setup.md).
Optional `query_evidence` extensions for pattern files you maintain yourself: [patterns-setup.md](patterns-setup.md).

---

## `process_jd`

Fetches a job description from a URL using a headless browser, accepts pasted JD text directly, or pulls the next unprocessed entry from `JD Text.md`. Returns raw page text for the AI to clean into structured sections - it does not clean or structure the JD itself. After receiving the result, the AI is expected to clean it and call `save_jd_snapshot` with the structured version.

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

→ raw page text (unstructured), for the AI to clean before calling save_jd_snapshot
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
