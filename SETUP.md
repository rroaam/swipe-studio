# ROAM Swipe — dashboard

Carousel/reel remix pipeline + review dashboard for the ROAM decks produced from
`~/teardown-in/build/`. Two modes, one codebase (`ROAM_STORE` env):

- **Local (engine)** — `npm run dev` → localhost:4310. Filesystem-backed. Does the
  work Vercel can't: fetch (Arc cookies) → Claude remix → render → edit/re-render.
  Plus **Push to cloud** (sync) and **Push to Notion**.
- **Cloud (operator link)** — https://roam-swipe.vercel.app · `ROAM_STORE=supabase`.
  Reads Supabase. Review / approve / notes / push-to-Notion from anywhere. No
  generate/render (local-only, gated by `caps`).

Repo: github.com/rroaam/roam-swipe (Vercel team r0am) · Supabase project `r0am`
(`gnmicatipnsfyzmvkvln`): table `swipe_decks` + bucket `swipe-media`.

Flow: generate locally → **Push to cloud** → review on the hosted link → **Push to Notion**.

It's **local-first on purpose**: rendering needs local Playwright + Chrome, and the
teardown fetch needs your Arc cookies — neither runs serverless, so this runs on
`localhost` and drives the local scripts directly (unlike the cloud/Supabase
review dashboard it is modeled on).

## Run
```bash
cd ~/dev/roam-swipe
npm run dev      # → http://localhost:4310
```
Point it at a different build dir with `ROAM_BUILD_DIR=/path npm run dev`.

## What it reads/writes
- **reads** decks from `$BUILD/decks/*.json` and slides from `$BUILD/out/<deck>/slide_*.png`
- **writes** review status/notes to `$BUILD/state.json`
- **on "Save & re-render"** writes the edited deck JSON back and runs
  `node render.mjs decks/<deck>.json` in `$BUILD` (that deck only)

`$BUILD` defaults to `/Users/ryanrosenthal/teardown-in/build`.

## Routes
- `/` — deck grid (contact-sheet thumb, status, accent, format, slide count)
- `/deck/<name>` — slide gallery + review panel (approve / needs-work / notes /
  JSON editor / save & re-render / lightbox)
- API: `GET|POST /api/deck/<name>`, `POST /api/deck/<name>/render`,
  `POST /api/deck/<name>/status`, `GET /api/img?deck=&file=`

## Generate from URL (Phase 2)
"New deck" → paste a saved IG post/reel URL. The detached worker
(`worker/generate.mjs`) runs: refresh Arc cookies → `gallery-dl`/`yt-dlp` fetch →
Claude (`claude-sonnet-5`) tears it down + authors a ROAM remix deck JSON →
`render.mjs`. Progress streams into the dialog; the deck lands in the grid.
- Fetched assets → `$TEARDOWN/gen/<name>/`; job status → `$BUILD/jobs/<id>.json`
- API key: `ANTHROPIC_API_KEY` env, else read from `~/content-engine/.env`
- The worker is self-contained (no `lib/*.js` imports) so plain `node` can run it.

## Phase status
- **Phase 1 (done):** review + approve + edit-and-re-render.
- **Phase 2 (done):** paste-URL → fetch → Claude teardown+remix → render → grid.
- **Phase 3 (next):** push approved decks to the Notion Carousel Drafts DB;
  optional week-calendar scheduling + zip export.

## Stack
Next.js 15 (App Router, JS) · Tailwind v4 + lucide-react, styled as a duplicate of
a client review dashboard (`@theme` tokens, Hanken Grotesk, kanban board + gallery +
slide-over detail) · Node route handlers for filesystem + `child_process`
fetch/render · Anthropic SDK for the remix step. No database — state is local JSON.
