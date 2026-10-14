'use client';

import { useState } from 'react';
import { Check, Images, MessageSquare } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function DeckCard({ deck, onOpen, onChanged }) {
  const [busy, setBusy] = useState(false);

  async function setStatus(status, e) {
    e?.stopPropagation();
    setBusy(true);
    try {
      await fetch(`/api/deck/${deck.name}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      onChanged();
    } finally { setBusy(false); }
  }

  const cover = deck.cover || null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[var(--color-border-hover)]">
      <button
        onClick={onOpen}
        className="relative block aspect-[4/5] w-full overflow-hidden bg-[var(--color-surface-2)] text-left"
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={deck.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]"><Images size={32} /></div>
        )}
        <div className="absolute left-3 top-3"><StatusBadge status={deck.status} /></div>
        {deck.count > 1 && (
          <div className="absolute right-3 top-3 flex h-6 items-center gap-1 rounded-full bg-black/60 px-2 text-[10px] font-semibold text-white backdrop-blur">
            <Images size={11} />{deck.rendered}/{deck.count}
          </div>
        )}
      </button>

      <div className="flex flex-col gap-3 p-4">
        <div>
          <button onClick={onOpen} className="text-left font-display text-base leading-tight hover:underline">
            {deck.title}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1.5 uppercase tracking-wider">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: deck.accentHex }} />
              {deck.accent}
            </span>
            <span>{deck.w}×{deck.h}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => setStatus('approved', e)}
            disabled={busy}
            className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold uppercase tracking-wider transition disabled:opacity-50 ${
              deck.status === 'approved'
                ? 'border-[var(--color-success)] bg-[var(--color-success)]/20 text-[var(--color-success)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:border-[var(--color-success)]/50 hover:text-[var(--color-success)]'
            }`}
          >
            <Check size={13} />Approve
          </button>
          <button
            onClick={(e) => setStatus('needs_work', e)}
            disabled={busy}
            className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold uppercase tracking-wider transition disabled:opacity-50 ${
              deck.status === 'needs_work'
                ? 'border-[var(--color-warning)] bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:border-[var(--color-warning)]/50 hover:text-[var(--color-warning)]'
            }`}
          >
            <MessageSquare size={13} />Needs Work
          </button>
        </div>
      </div>
    </div>
  );
}
