import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Config {
  workflowRoot: string;
  evidencePath?: string;
}

let _config: Config | null = null;

export function getConfig(): Config {
  if (_config) return _config;

  const configPath = resolve(__dirname, "../config.json");
  let raw: string;

  try {
    raw = readFileSync(configPath, "utf-8");
  } catch {
    throw new Error(
      `config.json not found at ${configPath}.\n` +
      `Copy mcp-server/config.example.json to mcp-server/config.json and fill in your paths.`
    );
  }

  _config = JSON.parse(raw) as Config;

  if (!_config.workflowRoot) throw new Error("config.json is missing required field: workflowRoot");

  return _config;
}

export function workflowPath(...segments: string[]): string {
  return resolve(getConfig().workflowRoot, ...segments);
}
