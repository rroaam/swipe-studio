import { execFile } from 'child_process';
import path from 'path';
import { BUILD_DIR, DECKS_DIR, DECK_RE } from '../../../../../lib/paths';
import { CAPS } from '../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// POST: run `node render.mjs decks/<name>.json` in the build dir, return the log.
export async function POST(_req, { params }) {
  if (!CAPS.local) return json({ error: 'rendering is local-only' }, 501);
  const { name } = await params;
  if (!DECK_RE.test(name)) return json({ error: 'bad name' }, 400);

  const deckRel = path.join('decks', `${name}.json`);
  const result = await new Promise((resolve) => {
    execFile(
      process.execPath, // same node running the dashboard
      ['render.mjs', deckRel],
      { cwd: BUILD_DIR, timeout: 110000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({
          ok: !err,
          code: err?.code ?? 0,
          log: (stdout || '') + (stderr ? '\n' + stderr : ''),
          error: err ? String(err.message || err) : null,
        });
      }
    );
  });

  return json(result, result.ok ? 200 : 500);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
