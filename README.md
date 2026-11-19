# 👟 Blueshoe Community Hub & Comment System 💬🚀

> **Where static sites get a real voice, trolls meet Gemini AI, and hurricanes power our servers instead of breaking them.**

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Tooling](https://img.shields.io/badge/Package_Manager-Astral_uv-blueviolet.svg)](https://astral.sh/uv)
[![Server](https://img.shields.io/badge/ASGI_Runner-Django_Hurricane-orange.svg)](https://django-hurricane.io/)
[![API](https://img.shields.io/badge/API-Django_Ninja-brightgreen.svg)](https://django-ninja.dev/)
[![AI Moderation](https://img.shields.io/badge/AI_Moderation-Gemini_2.5_Flash-ff69b4.svg)](https://deepmind.google/technologies/gemini/)
[![Coverage](https://img.shields.io/badge/Test_Coverage-96%25-success.svg)](pytest.ini)
[![Port](https://img.shields.io/badge/Default_Port-8079-yellow.svg)](docker-compose.yml)

Welcome to the headless community powerhouse serving [`blueshoe.de`](https://blueshoe.de), [`blueshoe.io`](https://blueshoe.io), and [`django-hurricane.io`](https://django-hurricane.io).

Static site generators (Astro, Sphinx, Hugo, Next) are fast, secure, and peaceful... until someone wants to leave a comment. Rather than selling your readers' souls to ad-tracking third-party widgets, **Blueshoe Community Hub** gives you a self-hosted, multi-tenant, privacy-first, lightning-fast commenting and reaction platform with synchronous AI moderation!

---

## ⚡ Superpowers & Highlights

### 🌪️ Powered by `django-hurricane` (Port 8079)
Forget slow WSGI setups. We run on **[Django Hurricane](https://django-hurricane.io/)**, Blueshoe’s own cloud-native Granian-powered ASGI runner.
- **Port `8079`** by default (because 8000 was way too crowded).
- Built-in zero-downtime Kubernetes & Coolify probes: `/alive`, `/ready`, `/startup`, and Prometheus `/metrics`.
- Auto-runs migrations on container startup (`--check-migrations-apply`).

### 🥷 Typed & Fast with `django-ninja`
No DRF bloatware here! Built with **Django Ninja** and Pydantic schemas:
- Fully typed request/response models.
- Interactive, eye-candy API documentation at **[`/docs`](http://localhost:8079/docs)** powered by **Scalar** (with a Swagger fallback at `/api/docs`).

### 🤖 Gemini 2.5 Flash Guardrail (Publish-by-Default)
- Every single comment (from guests or logged-in users) is checked synchronously in < 4 seconds by **Gemini 2.5 Flash**.
- **Clean?** Instant publish (`approved`)! 🎉
- **Spam or hate speech?** Flagged (`spam` / `illegal`), put in a review queue, and triggers a non-blocking notification webhook for moderators.
- **Privacy & Prompt Injection Defense:** Text is isolated with XML delimiters without leaking user identifiers (IP, email, or user IDs) to Google.

### 🛡️ Troll & Bot Kryptonite
- **Invisible Honeypot:** Dummy fields catch dumb bots before spending CPU cycles on AI.
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
- Tiny standalone Web Component (~26 KB, ~8 KB gzipped) built with **Lit** and **TypeScript**.
- **Graceful degradation:** If the backend ever takes a coffee break ☕ or a hurricane sweeps through the server, teaser badges silently hide, while comment sections show a humorous status card with zero text loss (drafts stay safe in `localStorage`!).

---

## 🛠️ Tech Stack

| Category | Tools & Libraries |
| :--- | :--- |
| **Language & Runtime** | Python 3.12, Node.js 20 |
| **Package Tooling** | [Astral `uv`](https://astral.sh/uv) (blazing fast) |
| **Server Engine** | `django-hurricane` (Granian / Rust ASGI) |
| **API Framework** | `django-ninja` (Pydantic v2) |
| **AI Moderation** | Google Gemini 2.5 Flash (`google-genai`) |
| **Database & Cache** | PostgreSQL 15, Redis / Local Cache |
| **Bot Protection** | ALTCHA (WASM Proof-of-Work), Honeypot |
| **Markdown & HTML** | `mistune` 3, `nh3` (strict HTML sanitizer, `nofollow ugc`) |
| **Frontend Widget** | Lit, Vite (Library Mode), Web Components |
| **Deployment** | Coolify, Docker Compose |

---

## 🚀 Quickstart (Local Development)

We manage everything using Astral's `uv`. If you don't have it yet:
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
*(Optionally add your `GEMINI_API_KEY` for live AI moderation testing!)*

### 3. Run Migrations & Start Hurricane
```bash
uv run python manage.py migrate
uv run python manage.py serve --port 8079
```

Visit the services:
- 📖 **Interactive API Docs:** [http://localhost:8079/docs](http://localhost:8079/docs)
- ⚙️ **Django Admin:** [http://localhost:8079/admin/](http://localhost:8079/admin/)
- 🩺 **Healthcheck:** [http://localhost:8079/healthz/](http://localhost:8079/healthz/)
- 💓 **Hurricane Liveness Probe:** [http://localhost:8079/alive](http://localhost:8079/alive)
- 📊 **Prometheus Metrics:** [http://localhost:8079/metrics](http://localhost:8079/metrics)

---

## 🐳 Production Deployment (Coolify / Docker Compose)

Our production setup runs cleanly with Docker Compose, binding to port **`8079`** by default.

```bash
# Validate your compose setup
docker compose config

# Spin up web and postgres containers
docker compose up -d
```

### Coolify Zero-Downtime Settings
- **Port:** `8079`
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
- **Enforced by AI Moderation:** Comments violating these guidelines (hate speech, harassment, threats, or spam) are automatically intercepted by our synchronous Gemini 2.5 Flash guardrail.
- Review the full text in [Community Discussion Guidelines (CODE_OF_CONDUCT.md)](CODE_OF_CONDUCT.md).

---

## 📜 License

Created with ❤️ by **[Blueshoe](https://blueshoe.de)**. Licensed under the MIT License.
