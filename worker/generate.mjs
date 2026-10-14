// Phase 2 pipeline worker (standalone, run detached by /api/generate):
//   node worker/generate.mjs <jobId> <url> <deckName>
// paste link -> fetch (Arc cookies) -> Claude teardown+ROAM remix -> deck JSON -> render.
// Self-contained (no lib/*.js imports): the standalone `node` worker can't load
// the app's ESM-syntax .js files since package.json has no "type":"module".
import { promises as fs, readFileSync } from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import Anthropic from '@anthropic-ai/sdk';

const pexec = promisify(execFile);

const HOME = os.homedir();
const TEARDOWN_DIR = process.env.ROAM_TEARDOWN_DIR || path.join(HOME, 'teardown-in');
const BUILD_DIR = process.env.ROAM_BUILD_DIR || path.join(TEARDOWN_DIR, 'build');
const DECKS_DIR = path.join(BUILD_DIR, 'decks');
const GEN_DIR = path.join(TEARDOWN_DIR, 'gen');
const JOBS_DIR = path.join(BUILD_DIR, 'jobs');
const MODEL = process.env.ROAM_GEN_MODEL || 'claude-sonnet-5';
const TEARDOWN_VENV_PY = path.join(HOME, '.content-teardown-venv/bin/python');
const IG_COOKIES = '/tmp/ig_cookies.txt';

async function writeJob(j) {
  await fs.mkdir(JOBS_DIR, { recursive: true });
  await fs.writeFile(path.join(JOBS_DIR, `${j.id}.json`), JSON.stringify(j, null, 2));
}
function anthropicKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const line = readFileSync(path.join(HOME, 'content-engine/.env'), 'utf8')
      .split('\n').find((l) => l.startsWith('ANTHROPIC_API_KEY='));
    if (line) return line.slice('ANTHROPIC_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
  } catch { /* ignore */ }
  return null;
}
const [, , jobId, url, name, mode = 'full'] = process.argv; // mode: 'full' | 'copy'

const job = {
  id: jobId, url, name, status: 'running', step: 'start',
  log: [], deck: null, error: null,
  startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};
async function push(step, msg) {
  job.step = step;
  if (msg) job.log.push(`[${step}] ${msg}`);
  job.updatedAt = new Date().toISOString();
  await writeJob(job);
}
async function fail(msg) {
  job.status = 'error'; job.error = msg; job.updatedAt = new Date().toISOString();
  job.log.push(`[error] ${msg}`);
  await writeJob(job);
  process.exit(1);
}

const isReel = /\/(reel|reels|tv)\//.test(url);
const kind = isReel ? 'reel' : 'carousel';
const assetDir = path.join(GEN_DIR, name);

// ---- ROAM system prompt: teardown -> remix -> deck JSON (render.mjs schema) ----
const SYS = `You are ROAM's content-remix engine. You receive a saved Instagram ${kind} (as images${isReel ? ' = keyframes, plus a transcript' : ' = carousel slides in order'}). You reverse-engineer its STRUCTURAL mechanic (hook type, retention move, slide/beat roles, CTA), then rebuild it as a brand-new ${kind} in ROAM's system. Never copy the source copy or design verbatim — borrow the mechanics, rewrite everything.

ROAM DESIGN TOKENS
base #111111 · off-white #F5F2ED · paper #EDE7DB · Archivo Black (display) / Archivo (body) / JetBrains Mono (source-doc cards)
accents: lime #B5FF4D · cyan #00D4FF · purple #CF6EFF · red #FF3300 — pick ONE accent for the whole deck and guard it.

ROAM COPY VOICE
lowercase by default · one thought per line · exactly one ALL-CAPS peak moment in the whole piece · no em dashes · parenthetical asides ok · open endings, don't wrap clean · short fragments over sentences.

OUTPUT: a single JSON object (a "deck") for ROAM's renderer. NOTHING else — no markdown, no prose. Schema:
{
  "name": "${name}",
  "defaults": { "w": ${isReel ? 1080 : 1080}, "h": ${isReel ? 1920 : 1350}, "accent": "lime|cyan|purple|red", "footer": "r0am · ${isReel ? 'reel' : 'swipe'}" },
  "slides": [ { <slide> }, ... ]   // ${isReel ? '6 caption frames' : '7-11 slides'}
}
Slide fields (all optional, mix as needed):
  "eyebrow": "small kicker in accent, UPPERCASE ok"
  "label": "TWO WORD chapter label in accent (manifesto TOC style)"
  "headline": "Archivo Black. use <br> for line breaks and <peak>word</peak> to color ONE moment in the accent"
  "headlineSize": 84-128 (bigger = fewer words; keep long headlines <= 96)
  "upper": true  // uppercase the headline
  "headlineFont": "mono"  // JetBrains Mono, for a verbatim source-doc card (pair with bg:"paper", fg:"#111111")
  "body": ["line one", "line two"]  // Archivo; <peak> works here too
  "pill": "comment BUILD"  // accent CTA chip
  "bg": "paper", "fg": "#111111"  // light card override (rotate in for variety / source docs)
  "accent": "cyan"  // per-slide override (rarely)
  "align": "center|left|bottom"
  "pageMark": "03"  // small counter, for locked catalog frames
Rules:
- Keep the source's slide/beat ROLES and order (hook -> ... -> cta) but express them as ROAM.
- First slide = the scroll-stopping hook. Last slide = CTA or bookend.
- Use exactly one <peak> accent moment per slide at most, and one ALL-CAPS peak across the whole deck.
- Choose the accent by mood: lime (build/tools/energy), cyan (news/tech), purple (manifesto/category), red (bold/critique).
Return ONLY the JSON object.`;

