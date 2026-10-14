// Runtime config: Anthropic key (from env or ~/content-engine/.env) + model + paths.
import { readFileSync } from 'fs';
import path from 'path';
import os from 'os';

export const MODEL = process.env.ROAM_GEN_MODEL || 'claude-sonnet-5';

// Cookie refresh + fetch tool paths (mirror the content-teardown skill).
export const TEARDOWN_VENV_PY = path.join(os.homedir(), '.content-teardown-venv/bin/python');
export const IG_COOKIES = '/tmp/ig_cookies.txt';

export function anthropicKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  // fall back to the content-engine .env (where the key already lives)
  try {
    const envPath = path.join(os.homedir(), 'content-engine/.env');
    const line = readFileSync(envPath, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('ANTHROPIC_API_KEY='));
    if (line) return line.slice('ANTHROPIC_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
  } catch { /* ignore */ }
  return null;
}
