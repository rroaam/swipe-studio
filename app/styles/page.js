'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clapperboard, Film, Layers, ScrollText, Sparkles, X } from 'lucide-react';

export default function StylesPage() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);   // {title, md}
  const [play, setPlay] = useState(null);   // video url

  useEffect(() => { fetch('/api/motion').then((r) => r.json()).then(setData); }, []);

  if (!data) return <div className="mx-auto max-w-[1500px] px-6 py-10 text-[var(--color-text-muted)]">loading the library…</div>;
  if (data.error || !data.styles) return (
    <div className="mx-auto max-w-[1500px] px-6 py-10 text-sm text-[var(--color-text-muted)]">
      The Motion Library reads local files (motion-dna + the SSD) — open it on the studio Mac at <span className="text-[var(--color-text)]">localhost:4310/styles</span>.
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-6 py-4">
          <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-dim)] transition hover:text-[var(--color-text)]"><ArrowLeft size={15} /></Link>
          <div>
            <div className="font-display text-lg leading-none">Motion Library</div>
            <div className="text-xs text-[var(--color-text-dim)]">{data.styles.length} decoded styles · {data.cuts.length} cuts · {data.kit.length} reveal assets{!data.ssdMounted && ' · ⚠ SSD not mounted'}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-12 px-6 py-8">

        {/* ===== style DNA library ===== */}
        <section>
          <SectionHead icon={Layers} title="Style DNA library" hint="reverse-engineered references — click for the full breakdown" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.styles.map((s) => (
              <button key={s.name} onClick={() => setOpen({ title: s.title, md: s.md })}
                className="group flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-left transition hover:border-[var(--color-border-hover)]">
                {s.kfs.length > 0 ? (
                  <div className="grid grid-cols-4 gap-px bg-black">
                    {s.kfs.slice(0, 4).map((k) => <img key={k} src={k} alt="" className="aspect-[3/4] w-full object-cover opacity-90 transition group-hover:opacity-100" />)}
                  </div>
                ) : (
                  <div className="flex aspect-[4/1] items-center justify-center bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"><Film size={22} /></div>
                )}
                <div className="p-4">
                  <div className="font-display text-[15px] leading-tight">{s.title}</div>
                  {s.read && <p className="mt-1.5 line-clamp-2 text-xs text-[var(--color-text-dim)]">{s.read}</p>}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ===== finished cuts ===== */}
        {data.cuts.length > 0 && (
          <section>
            <SectionHead icon={Clapperboard} title="Finished cuts" hint="on the SSD — click to play" />
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {data.cuts.map((c) => (
                <button key={c.name} onClick={() => setPlay(c.url)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition hover:border-[var(--color-accent)]/60">
                  <Film size={18} className="text-[var(--color-accent)]" />
                  <div className="mt-2 truncate font-display text-sm">{c.name}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">play</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ===== reveal kit ===== */}
        {data.kit.length > 0 && (
          <section>
            <SectionHead icon={Sparkles} title="R0AM OS reveal kit" hint="hush-hush fragments + transparent overlays" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {data.kit.map((k) => (
                <button key={k.name} onClick={() => k.kind === 'video' ? setPlay(k.url) : setOpen({ title: k.name, img: k.url })}
                  className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-black transition hover:border-[var(--color-border-hover)]">
                  {k.kind === 'img'
                    ? <img src={k.url} alt={k.name} className="aspect-[9/16] w-full object-cover" />
                    : <video src={k.url} muted loop playsInline className="aspect-[9/16] w-full object-cover" onMouseEnter={(e) => e.target.play()} onMouseLeave={(e) => e.target.pause()} />}
                  <div className="truncate px-2 py-1.5 text-[10px] text-[var(--color-text-dim)]">{k.name}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ===== template renders + shoot sheets ===== */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <SectionHead icon={Film} title="Template renders" hint="motion-design episodes (no filming)" />
            <div className="space-y-2">
              {data.renders.map((r) => (
                <button key={r.name} onClick={() => setPlay(r.url)} className="flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left text-sm transition hover:border-[var(--color-accent)]/60">
                  <Film size={14} className="text-[var(--color-accent)]" />{r.name}
                </button>
              ))}
              {data.renders.length === 0 && <p className="text-xs text-[var(--color-text-muted)]">none yet</p>}
            </div>
          </div>
          <div>
            <SectionHead icon={ScrollText} title="Shoot sheets" hint="ready-to-film production plans" />
            <div className="space-y-2">
              {data.sheets.map((s) => (
                <button key={s.name} onClick={() => setOpen({ title: s.name, md: s.md })} className="flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left text-sm transition hover:border-[var(--color-border-hover)]">
                  <ScrollText size={14} className="text-[var(--color-warning)]" />{s.name}
                </button>
              ))}
              {data.sheets.length === 0 && <p className="text-xs text-[var(--color-text-muted)]">none yet</p>}
            </div>
          </div>
        </section>
      </main>

      {/* markdown / image viewer */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm" onClick={() => setOpen(null)}>
          <div className="scrollbar-thin max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="font-display text-lg">{open.title}</div>
              <button onClick={() => setOpen(null)} className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-dim)]"><X size={15} /></button>
            </div>
            {open.img
              ? <img src={open.img} alt="" className="mx-auto max-h-[70vh] rounded-lg" />
              : <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-[var(--color-text-dim)]">{open.md}</pre>}
          </div>
        </div>
      )}

      {/* video player */}
      {play && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6" onClick={() => setPlay(null)}>
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-2">
            {/* muted autoplay = allowed in every browser; unmute via controls */}
            <video src={play} controls autoPlay muted playsInline className="max-h-[86vh] max-w-[92vw] rounded-xl" />
            <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">starts muted — tap the speaker for sound</div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHead({ icon: Icon, title, hint }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <Icon size={15} className="translate-y-0.5 text-[var(--color-text-dim)]" />
      <span className="font-display text-base">{title}</span>
      <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>
    </div>
  );
}