async function refreshCookies() {
  const py = `import browser_cookie3 as bc3
from http.cookiejar import MozillaCookieJar
cj = bc3.arc(domain_name="instagram.com")
jar = MozillaCookieJar()
[jar.set_cookie(c) for c in cj]
jar.save("${IG_COOKIES}", ignore_discard=True, ignore_expires=True)
print("sessionid" if any(c.name=="sessionid" for c in cj) else "NOSESSION")`;
  try {
    const { stdout } = await pexec(TEARDOWN_VENV_PY, ['-c', py], { timeout: 30000 });
    if (/NOSESSION/.test(stdout)) await push('fetch', 'warning: no IG sessionid in Arc — fetch may 302 to login');
    else await push('fetch', 'Arc IG cookies refreshed');
  } catch (e) {
    await push('fetch', 'cookie refresh failed (' + (e.message || e) + ') — trying fetch anyway');
  }
}

async function fetchCarousel() {
  await fs.mkdir(assetDir, { recursive: true });
  await pexec('gallery-dl', [
    '--cookies', IG_COOKIES, '-D', assetDir, '-f', 'slide_{num:02}.{extension}', url,
  ], { timeout: 120000, maxBuffer: 8 << 20 });
  const files = (await fs.readdir(assetDir)).filter((f) => /^slide_\d+\.(jpg|jpeg|png|webp)$/i.test(f)).sort();
  if (!files.length) throw new Error('no slides fetched (private post, or Arc session expired → re-login to IG in Arc)');
  return files.map((f) => path.join(assetDir, f));
}

async function fetchReel() {
  await fs.mkdir(assetDir, { recursive: true });
  const mp4 = path.join(assetDir, 'reel.mp4');
  await pexec('yt-dlp', ['--cookies', IG_COOKIES, url, '-o', mp4], { timeout: 120000, maxBuffer: 8 << 20 });
  // keyframes every 2s
  await pexec('ffmpeg', ['-y', '-i', mp4, '-vf', 'fps=1/2', path.join(assetDir, 'frame_%03d.png')], { timeout: 60000, maxBuffer: 8 << 20 });
  // transcript (best-effort)
  let transcript = '';
  try {
    await pexec('whisper-ctranslate2', [mp4, '--model', 'small', '--language', 'en', '--output_format', 'txt', '--output_dir', assetDir], { timeout: 300000, maxBuffer: 8 << 20 });
    const txt = (await fs.readdir(assetDir)).find((f) => f.endsWith('.txt'));
    if (txt) transcript = await fs.readFile(path.join(assetDir, txt), 'utf8');
    await push('fetch', 'transcript captured');
  } catch {
    await push('fetch', 'transcript skipped (whisper unavailable) — using keyframes only');
  }
  const frames = (await fs.readdir(assetDir)).filter((f) => /^frame_\d+\.png$/.test(f)).sort();
  if (!frames.length) throw new Error('no keyframes extracted from reel');
  return { frames: frames.map((f) => path.join(assetDir, f)), transcript };
}

// evenly sample up to n images
function sample(arr, n) {
  if (arr.length <= n) return arr;
  const step = (arr.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => arr[Math.round(i * step)]);
}

async function toImageBlocks(files) {
  const blocks = [];
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    const media = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    const data = (await fs.readFile(f)).toString('base64');
    blocks.push({ type: 'image', source: { type: 'base64', media_type: media, data } });
  }
  return blocks;
}

function extractJson(text) {
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{'); const b = t.lastIndexOf('}');
  if (a === -1 || b === -1) throw new Error('model returned no JSON');
  return JSON.parse(t.slice(a, b + 1));
}

