import { listDecks, CAPS } from '../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const decks = await listDecks();
    return json({ decks, caps: CAPS });
  } catch (e) {
    return json({ decks: [], caps: CAPS, error: String(e.message || e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
