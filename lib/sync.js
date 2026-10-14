// Local -> cloud sync: upload rendered slide PNGs to Supabase Storage and upsert
// deck rows. Content is pushed; cloud review status/notes are preserved on update.
import { promises as fs } from 'fs';
import path from 'path';
import {
  OUT_DIR, DECKS_DIR, TEARDOWN_DIR, listSlides, readDeck, readState, ACCENTS,
} from './paths';
import { supa, BUCKET, publicUrl } from './supa';
import { distillCopy } from './copy';

async function copyMd(name) {
  try { return await fs.readFile(path.join(TEARDOWN_DIR, 'gen', name, 'COPY.md'), 'utf8'); }
  catch { return null; }
}

export async function syncAll() {
  const db = supa();
  const state = await readState();
  let files = [];
  try { files = await fs.readdir(DECKS_DIR); } catch { /* none */ }
  const names = files.filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => f.replace(/\.json$/, ''));

  const summary = [];
  for (const name of names) {
    let deck;
    try { ({ deck } = await readDeck(name)); } catch { continue; }
    const dd = deck.defaults || {};
    const slideFiles = await listSlides(name);

    // upload each rendered PNG (upsert)
    const slides = [];
    for (const file of slideFiles) {
      const buf = await fs.readFile(path.join(OUT_DIR, name, file));
      const objectPath = `${name}/${file}`;
      const { error } = await db.storage.from(BUCKET).upload(objectPath, buf, {
        contentType: 'image/png', upsert: true,
      });
      if (error) throw new Error(`upload ${objectPath}: ${error.message}`);
      slides.push({ file, url: publicUrl(objectPath) });
    }

    const content = {
      name, title: deck.name || name,
      accent: dd.accent || 'lime', accent_hex: ACCENTS[dd.accent] || '#B5FF4D',
      w: dd.w || 1080, h: dd.h || 1350,
      slide_count: (deck.slides || []).length, rendered: slideFiles.length,
      format: dd.h === 1920 ? 'reel' : 'carousel',
      copy_md: await copyMd(name),
      copy: distillCopy(deck),
      slides, synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };

    // preserve cloud review state on update; seed from local state on first insert
    const { data: existing } = await db.from('swipe_decks').select('name').eq('name', name).maybeSingle();
    if (existing) {
      const { error } = await db.from('swipe_decks').update(content).eq('name', name);
      if (error) throw new Error(`update ${name}: ${error.message}`);
      summary.push({ name, action: 'updated', slides: slides.length });
    } else {
      const st = state.decks?.[name] || {};
      const { error } = await db.from('swipe_decks').insert({
        ...content, status: st.status || 'pending', notes: st.notes || '',
      });
      if (error) throw new Error(`insert ${name}: ${error.message}`);
      summary.push({ name, action: 'created', slides: slides.length });
    }
  }
  return summary;
}
