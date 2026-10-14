// Job records for the generate pipeline (fetch → analyze → render).
// One JSON file per job under BUILD_DIR/jobs so status survives across requests.
import { promises as fs } from 'fs';
import path from 'path';
import { JOBS_DIR } from './paths';

export const JOB_RE = /^[a-z0-9_]+$/i;

export async function readJob(id) {
  try {
    return JSON.parse(await fs.readFile(path.join(JOBS_DIR, `${id}.json`), 'utf8'));
  } catch {
    return null;
  }
}

export async function writeJob(job) {
  await fs.mkdir(JOBS_DIR, { recursive: true });
  await fs.writeFile(path.join(JOBS_DIR, `${job.id}.json`), JSON.stringify(job, null, 2));
}
