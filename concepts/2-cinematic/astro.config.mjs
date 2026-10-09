import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  server: { port: 4402, host: '127.0.0.1' },
  build: { inlineStylesheets: 'always' },
  vite: {
    server: { fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
    build: { assetsInlineLimit: 0 },
  },
});
