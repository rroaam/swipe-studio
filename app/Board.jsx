'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Images, Inbox, Send } from 'lucide-react';

const COLUMNS = [
  { key: 'pending', title: 'In Review', hint: 'Awaiting review', accent: 'text-[var(--color-warning)]' },
  { key: 'needs_work', title: 'Needs Work', hint: 'Flagged for edits', accent: 'text-[var(--color-warning)]' },
  { key: 'approved', title: 'Approved', hint: 'Ready to publish', accent: 'text-[var(--color-success)]', priority: true },
];

export default function Board({ decks, onOpen, onChanged }) {
  const [items, setItems] = useState(decks);
  useEffect(() => setItems(decks), [decks]);
  const [dragging, setDragging] = useState(false);
  const [overCol, setOverCol] = useState(null);

  const byCol = useMemo(() => {
    const m = { pending: [], needs_work: [], approved: [] };
    for (const d of items) (m[d.status] || m.pending).push(d);
    return m;
  }, [items]);

  async function moveTo(name, status) {
    const cur = items.find((d) => d.name === name);
    if (!cur || cur.status === status) return;
    setItems((prev) => prev.map((d) => (d.name === name ? { ...d, status } : d))); // optimistic
    try {
      await fetch(`/api/deck/${name}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      onChanged();
    } catch { setItems(decks); }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {COLUMNS.map((col) => {
        const list = byCol[col.key];
        const isOver = overCol === col.key;
        return (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOverCol(col.key); }}
            onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
            onDrop={(e) => {
              e.preventDefault(); setOverCol(null);
              const name = e.dataTransfer.getData('text/deck');
              if (name) moveTo(name, col.key);
            }}
            className={`flex flex-col rounded-xl border bg-[var(--color-surface)]/40 transition ${
              isOver ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                : col.priority ? 'border-[var(--color-success)]/30' : 'border-[var(--color-border)]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3.5 py-3">
              <div className="flex items-center gap-2">
                {col.priority && <Send size={13} className="text-[var(--color-success)]" />}
                <div>
                  <div className={`font-display text-sm ${col.priority ? col.accent : ''}`}>{col.title}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{col.hint}</div>
                </div>
              </div>
              <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums ${
                col.priority ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'
              }`}>{list.length}</span>
            </div>

            <div className="scrollbar-thin flex max-h-[calc(100vh-260px)] min-h-[200px] flex-col gap-2 overflow-y-auto p-2.5">
              {list.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] py-10 text-center text-[var(--color-text-muted)]">
                  <Inbox size={20} />
                  <span className="text-[11px]">{dragging ? 'Drop to move here' : 'Nothing here'}</span>
                </div>
              ) : list.map((deck) => (
                <BoardCard key={deck.name} deck={deck} onOpen={() => onOpen(deck.name)}
                  onDragState={setDragging} onApprove={() => moveTo(deck.name, 'approved')} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardCard({ deck, onOpen, onDragState, onApprove }) {
  const cover = deck.cover || null;
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/deck', deck.name); e.dataTransfer.effectAllowed = 'move'; onDragState(true); }}
      onDragEnd={() => onDragState(false)}
      onClick={onOpen}
      className="group relative flex cursor-pointer gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 transition hover:border-[var(--color-border-hover)] active:cursor-grabbing"
    >
      <div className="relative h-[78px] w-[62px] shrink-0 overflow-hidden rounded-md bg-[var(--color-surface-2)]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={deck.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]"><Images size={18} /></div>
        )}
        <div className="absolute bottom-1 right-1 flex h-4 items-center gap-0.5 rounded bg-black/70 px-1 text-[9px] font-semibold text-white">
          <Images size={8} />{deck.rendered}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="line-clamp-2 pr-2 font-display text-[13px] leading-tight">{deck.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: deck.accentHex }} />{deck.accent}
          </span>
          <span>{deck.w}×{deck.h}</span>
        </div>
        <div className="mt-auto flex items-center gap-1 pt-1.5 opacity-0 transition group-hover:opacity-100">
          {deck.status !== 'approved' && (
            <button
              onClick={(e) => { e.stopPropagation(); onApprove(); }}
              title="Approve"
              className="flex h-6 items-center gap-1 rounded border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-success)] transition hover:bg-[var(--color-success)]/20"
            >
              <Check size={11} /> Approve
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
