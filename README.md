# 👟 Blueshoe Community Hub & Comment System 💬🚀

> **Where static sites get a real voice, conversations thrive, and hurricanes power our servers instead of breaking them.**

<a href="https://www.python.org/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Python-3.12-blue.svg" alt="Python" /></a>
<a href="https://astral.sh/uv" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Package_Manager-Astral_uv-blueviolet.svg" alt="Tooling" /></a>
<a href="https://django-hurricane.io/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/ASGI_Runner-Django_Hurricane-orange.svg" alt="Server" /></a>
<a href="https://django-ninja.dev/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/API-Django_Ninja-brightgreen.svg" alt="API" /></a>
<a href="pytest.ini" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Test_Coverage-96%25-success.svg" alt="Coverage" /></a>

Welcome to the headless community powerhouse serving <a href="https://blueshoe.de" target="_blank" rel="noopener noreferrer"><code>blueshoe.de</code></a>, <a href="https://blueshoe.io" target="_blank" rel="noopener noreferrer"><code>blueshoe.io</code></a>, and <a href="https://django-hurricane.io" target="_blank" rel="noopener noreferrer"><code>django-hurricane.io</code></a>.

Static site generators (Astro, Sphinx, Hugo, Next) are fast, secure, and peaceful... until someone wants to leave a comment. Rather than selling your readers' souls to ad-tracking third-party widgets, **Blueshoe Community Hub** gives you a self-hosted, multi-tenant, privacy-first, lightning-fast commenting and reaction platform with built-in moderation guardrails!

---

## ⚡ Superpowers & Highlights

### 🌪️ Powered by `django-hurricane`
Forget slow WSGI setups. We run on <a href="https://django-hurricane.io/" target="_blank" rel="noopener noreferrer"><strong>Django Hurricane</strong></a>, Blueshoe’s own cloud-native Granian-powered ASGI runner.
- High-performance asynchronous execution.
- Built-in zero-downtime Kubernetes & Coolify probes: `/alive`, `/ready`, `/startup`, and Prometheus `/metrics`.
- Auto-runs migrations on container startup (`--check-migrations-apply`).

### 🥷 Typed & Fast with `django-ninja`
No DRF bloatware here! Built with <a href="https://django-ninja.dev/" target="_blank" rel="noopener noreferrer"><strong>Django Ninja</strong></a> and Pydantic schemas:
- Fully typed request/response models.
- Interactive, eye-candy API documentation at <a href="/docs" target="_blank" rel="noopener noreferrer"><strong><code>/docs</code></strong></a> powered by **Scalar** (with a Swagger fallback at <a href="/api/docs" target="_blank" rel="noopener noreferrer"><code>/api/docs</code></a>).

### 🛡️ Smart Content Guardrails & Review Queue
- Every single comment (from guests or logged-in users) is screened through real-time moderation guardrails.
- **Clean?** Instant publish (`approved`)! 🎉
- **Spam or abusive content?** Flagged, held back in a dedicated Django Admin review queue, and triggers an alert webhook for moderators.
- **Privacy First:** User identifiers (IP, email, or user IDs) are never exposed.

### 🛡️ Troll & Bot Kryptonite
- **Invisible Honeypot:** Dummy fields catch dumb bots before spending server resources.
- **ALTCHA Proof-of-Work:** Privacy-friendly WASM CAPTCHAs for guest commenters without annoying "click all traffic lights" puzzles.
- **Replay Protection:** One-time cryptographic challenge nonces cached with SHA-256 hashes.

### 🚀 Dual Positive-Only Reactions
- React to whole articles/pages (`/article-slug/`) or to individual comments.
- **Strictly positive vibes only:** 👍 `like`, ❤️ `love`, 🚀 `rocket`, 🎉 `celebrate`, 💡 `insightful`. (No toxic downvote mobs allowed!).
- Ultra-efficient teaser batch endpoint: load reactions and comment counts for up to 100 articles in **one single API call** (`GET /api/reactions/batch/`).

### ✉️ Async Notification Emails via Django Tasks
- Built with the official **Django Tasks Framework** (`django.tasks`).
- Dispatches emails asynchronously via your SMTP gateway without blocking HTTP request workers.
- Includes direct deep-links to the exact comment (`https://blueshoe.de/blog/post-1/#comment-42`) and cryptographic 1-click unsubscribe links.

### 🍪 Multi-Domain & First-Party Cookies
- Custom middleware dynamically assigns cookies (`sessionid`, `csrftoken`, `community_vid`) to root domains (e.g. `.blueshoe.de`), avoiding third-party cookie blocks in Chrome & Safari.
- Regular readers enjoy **180-day sliding sessions**; staff sessions are safely capped at 12 hours.

### ☕ Resilient Frontend Widget (`@blueshoe/community-widget`)
- Standalone Web Component built with **Lit** and **TypeScript**.
- **Graceful degradation:** If the backend ever takes a coffee break ☕ or a hurricane sweeps through the server, teaser badges silently hide, while comment sections show a humorous status card with zero text loss (drafts stay safe in `localStorage`!).

---

## 🛠️ Tech Stack

