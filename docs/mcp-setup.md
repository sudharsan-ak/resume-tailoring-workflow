# MCP Server Setup

This guide walks you through setting up the `mcp-server/` so any MCP-compatible AI assistant (Claude Code, Codex, or other) can call the workflow tools directly.

## Prerequisites

- Node.js 18 or later — [download](https://nodejs.org/)
- LaTeX installed locally (MiKTeX on Windows, TeX Live on macOS/Linux) — see [latex-setup.md](latex-setup.md)
- A Google Cloud project with the Gmail API enabled (for `create_draft` only — skip if you do not need outreach drafts)

---

## Step 1 — Install and build

```bash
cd mcp-server
npm install
npm run build
```

This compiles the TypeScript source to `mcp-server/dist/`. You only need to run this once, or again after pulling updates.

---

## Step 2 — Create your config file

Copy the example config and fill in your local paths:

```bash
cp mcp-server/config.example.json mcp-server/config.json
```

Edit `mcp-server/config.json`:

```json
{
  "workflowRoot": "C:/path/to/your/resume-tailoring-workflow",
  "gmailCredentialsPath": "C:/path/to/your/gmail-credentials.json",
  "gmailTokenPath": "C:/path/to/your/gmail-token.json"
}
```

- `workflowRoot`: absolute path to the root of this cloned repository on your machine
- `gmailCredentialsPath`: path to your Google OAuth credentials file (see Step 3)
- `gmailTokenPath`: path where your OAuth token will be stored after first auth (see Step 3)

`config.json` is gitignored and stays local.

---

## Step 3 — Gmail OAuth setup (optional — only for create_draft)

Skip this step if you do not plan to use the `create_draft` tool.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Gmail API** for the project
4. Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**
5. Application type: **Desktop app**
6. Download the credentials JSON and save it to the path you set in `gmailCredentialsPath`
7. Run the one-time auth flow:

```bash
cd mcp-server
node dist/auth-gmail.js
```

This opens a browser window for you to authorize Gmail access. After authorizing, a token file is saved to `gmailTokenPath`. You will not need to repeat this unless the token expires.

> The scopes requested are: `gmail.compose` only. The server can create drafts but cannot read, send, or delete your email.

---

## Step 4 — Register the MCP server in your AI assistant

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

Add the MCP server under your Codex MCP configuration. The exact location depends on your Codex extension version — look for an `mcpServers` or `tools` section in Codex settings:

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

## Step 5 — Verify the server is running

Restart your VS Code window after updating settings. In the Claude Code or Codex sidebar, the AI assistant should now list these tools as available:

- `process_jd` — process a JD from text, URL, or JD Text.md
- `search_roles` — search for fresh job postings
- `update_tracker` — append scored roles to the fit check table
- `compile_resume` — compile a .tex file to PDF
- `create_draft` — create a Gmail outreach draft

If the tools do not appear, check the Output panel in VS Code for MCP server errors.

---

## Troubleshooting

**`config.json not found`**
Run `cp mcp-server/config.example.json mcp-server/config.json` and fill in your paths.

**`LaTeX compilation failed`**
Make sure MiKTeX or TeX Live is installed and `pdflatex` is in your PATH. Run `pdflatex --version` in a terminal to confirm.

**`Gmail token not found`**
Run the auth flow: `node mcp-server/dist/auth-gmail.js`

**`Cannot find module`**
Run `npm run build` inside `mcp-server/` to recompile after any updates.
