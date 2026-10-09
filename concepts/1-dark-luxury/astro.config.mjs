import { defineConfig } from 'astro/config';

export default defineConfig({
  server: { port: 4401, host: '127.0.0.1' },
  preview: { port: 4401, host: '127.0.0.1' },
  build: { inlineStylesheets: 'always' },
  vite: { server: { fs: { allow: ['..'] } } },
});
