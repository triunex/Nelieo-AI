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

- Founder: Shourya Sharma — triunex.work@gmail.com (see `src/components/ContactSection.tsx` for contact UI)
- Want help deploying? Need CORS or production API tweaks? Open an issue or DM the maintainer.

This is the beginning — Nelieo is assembling capabilities that used to require multiple tools into one beautiful, auditable, and extendable SuperPlatform. Join the revolution: build on it, extend it, and make it yours.

-- Shourya ( Fucking genius Developer, Founder & CEO, Nelieo.AI)
