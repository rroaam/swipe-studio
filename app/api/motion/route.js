import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { CAPS } from '../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MD = path.join(os.homedir(), 'dev/motion-dna');
const SSD = '/Volumes/Extreme SSD/RoamOS';

async function safeList(dir, filter) {
  try { return (await fs.readdir(dir)).filter(filter).sort(); } catch { return []; }
}

// Scan the motion-dna world into one JSON payload for the Styles page.
export async function GET() {
  if (!CAPS.local) return json({ error: 'local only' }, 501);

  // 1. Style library — every MOTION-DNA with keyframes
  const styles = [];
  for (const name of await safeList(path.join(MD, 'out'), () => true)) {
    const dnaPath = path.join(MD, 'out', name, 'MOTION-DNA.md');
    let dna = null;
    try { dna = await fs.readFile(dnaPath, 'utf8'); } catch { continue; }
    const title = (dna.match(/^# MOTION-DNA — (.+)$/m)?.[1] || name).trim();
    const read = (dna.match(/## The one-line read\n([^\n]+)/)?.[1] || '').trim();
    const kfs = (await safeList(path.join(MD, 'work', name), (f) => /^kf_.*\.jpg$/.test(f)))
      .slice(0, 8).map((f) => `/api/media?p=${encodeURIComponent(`md/work/${name}/${f}`)}`);
    styles.push({ name, title, read, kfs, md: dna });
  }

  // 2. Cuts on the SSD
  const cuts = (await safeList(path.join(SSD, 'output'), (f) => f.endsWith('.mp4')))
    .map((f) => ({ name: f.replace('.mp4', ''), url: `/api/media?p=${encodeURIComponent(`ssd/output/${f}`)}` }));

  // 3. Reveal kit assets
  const kit = [];
  for (const f of await safeList(path.join(SSD, 'reveal-kit'), (f) => /^(glimpse_.*\.png|loop_.*\.mp4|boot_reveal\.mp4|sketch_to_screen\.mp4|overlay_demo\.mp4)$/.test(f))) {
    kit.push({ name: f, kind: f.endsWith('.png') ? 'img' : 'video', url: `/api/media?p=${encodeURIComponent(`ssd/reveal-kit/${f}`)}` });
  }

  // 4. Template renders + shoot sheets
  const renders = (await safeList(path.join(MD, 'templates/paper-terminal/out'), (f) => f.endsWith('.mp4')))
    .map((f) => ({ name: f.replace('.mp4', ''), url: `/api/media?p=${encodeURIComponent(`md/templates/paper-terminal/out/${f}`)}` }));
  const sheets = [];
  for (const name of await safeList(path.join(MD, 'out'), () => true)) {
    try {
      const s = await fs.readFile(path.join(MD, 'out', name, 'SHOOT-SHEET.md'), 'utf8');
      sheets.push({ name, md: s });
    } catch { }
  }

  return json({ styles, cuts, kit, renders, sheets, ssdMounted: cuts.length > 0 || kit.length > 0 });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
