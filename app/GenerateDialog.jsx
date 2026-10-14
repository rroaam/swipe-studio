'use client';

import { useState, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';

export default function GenerateDialog({ onClose, onCreated }) {
  const [url, setUrl] = useState('');
  const [copyOnly, setCopyOnly] = useState(false);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const poll = useRef(null);

  function stop() { if (poll.current) { clearInterval(poll.current); poll.current = null; } }

  async function start(e) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true); setJob(null);
    const r = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim(), copyOnly }),
    });
    const d = await r.json();
    if (!r.ok) { setBusy(false); setJob({ status: 'error', error: d.error, log: [] }); return; }
    stop();
    poll.current = setInterval(async () => {
      const jd = await (await fetch(`/api/job/${d.jobId}`)).json();
      setJob(jd);
      if (jd.status === 'done' || jd.status === 'error') {
        stop(); setBusy(false);
        if (jd.status === 'done') onCreated?.();
      }
    }, 1500);
  }

  const last = job?.log?.[job.log.length - 1];
  const STEPS = copyOnly ? ['fetch', 'analyze', 'copy', 'done'] : ['fetch', 'analyze', 'render', 'done'];
  const curIdx = STEPS.indexOf(job?.step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-lg">
            <Sparkles size={18} className="text-[var(--color-accent)]" /> New deck from URL
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-dim)] transition hover:text-[var(--color-text)]">
            <X size={16} />
          </button>
        </div>
        <p className="mb-4 text-sm text-[var(--color-text-dim)]">
          Paste a saved Instagram post or reel. It fetches, tears it down, and remixes it into ROAM
          {copyOnly ? ' — copy doc only, no render.' : ', then renders the deck.'}
        </p>

        <form onSubmit={start} className="flex flex-col gap-3">
          <input
            type="url" value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy}
            placeholder="https://www.instagram.com/p/…  or  /reel/…"
            className="h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-accent)]/60 disabled:opacity-60"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-dim)] select-none">
            <input type="checkbox" checked={copyOnly} onChange={(e) => setCopyOnly(e.target.checked)} disabled={busy}
              className="h-4 w-4 accent-[var(--color-accent)]" />
            Copy only — extract the copy doc, skip rendering (faster)
          </label>
          <button
            type="submit" disabled={busy || !url.trim()}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] text-sm font-semibold text-black transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {busy ? `working — ${job?.step || 'starting'}…` : (copyOnly ? 'Extract copy' : 'Generate deck')}
          </button>
        </form>

        {job && (
          <div className="mt-4">
            {job.status !== 'error' && (
              <div className="mb-3 flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex flex-1 flex-col items-center gap-1">
                    <div className={`h-1.5 w-full rounded-full ${i <= curIdx ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-2)]'}`} />
                    <span className={`text-[10px] uppercase tracking-wider ${i <= curIdx ? 'text-[var(--color-text-dim)]' : 'text-[var(--color-text-muted)]'}`}>{s}</span>
                  </div>
                ))}
              </div>
            )}
            <div className={`rounded-md border px-3 py-2 text-xs ${
              job.status === 'error'
                ? 'border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                : job.status === 'done'
                  ? 'border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-dim)]'
            }`}>
              {job.status === 'done' ? `✓ ${job.deck} is ready — closing…`
                : job.status === 'error' ? `✗ ${job.error}`
                : (last || 'starting…')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
