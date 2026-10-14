import { DECK_RE } from '../../../../../lib/paths';
import { setReview } from '../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES = ['pending', 'approved', 'needs_work'];

// POST: update review status and/or notes (local state.json or cloud swipe_decks).
export async function POST(req, { params }) {
  const { name } = await params;
  if (!DECK_RE.test(name)) return json({ error: 'bad name' }, 400);
  const body = await req.json().catch(() => ({}));
  if (body.status !== undefined && !STATUSES.includes(body.status)) return json({ error: 'bad status' }, 400);
  try {
    const r = await setReview(name, { status: body.status, notes: body.notes });
    return json(r);
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
