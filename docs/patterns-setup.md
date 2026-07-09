# Tailoring Patterns & Winning Patterns Setup (Optional)

`query_evidence` can optionally surface two extra kinds of context alongside evidence results, if you choose to maintain them:

- **`tailoring_patterns.md`** - reusable rules you've noticed across your own tailoring sessions ("when the JD mentions X, do Y"), so the AI applies past decisions instead of re-deriving them from scratch every time.
- **`winning_patterns.json`** - a log of past applications that actually got a callback, with the JD signals and resume choices that likely contributed, so the AI can lean on what's actually worked instead of guessing.

Neither file ships with this repo, and no tool writes them for you. Both are entirely optional - `query_evidence` works exactly as before if they don't exist.

---

## Where the files live

By default, both paths are resolved relative to the workspace root as `Shared Memory/tailoring_patterns.md` and `Shared Memory/winning_patterns.json`. If you use a different folder name, update `TAILORING_PATTERNS_PATH` and `WINNING_PATTERNS_PATH` in `mcp-server/src/tools/public/queryEvidence.ts` and `mcp-server/src/tools/public/rebuildIndex.ts` to match.

---

## `tailoring_patterns.md` format

Plain text, one block per pattern, blocks separated by a blank line. Each block:

```text
P-### | <Type> | <Short title>
T: <trigger condition -> action to take>
G: <grounding - what evidence supports this pattern> | X: <exception - when NOT to apply it>
```

- `P-###` - sequential ID, e.g. `P-001`, `P-002`. IDs never get reused; a pattern is updated in place by referencing its existing ID, not by appending a duplicate.
- `Type` - single letter, meaning is up to you (this repo uses `A` = structural gap, `B` = framing/evidence, `C` = ordering/project - adjust to your own taxonomy if you like).
- `T:` line is what gets embedded and matched against each JD - write it as a real trigger condition, not just a topic label, so semantic search has something concrete to match against.

Example file with two patterns:

```text
# Tailoring Patterns
# Pattern ID: P-### sequential | Types: A/B/C are yours to define
# T: trigger condition -> action to take | G: grounding + X: exception

P-001 | B | Emphasize backend ownership for platform-heavy JDs
T: JD emphasizes backend reliability, platform engineering, or production performance -> lead with backend/infrastructure bullets ahead of UI/product bullets; frame summary around reliability and ownership language.
G: Confirmed callback at Company X (see winning_patterns.json) used this framing. | X: Do not apply if the JD is UI/product-primary even if it mentions some backend work.

P-002 | C | Three-project split for broad roles
T: JD rewards breadth over depth and all project bullets fit one line -> use a 3/2/2 project split instead of a single-bullet third project.
G: Worked well across several broad full-stack JDs. | X: Skip if project space is tight or the third project is materially weaker.
```

### Turning entries into an index

After creating or editing `tailoring_patterns.md`, call the `rebuild_evidence_index` tool once - it also rebuilds `tailoring_patterns_index.json` (the embedding index `includeTailoringPatterns` reads) if the patterns file exists. Re-run it any time you add, remove, or edit a pattern; the index does not update itself.

### Using it

Ask the AI to pass `includeTailoringPatterns: true` on `query_evidence` calls (every role - relevance is JD-specific per role, not chat-static). It returns the most JD-relevant patterns ranked by semantic similarity to each pattern's `T:` line, full text for the top matches, headline (ID + title) only for lower-ranked ones. If you're tailoring multiple roles in one chat, also pass back `alreadyPatterns` (the list of pattern IDs already returned full-text earlier in the chat) so patterns that already surfaced for an earlier role don't get reprinted in full for every subsequent role - just their rank and ID.

---

## `winning_patterns.json` format

A single JSON object with a `meta` block and a `patterns` array. One entry per application that resulted in a real callback.

```json
{
  "meta": {
    "description": "Winning resume patterns - roles that resulted in a recruiter call. One entry per win only.",
    "current_count": 1,
    "last_updated": "2026-01-01"
  },
  "patterns": [
    {
      "id": "2026-01-01_example_co",
      "company": "Example Co",
      "role": "Senior Software Engineer",
      "applied_date": "2026-01-01",
      "jd_key_signals": [
        "Backend reliability and platform ownership",
        "API design, distributed systems",
        "5+ years, fast-paced environment"
      ],
      "outcome": "recruiter_call",
      "summary_focus": ["Backend ownership", "API design", "production reliability"],
      "bullets_included_confirmed": true,
      "bullets_included": ["backend_pipeline_bullet", "api_reliability_bullet"],
      "notes": "Freeform note on why this framing likely worked - what in the resume mapped to what in the JD."
    }
  ]
}
```

Field names beyond `id`, `company`, `role`, and `jd_key_signals` are not enforced by the tool - it reads and returns the whole file as-is, so you can add or drop fields to fit how you actually think about your own applications. `jd_key_signals` is the field worth keeping consistent, since that's the natural thing to compare against a new JD when deciding whether a past win is relevant precedent.

### Using it

Ask the AI to pass `includeWinningPatterns: true` on the **first** `query_evidence` call of a chat only. The tool returns the whole file compacted (same content, no pretty-print whitespace, to keep the token cost down) alongside that role's evidence. Do not pass the flag again later in the same chat - the file doesn't change mid-session, so there's no reason to re-fetch it; the AI should just keep using what it already read for every later role.

---

## Maintaining both files over time

Neither file is meant to be static:

- **`tailoring_patterns.md`** grows as you notice repeated structural decisions across tailoring sessions. There's no tool-enforced review cadence in the public build - decide your own threshold for when to sit down and write a new pattern (or update an existing one) based on what you've been doing manually across recent roles.
- **`winning_patterns.json`** grows one entry per confirmed callback. Add an entry as soon as you get one, while the context (why you tailored it that way, what in the JD prompted the choice) is still fresh.

After any edit to `tailoring_patterns.md`, re-run `rebuild_evidence_index` so the index reflects the change - `winning_patterns.json` needs no separate index step since it's read directly, not embedded/ranked.