| Category | Tools & Libraries |
| :--- | :--- |
| **Language & Runtime** | Python 3.12, Node.js 20 |
| **Package Tooling** | <a href="https://astral.sh/uv" target="_blank" rel="noopener noreferrer">Astral <code>uv</code></a> (blazing fast) |
| **Server Engine** | <a href="https://django-hurricane.io/" target="_blank" rel="noopener noreferrer"><code>django-hurricane</code></a> (Granian / Rust ASGI) |
| **API Framework** | <a href="https://django-ninja.dev/" target="_blank" rel="noopener noreferrer"><code>django-ninja</code></a> (Pydantic v2) |
| **Database & Cache** | PostgreSQL 15, Redis / Local Cache |
| **Bot Protection** | ALTCHA (WASM Proof-of-Work), Honeypot |
| **Markdown & HTML** | `mistune` 3, `nh3` (strict HTML sanitizer, `nofollow ugc`) |
| **Frontend Widget** | Lit, Vite (Library Mode), Web Components |
| **Deployment** | Coolify, Docker Compose |

---

## 🚀 Quickstart (Local Development)

We manage everything using <a href="https://astral.sh/uv" target="_blank" rel="noopener noreferrer">Astral's <code>uv</code></a>. If you don't have it yet:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 1. Clone & Set Up Python Virtualenv
```bash
git clone git@github.com:blueshoe/community-hub.git
cd community-hub

# Create venv and sync all dependencies in a flash
uv sync
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Run Migrations & Start Hurricane
```bash
uv run python manage.py migrate
uv run python manage.py serve
```

Available endpoints:
- 📖 **Interactive API Docs:** <a href="/docs" target="_blank" rel="noopener noreferrer"><code>/docs</code></a>
- ⚙️ **Django Admin:** <a href="/admin/" target="_blank" rel="noopener noreferrer"><code>/admin/</code></a>
- 🩺 **Healthcheck:** <a href="/healthz/" target="_blank" rel="noopener noreferrer"><code>/healthz/</code></a>
- 💓 **Hurricane Liveness Probe:** <a href="/alive" target="_blank" rel="noopener noreferrer"><code>/alive</code></a>
- 📊 **Prometheus Metrics:** <a href="/metrics" target="_blank" rel="noopener noreferrer"><code>/metrics</code></a>

---

## 🐳 Production Deployment (Coolify / Docker Compose)

Our production setup runs cleanly with Docker Compose and is configured entirely through environment variables.

```bash
# Validate your compose setup
docker compose config

# Spin up web and postgres containers
docker compose up -d
```

### Coolify Zero-Downtime Settings
- **Healthcheck Path:** `/alive` or `/healthz/`
- **Domains:** Coolify Traefik handles Let's Encrypt certificates for:
  - `community.blueshoe.de`
  - `community.blueshoe.io`
  - `community.django-hurricane.io`

---

## 🎨 Frontend Widget (`@blueshoe/community-widget`)

The frontend is located in `/frontend` and builds into a standalone ES module with zero runtime CDN requirements.

### Build Widget
```bash
cd frontend
npm install
npm run build
```

### Embedding on Any Website
```html
<!-- Load the widget -->
<script type="module" src="https://community.blueshoe.de/static/community-widget.js"></script>

<!-- Add reactions to your article header -->
<community-reactions thread-slug="my-awesome-blog-post"></community-reactions>

<!-- Add comments & markdown editor to your article footer -->
<community-comments thread-slug="my-awesome-blog-post"></community-comments>
```

### Theming via CSS Custom Properties
```css
:root {
  --community-accent: #007bff;
  --community-bg: #ffffff;
  --community-radius: 8px;
  --community-font: 'Inter', system-ui, sans-serif;
}
```

---

## 🧪 Testing & Code Quality

We take pride in high engineering standards. 39 automated tests cover every critical path:

```bash
# Run tests with coverage report
uv run pytest

# Check formatting and linting with Ruff
uv run ruff check .
uv run ruff format --check .
```

---

## 🤖 Dependabot & Automerge

Dependabot is configured in `.github/dependabot.yml` to keep Python dependencies, npm packages, and GitHub Actions up to date weekly. When CI checks pass, Dependabot pull requests are automatically approved and merged!

---

## 💬 Community Discussion Guidelines (Commenter Code of Conduct)

This software includes and enforces a comprehensive set of community guidelines governing **commenting, reactions, and public interactions** across websites powered by this platform.

- **Shipped with the Frontend Widget:** Readers can review the rules in-place via an interactive modal dialog directly in the editor while writing comments.
- **Moderation Guardrails:** Comments violating these guidelines (hate speech, harassment, threats, or spam) are automatically intercepted and held for review.
- Review the full text in <a href="CODE_OF_CONDUCT.md" target="_blank" rel="noopener noreferrer"><strong>Community Discussion Guidelines (CODE_OF_CONDUCT.md)</strong></a>.

---

## 📜 License

Created with ❤️ by <a href="https://blueshoe.de" target="_blank" rel="noopener noreferrer"><strong>Blueshoe</strong></a>. Licensed under the MIT License.
