'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CloudUpload, Columns3, ExternalLink, LayoutGrid, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { BRAND, STATUS_LABEL } from '../lib/brand';
import DeckCard from './DeckCard';
import Board from './Board';
import DeckDetail from './DeckDetail';
import GenerateDialog from './GenerateDialog';

const FILTERS = ['all', 'pending', 'needs_work', 'approved'];

export default function Dashboard() {
  const [decks, setDecks] = useState([]);
  const [caps, setCaps] = useState({});
  const [view, setView] = useState('board');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeName, setActiveName] = useState(null);
  const [genOpen, setGenOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await (await fetch('/api/decks')).json();
      setDecks(d.decks || []); setCaps(d.caps || {});
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function pushCloud() {
    setSyncing(true); setSyncMsg(null);
    try {
      const r = await fetch('/api/sync', { method: 'POST' });
      const j = await r.json();
      setSyncMsg(r.ok ? `synced ${j.summary?.length || 0} decks` : (j.error || 'sync failed'));
    } catch (e) { setSyncMsg(String(e)); }
    finally { setSyncing(false); }
  }

  const filtered = useMemo(
    () => (filter === 'all' ? decks : decks.filter((d) => d.status === filter)),
    [decks, filter],
  );
  const counts = useMemo(() => {
    const c = { all: decks.length, pending: 0, needs_work: 0, approved: 0 };
    for (const d of decks) c[d.status] = (c[d.status] || 0) + 1;
    return c;
  }, [decks]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-accent)] font-display text-lg text-black">{BRAND.markChar}</div>
            <div>
              <div className="font-display text-lg leading-none">{BRAND.name}</div>
              <div className="text-xs text-[var(--color-text-dim)]">{BRAND.subtitle}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={BRAND.social.instagram} target="_blank" rel="noopener noreferrer" title={BRAND.social.instagramTitle}
              className="flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-sm text-[var(--color-text-dim)] transition hover:border-[var(--color-accent)]/60 hover:text-[var(--color-accent)] sm:px-3">
              <ExternalLink size={14} /><span className="hidden sm:inline">Live feed</span>
            </a>
            {caps.local && (
              <a href="/styles"
                className="flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-sm text-[var(--color-text-dim)] transition hover:border-[var(--color-accent)]/60 hover:text-[var(--color-accent)] sm:px-3">
                <Sparkles size={14} /><span className="hidden sm:inline">Motion</span>
              </a>
            )}
            <div className="hidden h-6 w-px bg-[var(--color-border)] sm:block" />
            <button onClick={load} disabled={refreshing} title="Refresh"
              className="flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-sm text-[var(--color-text-dim)] transition hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)] disabled:opacity-50 sm:px-3">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} /><span className="hidden md:inline">Refresh</span>
            </button>
            {caps.sync && (
              <button onClick={pushCloud} disabled={syncing} title={syncMsg || 'Push local decks to the cloud'}
                className="flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-sm text-[var(--color-text-dim)] transition hover:border-[var(--color-accent)]/60 hover:text-[var(--color-accent)] disabled:opacity-50 sm:px-3">
                <CloudUpload size={14} className={syncing ? 'animate-pulse' : undefined} /><span className="hidden md:inline">{syncing ? 'Syncing…' : 'Push to cloud'}</span>
              </button>
            )}
            {caps.local && (
              <button onClick={() => setGenOpen(true)}
                className="flex h-9 items-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-hover)]">
                <Plus size={16} /><span className="hidden sm:inline">New deck</span>
              </button>
            )}
          </div>
        </div>
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-6 pb-3">
          <div className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
            {[{ v: 'board', label: 'Board', icon: Columns3 }, { v: 'grid', label: 'Gallery', icon: LayoutGrid }].map(({ v, label, icon: Icon }) => (
              <button key={v} onClick={() => setView(v)}
                className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
                  view === v ? 'bg-[var(--color-accent)] text-black' : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)]'}`}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>
          {view === 'grid' ? (
            <div className="flex items-center gap-2 overflow-x-auto">
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-xs uppercase tracking-wider transition ${
                    filter === f ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-black'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-dim)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]'}`}>
                  {f === 'all' ? 'All' : STATUS_LABEL[f]}
                  <span className="font-mono text-[10px] opacity-70">{counts[f]}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="hidden items-center gap-3 text-[11px] text-[var(--color-text-muted)] sm:flex">
              <span>Drag cards between columns to change status</span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[400px] animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40" />
            ))}
          </div>
        ) : view === 'board' ? (
          <Board decks={decks} onOpen={setActiveName} onChanged={load} />
        ) : filtered.length === 0 ? (
          <EmptyState onNew={() => setGenOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((deck) => (
              <DeckCard key={deck.name} deck={deck} onOpen={() => setActiveName(deck.name)} onChanged={load} />
            ))}
          </div>
        )}
      </main>

      {activeName && <DeckDetail name={activeName} onClose={() => setActiveName(null)} onChanged={load} />}
      {genOpen && (
        <GenerateDialog
          onClose={() => setGenOpen(false)}
          onCreated={() => { setGenOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function EmptyState({ onNew }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/40 py-24 text-center">
      <div className="font-display text-2xl">No decks here</div>
      <p className="mt-2 max-w-md text-sm text-[var(--color-text-dim)]">Paste a saved post URL to fetch, remix, and render a new ROAM deck.</p>
      <button onClick={onNew} className="mt-6 flex h-10 items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-hover)]">
        <Sparkles size={16} /> New deck from URL
      </button>
    </div>
  );
}
