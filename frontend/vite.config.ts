import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'CommunityWidget',
      fileName: 'community-widget',
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library (Lit and Altcha are bundled as per requirements: "bündelt alle Web Components, Styles und den ALTCHA-Client in eine einzige, abhängigkeitsfreie ES-Modul-Datei")
      external: [],
      output: {
        globals: {},
      },
    },
  },
});
