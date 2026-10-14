// Dual-mode data layer. Local (fs) = the generator/engine; cloud (supabase) =
// the hosted review surface. API routes call these instead of touching fs/db directly.
import { promises as fs } from 'fs';
import path from 'path';
import {
  DECKS_DIR, listDecks as fsListDecks, readDeck, listSlides, readState, writeState, ACCENTS,
} from './paths';
import { CLOUD, hasSupabase, supa } from './supa';
import { distillCopy } from './copy';
import { notionConfigured } from './notion';

export const MODE = CLOUD ? 'cloud' : 'fs';
export const CAPS = { local: MODE === 'fs', cloud: MODE === 'cloud', notion: notionConfigured(), sync: MODE === 'fs' && hasSupabase() };

// ---- shared shape: { name,title,status,notes,accent,accentHex,w,h,count,rendered,format,cover,slides:[{file,url}] } ----

export async function listDecks() {
  if (MODE === 'cloud') {
    const { data, error } = await supa().from('swipe_decks').select('*').order('name');
    if (error) throw error;
    return (data || []).map(rowToDeck);
  }
  // fs: augment the filesystem summaries with slide urls served by /api/img
  const decks = await fsListDecks();
  return decks.map((d) => {
    const slides = Array.from({ length: d.rendered }, (_, i) => {
      const file = `slide_${String(i + 1).padStart(2, '0')}.png`;
      return { file, url: `/api/img?deck=${d.name}&file=${file}` };
    });
    return { ...d, format: d.h === 1920 ? 'reel' : 'carousel', cover: slides[0]?.url || null, slides };
  });
}

export async function getDeck(name) {
  if (MODE === 'cloud') {
    const { data, error } = await supa().from('swipe_decks').select('*').eq('name', name).maybeSingle();
    if (error) throw error;
    if (!data) return { error: 'not found' };
    const d = rowToDeck(data);
    return { ...d, raw: null, copy_md: data.copy_md || null, copy: Array.isArray(data.copy) ? data.copy : [] };
  }
  const { raw, deck } = await readDeck(name);
  const files = await listSlides(name);
  const state = await readState();
  const st = state.decks?.[name] || {};
  const dd = deck.defaults || {};
  const slides = files.map((file) => ({ file, url: `/api/img?deck=${name}&file=${file}` }));
  return {
    name, raw, slides, cover: slides[0]?.url || null,
    count: (deck.slides || []).length, rendered: files.length,
    accent: dd.accent || 'lime', accentHex: ACCENTS[dd.accent] || '#B5FF4D',
    w: dd.w || 1080, h: dd.h || 1350, format: (dd.h === 1920 ? 'reel' : 'carousel'),
    status: st.status || 'pending', notes: st.notes || '',
    copy_md: await readCopyMd(name), copy: distillCopy(deck),
  };
}

export async function setReview(name, { status, notes }) {
  if (MODE === 'cloud') {
    const patch = { updated_at: new Date().toISOString() };
    if (status !== undefined) patch.status = status;
    if (notes !== undefined) patch.notes = String(notes);
    const { error } = await supa().from('swipe_decks').update(patch).eq('name', name);
    if (error) throw error;
    return { ok: true };
  }
  const state = await readState();
  if (!state.decks) state.decks = {};
  const cur = state.decks[name] || {};
  if (status !== undefined) cur.status = status;
  if (notes !== undefined) cur.notes = String(notes);
  cur.updatedAt = new Date().toISOString();
  state.decks[name] = cur;
  await writeState(state);
  return { ok: true, status: cur.status || 'pending', notes: cur.notes || '' };
}

function rowToDeck(r) {
  const slides = Array.isArray(r.slides) ? r.slides : [];
  return {
    name: r.name, title: r.title || r.name, status: r.status || 'pending', notes: r.notes || '',
    accent: r.accent || 'lime', accentHex: r.accent_hex || '#B5FF4D',
    w: r.w || 1080, h: r.h || 1350, count: r.slide_count || slides.length, rendered: r.rendered || slides.length,
    format: r.format || 'carousel', cover: slides[0]?.url || null, slides,
  };
}

async function readCopyMd(name) {
  // gen_ decks may carry a COPY.md alongside their fetched assets.
  const p = path.join(process.env.ROAM_TEARDOWN_DIR || '/Users/ryanrosenthal/teardown-in', 'gen', name, 'COPY.md');
  try { return await fs.readFile(p, 'utf8'); } catch { return null; }
}
