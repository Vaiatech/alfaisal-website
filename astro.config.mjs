import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.alfaisllaw.com',
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  build: { inlineStylesheets: 'always' },
});
