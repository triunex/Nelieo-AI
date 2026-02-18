# Nelieo — The World's First AI SuperPlatform

Welcome to Nelieo: not just another app — a new class of software. We built a SuperPlatform that fuses search, chat, voice, research, and agentic automation into a single, seamless user experience. This README is your launchpad.

Why "SuperPlatform"?

- SuperPlatform = unified intelligence + live web synthesis + agent orchestration.
- Instant, sourced answers; beautiful structured responses; voice-first interaction; extendable agents that do real work.
- Designed for professionals, researchers, creators, and teams who demand speed, transparency, and control.

Core capabilities

- Real-time web search + AI synthesis: get concise, source-cited answers without tab-hopping.
- Structured answers: headings, lists, charts, and source panels that are presentation-ready.
- Voice assistant: speak to Nelieo; Nelieo speaks back with high-quality voices and smooth playback.
- Agentic workflows: chain tasks, fetch pages, extract data, and produce reports automatically.
- Rich media: inline images, generated demo videos, and visual previews for sources.
- History & persistence: conversation and search history stored and retrievable, with server-side instruction persistence.

Why it matters

- Replace fragmented tools with a single, coherent interface — research faster, verify smarter, ship quicker.
- Built for humans: readable answers, transparent sources, and graceful failures.
- Built for teams: share, extend, and automate with safe defaults.

Quick start (developer)

1. Clone the repo

```powershell
git clone <YOUR_GIT_URL>
cd lumina-search-flow-main
```

2. Install dependencies

```powershell
npm install
```

3. Run locally (dev server)

```powershell
npm run dev
```

4. Build for production

```powershell
npm run build
```

Deploy

- The project can be hosted on Firebase Hosting, Vercel, Render, or your preferred provider. The repo includes a `firebase.json` for Firebase deploys.

Configuration

- Copy or edit the `.env` file to add API keys and platform secrets (Gemini, SerpAPI, Firebase, etc.).
- For CORS and API endpoints, update `cognix-api/server.js` with your `FRONTEND_ORIGIN` when deploying the backend.

Extensibility & contributors

- Add new agent scripts under `agents/`.
- Contribute UI components in `src/components/` and pages in `src/pages/`.
- Keep PRs focused: one feature per branch, include a short description and screenshots if UI changes.

Security & privacy

- Nelieo surfaces sources and citations so you can verify claims.
- Do not commit API keys or secrets — use environment variables or secret management in your hosting platform.

Contact & next steps

<<<<<<< HEAD
- Founder: Shourya Sharma — triumph@triunex.work (see `src/components/ContactSection.tsx` for contact UI)
=======
- Founder: Shourya Sharma — triunex.work@gmail.com (see `src/components/ContactSection.tsx` for contact UI)
>>>>>>> b5f35ab316952a5aaeda7eb72973d80ce4d754b0
- Want help deploying? Need CORS or production API tweaks? Open an issue or DM the maintainer.

This is the beginning — Nelieo is assembling capabilities that used to require multiple tools into one beautiful, auditable, and extendable SuperPlatform. Join the revolution: build on it, extend it, and make it yours.

<<<<<<< HEAD
-- The Nelieo Team

---

## Experimental: Universal Search Streaming API

An experimental unified people/research streaming endpoint that normalizes heterogeneous providers (GitHub, OpenAlex, arXiv) into a common record shape and streams them over SSE as they arrive.

Endpoint

`GET /api/universal-search/stream?q=<query>&lat=<optional>&lon=<optional>`

Server‑Sent Events sequence

- `init` – initial metadata `{ q }`
- `intent` – parsed intent `{ entityType, filters }`
- `providers` – engaged providers
- `columns` – evolving inferred column list
- `record` – each new normalized record
- `update` – enrichment patch (skills, etc.) `{ id, patch }`
- `done` – completion `{ total, cached }`

Current providers

- GitHub engineers (detail fetch for top 10 + geocoded distance if client provides lat/lon)
- OpenAlex authors
- arXiv authors (heuristic people extraction)

Enrichment pipeline

Lightweight queue performs heuristic skill extraction from bio/company and emits `update` events so the UI can live‑patch rows. Future stages will include repo language analysis and LLM summarization.

Client hook

`useUniversalSearch(query, { location })` – returns `{ records, columns, intent, loading, done }` while handling dedupe and updates.

Demo page

Navigate to `/universal` in the frontend to see a live table that updates as events stream in.

Scoring

Combines completeness + authority (followers/citations/stars) + proximity bonus (distance_km) for ranking.

Planned next

- More vertical providers (investors, startups, places, events, travel)
- Redis + relevance re‑ranking
- Rich skill graph & seniority inference
- LLM powered profile synthesis
=======
-- Shourya ( Fucking genius Developer, Founder & CEO, Nelieo.AI)
>>>>>>> b5f35ab316952a5aaeda7eb72973d80ce4d754b0
