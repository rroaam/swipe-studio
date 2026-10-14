// Distill a render deck into a plain per-slide copy list (header/body/label/pill),
// stripping the renderer's <br> and <peak> markup. Used for Notion + cloud storage.
function strip(t) {
  return String(t || '').replace(/<br\s*\/?>/gi, ' ').replace(/<\/?peak>/gi, '').replace(/\s+/g, ' ').trim();
}

export function distillCopy(deck) {
  return (deck?.slides || []).map((s, i) => ({
    n: i + 1,
    label: strip(s.label || s.eyebrow || ''),
    header: strip(s.headline || ''),
    body: Array.isArray(s.body) ? s.body.map(strip).filter(Boolean).join(' / ') : strip(s.body || ''),
    pill: strip(s.pill || ''),
  }));
}
