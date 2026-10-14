import { DECK_RE } from '../../../../lib/paths';
import { getDeck } from '../../../../lib/store';
import { pushToNotion } from '../../../../lib/notion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST: push this deck to the Notion Carousel Drafts DB. Works in both modes.
export async function POST(_req, { params }) {
  const { name } = await params;
  if (!DECK_RE.test(name)) return json({ error: 'bad name' }, 400);
  try {
    const deck = await getDeck(name);
    if (deck.error) return json({ error: deck.error }, 404);
    const r = await pushToNotion(deck);
    return json({ ok: true, ...r });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
