# MCP Server Setup

This guide walks you through setting up the `mcp-server/` so any MCP-compatible AI assistant (Claude Code, Codex, or other) can call the workflow tools directly.

## Prerequisites

- Node.js 18 or later - [download](https://nodejs.org/)
- LaTeX installed locally (MiKTeX on Windows, TeX Live on macOS/Linux) - see [latex-setup.md](latex-setup.md), only needed if you build PDFs outside this server

---

## Step 1 - Install and build

```bash
cd mcp-server
npm install
npm run build
```

This compiles the TypeScript source to `mcp-server/dist/`. You only need to run this once, or again after pulling updates.

---

## Step 2 - Create your config file

Copy the example config and fill in your local paths:

```bash
cp mcp-server/config.example.json mcp-server/config.json
```

Edit `mcp-server/config.json`:

```json
{
  "workflowRoot": "C:/path/to/your/resume-tailoring-workflow",
  "evidencePath": "C:/path/to/your/evidence/folder"
}
```

- `workflowRoot`: absolute path to the root of this cloned repository on your machine
- `evidencePath`: absolute path to the folder `query_evidence`/`rebuild_evidence_index` should scan for `E##`/`P##` evidence files (typically `evidence/work` and `evidence/projects` under this repo, but can point anywhere)

`config.json` is gitignored and stays local.

---

## Step 3 - Register the MCP server in your AI assistant

### Claude Code (VS Code sidebar)

Add the following to your Claude Code `settings.json` (open via `Ctrl+Shift+P` > `Claude Code: Open Settings`):

```json
{
  "mcpServers": {
    "resume-tailoring": {
      "command": "node",
      "args": ["C:/path/to/resume-tailoring-workflow/mcp-server/dist/index.js"]
    }
  }
}
```

Replace the path with the absolute path to `mcp-server/dist/index.js` on your machine.

### Codex (VS Code sidebar)

Add the MCP server under your Codex MCP configuration. The exact location depends on your Codex extension version - look for an `mcpServers` or `tools` section in Codex settings:

```json
{
  "mcpServers": {
    "resume-tailoring": {
      "command": "node",
      "args": ["C:/path/to/resume-tailoring-workflow/mcp-server/dist/index.js"]
    }
  }
}
```

---

## Step 4 - Verify the server is running

Restart your VS Code window after updating settings. In the Claude Code or Codex sidebar, the AI assistant should now list 4 tools as available: `process_jd`, `save_jd_snapshot`, `query_evidence`, `rebuild_evidence_index`. See [tools.md](tools.md) for what each one does.

If the tools do not appear, check the Output panel in VS Code for MCP server errors.

---

## Troubleshooting

**`config.json not found`**
Run `cp mcp-server/config.example.json mcp-server/config.json` and fill in your paths.

**`evidencePath is not set in config.json`**
Add an `evidencePath` key to `mcp-server/config.json` pointing at your evidence folder, then run `rebuild_evidence_index`.

**`evidence_index.json not found`**
Run the `rebuild_evidence_index` tool once before calling `query_evidence` for the first time.

**`Cannot find module`**
Run `npm run build` inside `mcp-server/` to recompile after any updates.