// distill a deck into a readable per-slide copy doc (header/body/label/pill)
const strip = (s) => String(s || '').replace(/<br\s*\/?>/gi, ' ').replace(/<\/?peak>/gi, '').replace(/\s+/g, ' ').trim();
async function writeCopyMd(deck) {
  const lines = [`# Copy Doc — ${deck.name}`, `source: ${url} · ${deck.slides.length} slides · ${kind}`, ''];
  deck.slides.forEach((s, i) => {
    const label = strip(s.label || s.eyebrow);
    lines.push(`**Slide ${i + 1}${label ? ` — ${label}` : ''}**`);
    if (s.headline) lines.push(`- header: ${strip(s.headline)}`);
    const body = Array.isArray(s.body) ? s.body.map(strip).filter(Boolean).join(' / ') : strip(s.body);
    if (body) lines.push(`- body: ${body}`);
    if (s.pill) lines.push(`- cta: ${strip(s.pill)}`);
    lines.push('');
  });
  await fs.mkdir(path.join(GEN_DIR, name), { recursive: true });
  await fs.writeFile(path.join(GEN_DIR, name, 'COPY.md'), lines.join('\n'));
}

async function main() {
  await writeJob(job);
  const key = anthropicKey();
  if (!key) return fail('no ANTHROPIC_API_KEY (set it, or add to ~/content-engine/.env)');

  // 1. FETCH
  await push('fetch', `${kind} · refreshing cookies`);
  await refreshCookies();
  let images, transcript = '';
  try {
    if (isReel) { const r = await fetchReel(); images = r.frames; transcript = r.transcript; }
    else images = await fetchCarousel();
  } catch (e) { return fail('fetch failed: ' + (e.message || e)); }
  await push('fetch', `pulled ${images.length} ${isReel ? 'keyframes' : 'slides'}`);

  // 2. ANALYZE + REMIX (Claude vision)
  await push('analyze', `sending to ${MODEL}…`);
  const picked = sample(images, isReel ? 8 : 12);
  const blocks = await toImageBlocks(picked);
  const userText = `Here is the saved ${kind} (${images.length} ${isReel ? 'keyframes sampled' : 'slides'}, in order).` +
    (transcript ? `\n\nTRANSCRIPT (spoken audio):\n${transcript.slice(0, 4000)}` : '') +
    `\n\nTear it down and rebuild it as a ROAM ${kind}. Return ONLY the deck JSON.`;

  const client = new Anthropic({ apiKey: key });
  let deck;
  try {
    const resp = await client.messages.create({
      model: MODEL, max_tokens: 4096,
      system: SYS,
      messages: [{ role: 'user', content: [...blocks, { type: 'text', text: userText }] }],
    });
    const textBlock = resp.content.find((c) => c.type === 'text');
    deck = extractJson(textBlock?.text || '');
  } catch (e) { return fail('analyze failed: ' + (e.message || e)); }

  // enforce invariants
  deck.name = name;
  deck.defaults = deck.defaults || {};
  deck.defaults.w = 1080;
  deck.defaults.h = isReel ? 1920 : 1350;
  if (!deck.defaults.footer) deck.defaults.footer = isReel ? 'r0am · reel' : 'r0am · swipe';
  if (!Array.isArray(deck.slides) || deck.slides.length < 3) return fail('model produced too few slides');
  await push('analyze', `remix authored — ${deck.slides.length} slides, accent ${deck.defaults.accent || 'lime'}`);

  await fs.mkdir(DECKS_DIR, { recursive: true });
  await fs.writeFile(path.join(DECKS_DIR, `${name}.json`), JSON.stringify(deck, null, 2));
  await writeCopyMd(deck); // every run gets a readable copy doc

  // 3. RENDER (skipped in copy-only mode)
  if (mode === 'copy') {
    await push('copy', 'copy extracted (no render)');
  } else {
    await push('render', 'rendering slides…');
    try {
      const { stdout } = await pexec(process.execPath, ['render.mjs', path.join('decks', `${name}.json`)],
        { cwd: BUILD_DIR, timeout: 120000, maxBuffer: 4 << 20 });
      await push('render', stdout.trim().split('\n').slice(-2).join(' '));
    } catch (e) { return fail('render failed: ' + (e.message || e)); }
  }

  job.status = 'done'; job.deck = name; job.step = 'done';
  job.updatedAt = new Date().toISOString();
  job.log.push(mode === 'copy' ? '[done] copy doc ready' : '[done] deck ready in the grid');
  await writeJob(job);
}

main().catch((e) => fail(String(e.stack || e.message || e)));
