import { promises as fs } from 'fs';
import { createReadStream, statSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { CAPS } from '../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Whitelisted media roots (local mode only). p = "md/..." or "ssd/...".
const ROOTS = {
  md: path.join(os.homedir(), 'dev/motion-dna'),
  ssd: '/Volumes/Extreme SSD/RoamOS',
};
const MIME = { '.mp4': 'video/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webm': 'video/webm', '.md': 'text/markdown' };

export async function GET(req) {
  if (!CAPS.local) return new Response('local only', { status: 501 });
  const p = new URL(req.url).searchParams.get('p') || '';
  const [rootKey, ...rest] = p.split('/');
  const root = ROOTS[rootKey];
  const rel = rest.join('/');
  if (!root || !rel || rel.includes('..')) return new Response('bad path', { status: 400 });
  const full = path.join(root, rel);
  if (!full.startsWith(root + path.sep) || !existsSync(full)) return new Response('not found', { status: 404 });

  const ext = path.extname(full).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const size = statSync(full).size;
  const range = req.headers.get('range');

  // range support so <video> can scrub
  if (range && type.startsWith('video/')) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    const start = +m[1];
    const end = m[2] ? +m[2] : Math.min(start + (1 << 20), size - 1);
    const stream = createReadStream(full, { start, end });
    return new Response(stream, {
      status: 206,
      headers: {
        'Content-Type': type, 'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1),
      },
    });
  }
  const buf = await fs.readFile(full);
  return new Response(buf, { headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
}
