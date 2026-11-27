# @blueshoe/community-widget

Nuxt 4 module for the Blueshoe Community comment & reaction system.

> **Breaking in 1.0.0:** This package is now a Nuxt 4 module (Vue components + composables), not the previous Lit web-component bundle.

Designed for **Nuxt 4** and **Docus** apps with `nuxt generate` / static hosting. The **host app owns data fetching** (slug + composables); widgets are presentational and interactive after hydration.

---

## Install

```bash
yarn add @blueshoe/community-widget
# or
npm install @blueshoe/community-widget
```

### Lint (module repo)

This package uses [`@nuxt/eslint`](https://eslint.nuxt.com) with [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) (`stylistic` + formatters for SCSS/CSS and Markdown):

```bash
npm run lint
npm run lint:fix
```

---

## What your Nuxt app must do

### 1. Register the module

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@blueshoe/community-widget'],
  community: {
    apiBase: 'https://community.example.com',
    // authCallback: true // default — copies auth-callback.html into public/
  },
})
```

Environment override:

```bash
NUXT_PUBLIC_COMMUNITY_API_BASE=https://community.example.com
```

(`runtimeConfig.public.community.apiBase` is also supported.)

### 2. Optional theme via `app.config`

Theme tokens stay in **`appConfig`** (not module options / `runtimeConfig`). Module options (`community.apiBase`, …) are for wiring; `appConfig.community.theme` is for UI tokens the host can override at runtime.

```ts
// app.config.ts  (or appConfig in nuxt.config.ts)
export default defineAppConfig({
  community: {
    theme: {
      accent: '#0284c7',
      bg: '#ffffff',
      color: '#1e293b',
      radius: '8px',
      // Optional. Default is `inherit` so the widget uses the host app font.
      font: '\'Source Sans 3\', system-ui, sans-serif',
      // Optional. CTA buttons only; defaults to the body font when unset.
      buttonFont: '\'Oswald\', system-ui, sans-serif',
      buttonFontWeight: 500,
      dark: {
        bg: '#0f172a',
        color: '#e2e8f0',
      },
    },
  },
})
```

If unset, colors fall back to Nuxt UI CSS variables when present (`--ui-primary`, `--ui-bg`, `--ui-text`), and **font inherits** from the surrounding page. `buttonFont` / `buttonFontWeight` only affect CTA buttons (`submit-btn` / `pill-btn`); leave them unset to keep the body font.

### 3. Blog index / ToC — batch data, your UI

The module does **not** render ToC cards. Fetch typed counts and bind them in your layout:

```vue
<script setup lang="ts">
const { data: posts } = await useAsyncData('blog-posts', () => queryContent('/blog').find())
const slugs = (posts.value ?? []).map(p => p.slug as string)
const { data: batch } = await useCommunityReactionBatch(slugs)
// batch[slug] => { comment_count, reactions }  — no `active`
</script>

<template>
  <article v-for="post in posts" :key="post.slug">
    <NuxtLink :to="post._path">{{ post.title }}</NuxtLink>
    <span>
      {{ batch?.[post.slug]?.comment_count ?? 0 }} comments ·
      {{ batch?.[post.slug]?.reactions?.like ?? 0 }} likes
    </span>
  </article>
</template>
```

Uses `GET /api/reactions/batch/?thread_slug=a,b,c` (max 100). Visitor-specific `active_reactions` are stripped.

### 4. Blog post — app fetches, widgets render

```vue
<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string

const { data: comments } = await useCommunityComments(slug)
const { data: reactions } = await useCommunityReactions(slug)
</script>

<template>
  <CommunityReactions
    :thread-slug="slug"
    :reactions="reactions ?? { counts: {}, active: [] }"
  />
  <CommunityComments
    :thread-slug="slug"
    :comments="comments ?? []"
  />
</template>
```

- **You** choose the slug (route, content, props). The module never reads `pathname`.
- With `nuxt generate`, the awaited composables run at build time so comment/reaction HTML is in the static output.
- Widgets hydrate for posting, login, toggles. Call `refresh()` on the composable if you need fresher data after generate.

### 5. Auth callback

With `community.authCallback: true` (default), the module copies `auth-callback.html` into your app `public/` (and serves it via Nitro public assets). Required for OAuth popup login.

Ensure your site can serve `/auth-callback.html` (respect `app.baseURL` if set).

### 6. Docus

Add the module to the Docus / Nuxt config the same way. On doc pages:

1. Derive a stable `thread-slug` from the page path or frontmatter.
2. `await useCommunityComments(slug)` / `useCommunityReactions(slug)` in the page or layout.
3. Pass results into `<CommunityComments>` / `<CommunityReactions>`.

For doc index / ToC cards, use `useCommunityReactionBatch` only.

---

## Public API

### Composables (auto-imported)

| Composable                         | Purpose                                    |
| ---------------------------------- | ------------------------------------------ |
| `useCommunityComments(slug)`       | Load / mutate comments (`useAsyncData`)    |
| `useCommunityReactions(slug)`      | Single-thread reactions + `toggleReaction` |
| `useCommunityReactionBatch(slugs)` | ToC/teaser counts without `active`         |
| `useCommunityAuth()`               | Session, providers, OAuth / magic link     |
| `useCommunityConfig()`             | `apiBase`                                  |
| `useCommunityTheme()`              | Theme from `app.config`                    |
| `useCommentDraft(slug)`            | `localStorage` drafts (client)             |

### Components (auto-imported)

| Component            | Props                                             |
| -------------------- | ------------------------------------------------- |
| `CommunityComments`  | `thread-slug`, `comments` (initial/SSG data)      |
| `CommunityReactions` | `thread-slug`, `reactions` (`{ counts, active }`) |

No teaser widget — ToC UI stays in the host app.

### Types (shape)

```ts
type ReactionKind = 'like' | 'love' | 'rocket' | 'celebrate' | 'insightful'

interface ReactionSummary {
  counts: Partial<Record<ReactionKind, number>>
  active: ReactionKind[]
}

interface ReactionTeaser {
  comment_count: number
  reactions: Partial<Record<ReactionKind, number>>
}

type ReactionBatch = Record<string, ReactionTeaser>
```

---

## Advanced: same-origin proxy (optional)

If first-party cookies are awkward cross-subdomain, add a Nitro proxy in the **host** app, e.g. rewrite `/community-api/**` → your API, and set `community.apiBase` to that same-origin path. The module does not force a proxy.

---

## Notes

- Generate freezes public counts/HTML until the next build or a client `refresh()`.
- `active` reactions are visitor-specific — only for the interactive post widget, never for ToC batch data.
- Peer dependency: `nuxt ^4`.

---

## License

MIT © [Blueshoe](https://blueshoe.de)
