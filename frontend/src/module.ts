import type { CommunityThemeConfig } from './runtime/types/theme'
import { existsSync, promises as fsp } from 'node:fs'
import { join } from 'node:path'
import {
  addComponent,
  addImportsDir,
  addPlugin,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'
import { defu } from 'defu'

export interface ModuleOptions {
  /** Community API base URL (also settable via NUXT_PUBLIC_COMMUNITY_API_BASE) */
  apiBase?: string
  /** Copy auth-callback.html into the host app public/ directory */
  authCallback?: boolean
}

const defaultTheme: CommunityThemeConfig = {
  accent: 'var(--ui-primary, #0284c7)',
  bg: 'var(--ui-bg, #ffffff)',
  color: 'var(--ui-text, #1e293b)',
  radius: '8px',
  // Inherit host app typography unless the app sets theme.font in appConfig.
  font: 'inherit',
  dark: {
    bg: 'var(--ui-bg, #0f172a)',
    color: 'var(--ui-text, #e2e8f0)',
  },
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@blueshoe/nuxt-community',
    configKey: 'community',
    compatibility: {
      nuxt: '>=4.0.0',
    },
  },
  defaults: {
    apiBase: '',
    authCallback: true,
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.runtimeConfig.public.community = defu(
      nuxt.options.runtimeConfig.public.community as Record<string, unknown> | undefined,
      {
        apiBase: options.apiBase || '',
      },
    )

    nuxt.options.appConfig.community = defu(
      (nuxt.options.appConfig as { community?: unknown }).community as Record<string, unknown> | undefined,
      { theme: defaultTheme },
    )

    // Published package ships compressed CSS; local/source links use SCSS.
    const cssCompiled = resolver.resolve('./runtime/assets/css/community.css')
    const cssScss = resolver.resolve('./runtime/assets/scss/index.scss')
    const cssPath = existsSync(cssCompiled) ? cssCompiled : cssScss
    nuxt.options.css = nuxt.options.css || []
    if (!nuxt.options.css.includes(cssPath)) {
      nuxt.options.css.push(cssPath)
    }

    addPlugin(resolver.resolve('./runtime/plugins/community-theme'))
    addImportsDir(resolver.resolve('./runtime/composables'))

    // Public widgets only — nested UI pieces stay local imports.
    addComponent({
      name: 'CommunityComments',
      filePath: resolver.resolve('./runtime/components/CommunityComments.vue'),
    })
    addComponent({
      name: 'CommunityReactions',
      filePath: resolver.resolve('./runtime/components/CommunityReactions.vue'),
    })

    if (options.authCallback !== false) {
      nuxt.hook('nitro:config', async (nitroConfig) => {
        nitroConfig.publicAssets ||= []
        const src = resolver.resolve('./runtime/public/auth-callback.html')
        const publicDir = join(nuxt.options.rootDir, 'public')
        try {
          await fsp.mkdir(publicDir, { recursive: true })
          const dest = join(publicDir, 'auth-callback.html')
          try {
            await fsp.access(dest)
          }
          catch {
            await fsp.copyFile(src, dest)
          }
        }
        catch {
          // Host may not have a writable public/ yet; document fallback in README.
        }
        nitroConfig.publicAssets.push({
          dir: resolver.resolve('./runtime/public'),
          maxAge: 60 * 60 * 24 * 7,
        })
      })
    }
  },
})
