import { promises as fs } from 'fs';
import path from 'path';
import { OUT_DIR, DECK_RE, PNG_RE } from '../../../lib/paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Serves rendered slide PNGs (which live outside /public) with path validation.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const deck = searchParams.get('deck') || '';
  const file = searchParams.get('file') || '';
  if (!DECK_RE.test(deck) || !PNG_RE.test(file)) {
    return new Response('bad request', { status: 400 });
  }
  const full = path.join(OUT_DIR, deck, file);
  if (!full.startsWith(OUT_DIR + path.sep)) {
    return new Response('forbidden', { status: 403 });
  }
  try {
    const buf = await fs.readFile(full);
    return new Response(buf, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store', // re-renders must show immediately
      },
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
