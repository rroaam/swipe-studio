'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, MessageSquare, RotateCw, Upload, X } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function DeckDetail({ name, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [raw, setRaw] = useState('');
  const [notes, setNotes] = useState('');
  const [ver, setVer] = useState(0);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [notion, setNotion] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const d = await (await fetch(`/api/deck/${name}`)).json();
    setData(d); setRaw(d.raw || ''); setNotes(d.notes || ''); setDirty(false);
  }, [name]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') (lightbox ? setLightbox(null) : onClose()); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, lightbox]);

  const caps = data?.caps || {};
  const bust = (u) => (u.startsWith('/api/') ? `${u}${u.includes('?') ? '&' : '?'}v=${ver}` : u);

  async function setStatus(status) {
    await fetch(`/api/deck/${name}/status`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    setData((p) => ({ ...p, status })); onChanged?.();
  }
  async function saveNotes() {
    await fetch(`/api/deck/${name}/status`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }),
    });
  }
  async function saveAndRender() {
    setBusy(true); setLog({ kind: 'run', text: 'saving…' });
    const s = await fetch(`/api/deck/${name}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }),
    });
    const sj = await s.json();
    if (!s.ok) { setBusy(false); setLog({ kind: 'err', text: sj.error || 'save failed' }); return; }
    setDirty(false); setLog({ kind: 'run', text: 'rendering… (headless chrome)' });
    const r = await fetch(`/api/deck/${name}/render`, { method: 'POST' });
    const rj = await r.json();
    setBusy(false);
    setLog({ kind: r.ok ? 'ok' : 'err', text: (rj.log || rj.error || '').trim() });
    if (r.ok) { setVer((v) => v + 1); load(); onChanged?.(); }
  }
  function copyDoc() {
    const text = (data.copy || []).map((s) =>
      `Slide ${s.n}${s.label ? ` — ${s.label}` : ''}\n` +
      (s.header ? `Header: ${s.header}\n` : '') +
      (s.body ? `Body: ${s.body}\n` : '') +
      (s.pill ? `CTA: ${s.pill}\n` : '')).join('\n');
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }
  async function pushNotion() {
    setNotion({ kind: 'run', text: 'pushing to Notion…' });
    const r = await fetch(`/api/notion/${name}`, { method: 'POST' });
    const j = await r.json();
    setNotion(r.ok ? { kind: 'ok', text: 'added to Carousel Drafts', url: j.url } : { kind: 'err', text: j.error });
  }

  return (
    <div className="fixed inset-0 z-40 flex bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="ml-auto flex h-full w-full max-w-[1180px] flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="font-display text-lg">{name}</div>
            {data && <StatusBadge status={data.status} />}
            {data && <span className="text-xs text-[var(--color-text-muted)]">{data.w}×{data.h} · {data.slides?.length}/{data.count} rendered</span>}
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-dim)] transition hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]"><X size={16} /></button>
        </div>

        {!data ? (
          <div className="flex flex-1 items-center justify-center text-[var(--color-text-muted)]">loading…</div>
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1fr_400px]">
            <div className="scrollbar-thin overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.slides?.map((s) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={s.file} src={bust(s.url)} alt={s.file}
                    onClick={() => setLightbox(bust(s.url))}
                    className="w-full cursor-zoom-in rounded-lg border border-[var(--color-border)] bg-black" />
                ))}
                {(!data.slides || data.slides.length === 0) && <p className="text-sm text-[var(--color-text-muted)]">No slides.</p>}
              </div>
            </div>

            <div className="scrollbar-thin flex flex-col gap-4 overflow-y-auto border-t border-[var(--color-border)] p-6 lg:border-l lg:border-t-0">
              <Section title="Review">
                <div className="flex gap-2">
                  <button onClick={() => setStatus('approved')}
                    className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold uppercase tracking-wider transition ${data.status === 'approved' ? 'border-[var(--color-success)] bg-[var(--color-success)]/20 text-[var(--color-success)]' : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:border-[var(--color-success)]/50 hover:text-[var(--color-success)]'}`}><Check size={13} />Approve</button>
                  <button onClick={() => setStatus('needs_work')}
                    className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold uppercase tracking-wider transition ${data.status === 'needs_work' ? 'border-[var(--color-warning)] bg-[var(--color-warning)]/20 text-[var(--color-warning)]' : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:border-[var(--color-warning)]/50 hover:text-[var(--color-warning)]'}`}><MessageSquare size={13} />Needs Work</button>
                </div>
                {data.status !== 'pending' && <button onClick={() => setStatus('pending')} className="mt-2 h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs text-[var(--color-text-dim)] transition hover:text-[var(--color-text)]">Reset to In Review</button>}
              </Section>

              <Section title="Notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes}
                  placeholder="feedback, what to change…"
                  className="min-h-[64px] w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-sm outline-none focus:border-[var(--color-border-hover)]" />
              </Section>

              {caps.notion && (
                <Section title="Publish">
                  <button onClick={pushNotion} className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]/60 hover:text-[var(--color-accent)]">
                    <Upload size={15} /> Push to Notion Carousel Drafts
                  </button>
                  {notion && (
                    <p className={`mt-2 text-xs ${notion.kind === 'err' ? 'text-[var(--color-danger)]' : notion.kind === 'ok' ? 'text-[var(--color-success)]' : 'text-[var(--color-text-dim)]'}`}>
                      {notion.text}{notion.url && <> · <a href={notion.url} target="_blank" rel="noreferrer" className="underline">open</a></>}
                    </p>
                  )}
                </Section>
              )}

              <Section title={<>Copy {(data.copy?.length || 0) > 0 && <span className="text-[var(--color-text-muted)]">({data.copy.length})</span>} {copied && <span className="text-[var(--color-success)]">• copied</span>}</>}>
                {(data.copy?.length || 0) > 0 && (
                  <button onClick={copyDoc} className="mb-2 h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs text-[var(--color-text-dim)] transition hover:text-[var(--color-text)]">
                    Copy all as text
                  </button>
                )}
                <div className="flex flex-col gap-2">
                  {(data.copy || []).map((s) => (
                    <div key={s.n} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs">
                      <div className="mb-1 font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Slide {s.n}{s.label ? ` · ${s.label}` : ''}</div>
                      {s.header && <div className="font-display text-sm">{s.header}</div>}
                      {s.body && <div className="mt-0.5 text-[var(--color-text-dim)]">{s.body}</div>}
                      {s.pill && <div className="mt-1 inline-block rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-semibold text-black">{s.pill}</div>}
                    </div>
                  ))}
                  {(!data.copy || data.copy.length === 0) && <p className="text-xs text-[var(--color-text-muted)]">No copy captured.</p>}
                </div>
              </Section>

              {caps.local && (
                <Section title={<>Deck JSON {dirty && <span className="text-[var(--color-warning)]">• unsaved</span>}</>}>
                  <textarea value={raw} spellCheck={false} onChange={(e) => { setRaw(e.target.value); setDirty(true); }}
                    className="scrollbar-thin min-h-[240px] w-full rounded-md border border-[var(--color-border)] bg-black p-3 font-mono text-[12px] leading-relaxed outline-none focus:border-[var(--color-border-hover)]" />
                  <button onClick={saveAndRender} disabled={busy}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] text-sm font-semibold text-black transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60">
                    <RotateCw size={15} className={busy ? 'animate-spin' : undefined} />{busy ? 'working…' : (data.slides?.length ? 'Save & re-render' : 'Save & render')}
                  </button>
                  {log && <pre className={`scrollbar-thin mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--color-border)] bg-black p-3 font-mono text-[11px] ${log.kind === 'err' ? 'text-[var(--color-danger)]' : log.kind === 'ok' ? 'text-[var(--color-success)]' : 'text-[var(--color-text-dim)]'}`}>{log.text || '(no output)'}</pre>}
                </Section>
              )}
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/90 p-10" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="preview" className="max-h-[92vh] max-w-[92vw] rounded-lg" />
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{title}</div>
      {children}
    </div>
  );
}
