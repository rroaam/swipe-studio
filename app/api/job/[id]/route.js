import { readJob, JOB_RE } from '../../../../lib/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { id } = await params;
  if (!JOB_RE.test(id)) return json({ error: 'bad id' }, 400);
  const job = await readJob(id);
  if (!job) return json({ error: 'not found' }, 404);
  return json(job);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
