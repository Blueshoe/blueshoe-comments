# @blueshoe/community-widget

> Lightweight (~14 kB gzipped), framework-independent Web Component widget for the Blueshoe Community & Comment System.

[![npm version](https://img.shields.io/npm/v/@blueshoe/community-widget.svg)](https://www.npmjs.com/package/@blueshoe/community-widget)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@blueshoe/community-widget)](https://bundlephobia.com/package/@blueshoe/community-widget)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Designed for static site generators (**Astro, Hugo, Sphinx, Next.js, 11ty, Vite**) and plain HTML sites. Ships as a single self-contained ES module with **zero external CDN runtime dependencies**.

---

## ✨ Features

- 💬 **Markdown Editor:** Toolbar for bold, italic, code, code blocks, links, and quotes with a real-time Preview tab.
- 🚀 **Dual Positive-Only Reactions:** Page-level and comment-level reactions (👍 `like`, ❤️ `love`, 🚀 `rocket`, 🎉 `celebrate`, 💡 `insightful`).
- 📜 **Built-in Code of Conduct:** Shipped inside the bundle with an interactive modal dialog for commenters (English & German).
- 💾 **Offline Resilience & Draft Recovery:** Automatic `localStorage` draft saving and witty fallback states if the backend is temporarily unreachable.
- 🌍 **Auto-Discovery & i18n:** Automatically detects API host and language (`en`/`de`) from the document `<html lang="...">`.
- 🎨 **Multi-Brand Theming:** Seamless customization via standard CSS Custom Properties.

---

## 📦 Installation

```bash
npm install @blueshoe/community-widget
```

Or load directly from a CDN:
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@blueshoe/community-widget/dist/community-widget.js"></script>
```

---

## 🚀 Usage

### 1. In JavaScript / TypeScript (Astro, Next.js, Vite, etc.)
```typescript
import '@blueshoe/community-widget';
```

### 2. In your HTML / Template
```html
<!-- Page / Article Reactions -->
<community-reactions thread-slug="my-first-post"></community-reactions>

<!-- Comments Section with Markdown Editor -->
<community-comments thread-slug="my-first-post"></community-comments>
```

---

## ⚙️ Component Attributes

| Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `thread-slug` | `string` | **Required** | Unique identifier for the page or article thread. |
| `api-base` | `string` | Auto-detected | Backend API URL (defaults to `https://community.<hostname>`). |
| `lang` | `string` | Auto-detected | Language code (`"en"` or `"de"`). Auto-detects from `<html lang="...">`. |

---

## 🔑 Social Login Setup (`auth-callback.html`)

For popup social logins (GitHub, Google, etc.) without page reloads, copy `auth-callback.html` to your site's public directory:

```bash
npx blueshoe-community-init ./public
```

The callback notifies the widget via `localStorage` (primary), plus `BroadcastChannel` / `postMessage` when available. This is required because OAuth provider redirects often clear `window.opener` (COOP).

> **Note:** Social login session state only works same-site to the API (e.g. `www.blueshoe.io` → `community.blueshoe.io`). From `localhost` against the production API the popup can succeed, but the widget cannot read the `SameSite=Lax` session cookie.

---

## 🎨 Theming

Customize the look and feel using CSS Custom Properties in your stylesheet:

```css
:root {
  --community-accent: #0284c7;        /* Primary button & active reaction color */
  --community-bg: #ffffff;            /* Background color */
  --community-color: #1e293b;         /* Text color */
  --community-radius: 8px;            /* Border radius */
  --community-font: system-ui, sans-serif;
}
```

---

## 📜 License

MIT © [Blueshoe](https://blueshoe.de)
