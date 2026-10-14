import { promises as fs } from 'fs';
import path from 'path';
import { DECKS_DIR, DECK_RE } from '../../../../lib/paths';
import { getDeck, CAPS } from '../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: deck detail (slides+urls, status, notes, meta). Works in both modes.
export async function GET(_req, { params }) {
  const { name } = await params;
  if (!DECK_RE.test(name)) return json({ error: 'bad name' }, 400);
  try {
    const d = await getDeck(name);
    return json({ ...d, caps: CAPS });
  } catch (e) {
    return json({ error: String(e.message || e) }, 404);
  }
}

// POST: save edited deck JSON — LOCAL ONLY (edits the source file the renderer reads).
export async function POST(req, { params }) {
  if (!CAPS.local) return json({ error: 'editing is local-only' }, 501);
  const { name } = await params;
  if (!DECK_RE.test(name)) return json({ error: 'bad name' }, 400);
  const body = await req.json().catch(() => null);
  if (!body || typeof body.raw !== 'string') return json({ error: 'missing raw' }, 400);
  try { JSON.parse(body.raw); } catch (e) { return json({ error: 'invalid JSON: ' + e.message }, 422); }
  const file = path.join(DECKS_DIR, `${name}.json`);
  try { await fs.access(file); } catch { return json({ error: 'deck not found' }, 404); }
  await fs.writeFile(file, body.raw);
  return json({ ok: true });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
