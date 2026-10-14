import { spawn } from 'child_process';
import { openSync } from 'fs';
import path from 'path';
import { writeJob } from '../../../lib/jobs';
import { CAPS } from '../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { url } -> kick off the detached generate worker, return { jobId, name }.
export async function POST(req) {
  if (!CAPS.local) return json({ error: 'generation is local-only' }, 501);
  const body = await req.json().catch(() => ({}));
  const url = (body.url || '').trim();

  if (!/^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv)\//.test(url)) {
    return json({ error: 'paste a public instagram post or reel URL (/p/… or /reel/…)' }, 400);
  }
  const m = url.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  const shortcode = m ? m[1] : String(Date.now());
  const name = ('gen_' + shortcode).replace(/[^a-z0-9_]/gi, '_').toLowerCase().slice(0, 40);
  const jobId = 'job_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const mode = body.copyOnly ? 'copy' : 'full';

  await writeJob({
    id: jobId, url, name, mode, status: 'queued', step: 'queued',
    log: ['[queued] starting worker'], deck: null, error: null,
    startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  const worker = path.join(process.cwd(), 'worker', 'generate.mjs');
  const logFd = openSync(`/tmp/roam-worker-${jobId}.log`, 'a'); // capture crashes
  const child = spawn(process.execPath, [worker, jobId, url, name, mode], {
    cwd: process.cwd(), detached: true, stdio: ['ignore', logFd, logFd],
  });
  child.unref();

  return json({ jobId, name, mode });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
