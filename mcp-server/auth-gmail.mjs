// Run once to (re)authorize Gmail + Sheets access: node auth-gmail.mjs
// Opens a browser, you approve, and it writes a fresh gmail-token.json

import { createServer } from "http";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import { exec } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CREDS_PATH = resolve(__dirname, "credentials.json");
const TOKEN_PATH = resolve(__dirname, "gmail-token.json");
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
];
const PORT = 3456;
const REDIRECT = `http://localhost:${PORT}`;

const creds = JSON.parse(readFileSync(CREDS_PATH, "utf-8"));
const { client_id, client_secret } = creds.installed;

const auth = new google.auth.OAuth2(client_id, client_secret, REDIRECT);

const url = auth.generateAuthUrl({ access_type: "offline", scope: SCOPES, prompt: "consent" });

console.log("Opening browser for Gmail authorization...");
exec(`start "" "${url}"`);

const server = createServer(async (req, res) => {
  const code = new URL(req.url, REDIRECT).searchParams.get("code");
  if (!code) { res.end("No code."); return; }

  const { tokens } = await auth.getToken(code);
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log("gmail-token.json written successfully.");

  res.end("<h2>Authorization complete. You can close this tab.</h2>");
  server.close();
});

server.listen(PORT, () => console.log(`Waiting for redirect on http://localhost:${PORT} ...`));
