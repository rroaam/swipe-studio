import { CAPS } from '../../../lib/store';
import { hasSupabase } from '../../../lib/supa';
import { syncAll } from '../../../lib/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// POST: push all local rendered decks up to Supabase. Local-only.
export async function POST() {
  if (!CAPS.local) return json({ error: 'sync runs from the local dashboard' }, 501);
  if (!hasSupabase()) return json({ error: 'Supabase env not set locally (add to .env.local)' }, 400);
  try {
    const summary = await syncAll();
    return json({ ok: true, summary });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
