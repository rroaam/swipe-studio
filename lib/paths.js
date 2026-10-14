// Central filesystem wiring. The dashboard reads/writes the local teardown build dir.
import { promises as fs } from 'fs';
import path from 'path';

export const TEARDOWN_DIR = process.env.ROAM_TEARDOWN_DIR
  || '/Users/ryanrosenthal/teardown-in';
export const BUILD_DIR = process.env.ROAM_BUILD_DIR || path.join(TEARDOWN_DIR, 'build');
export const DECKS_DIR = path.join(BUILD_DIR, 'decks');
export const OUT_DIR = path.join(BUILD_DIR, 'out');
export const STATE_FILE = path.join(BUILD_DIR, 'state.json');
export const JOBS_DIR = path.join(BUILD_DIR, 'jobs');   // job status files
export const GEN_DIR = path.join(TEARDOWN_DIR, 'gen');  // fetched assets for generated decks

export const DECK_RE = /^[a-z0-9_]+$/i;      // safe deck name
export const PNG_RE = /^[a-z0-9_]+\.png$/i;  // safe slide filename

// ROAM accent tokens -> hex (mirror render.mjs)
export const ACCENTS = {
  lime: '#B5FF4D', cyan: '#00D4FF', purple: '#CF6EFF', red: '#FF3300',
};

export async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  } catch {
    return { decks: {} };
  }
}

export async function writeState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

// List rendered slide PNGs for a deck, sorted, excluding the _contact sheet.
export async function listSlides(name) {
  const dir = path.join(OUT_DIR, name);
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((f) => PNG_RE.test(f) && f.startsWith('slide_'))
      .sort();
  } catch {
    return [];
  }
}

// Read + parse a deck JSON. Returns { raw, deck } or throws.
export async function readDeck(name) {
  const raw = await fs.readFile(path.join(DECKS_DIR, `${name}.json`), 'utf8');
  return { raw, deck: JSON.parse(raw) };
}

// Summaries for the home grid.
export async function listDecks() {
  let files = [];
  try { files = await fs.readdir(DECKS_DIR); } catch { return []; }
  const state = await readState();
  const names = files
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => f.replace(/\.json$/, ''));

  const out = [];
  for (const name of names) {
    let deck = {};
    try { ({ deck } = await readDeck(name)); } catch { continue; }
    const d = deck.defaults || {};
    const slides = await listSlides(name);
    const st = state.decks?.[name] || {};
    out.push({
      name,
      title: deck.name || name,
      count: (deck.slides || []).length,
      rendered: slides.length,
      w: d.w || 1080,
      h: d.h || 1350,
      accent: d.accent || 'lime',
      accentHex: ACCENTS[d.accent] || '#B5FF4D',
      status: st.status || 'pending',
      updatedAt: st.updatedAt || null,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
