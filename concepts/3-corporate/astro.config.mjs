import { defineConfig } from 'astro/config';

export default defineConfig({
  devToolbar: { enabled: false },
  build: { inlineStylesheets: 'always' },
  server: { port: 4403, host: '127.0.0.1' },
  preview: { port: 4403, host: '127.0.0.1' },
});
