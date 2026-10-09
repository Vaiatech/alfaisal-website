# Al-Faisal Law Firm — website

Home page for شركة الفيصل للمحاماة والاستشارات القانونية. Arabic, right-to-left, light and dark themes.

## Run it

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static site in dist/
npm run preview   # serve the built site
```

`dist/` is plain static files and can be hosted anywhere (Vercel, Netlify, Cloudflare Pages, any web server).

## Where things live

| What | Where |
|---|---|
| All page text, phone numbers, email, address, menu | `src/data/site.ts` |
| Colours, type scale, spacing (both themes) | `src/styles/global.css` (top of file) |
| Sections of the home page | `src/components/sections/` |
| Motion (intro, gold thread, counters, transitions) | `src/scripts/` |
| Vector logo, all variants (SVG / PDF / EPS / PNG) | `brand/` |
| Original content and logo files from the client | `موقع الفيصل - المحتوى والهوية/` |

## Notes

- **Menu**: only the home page exists, so menu items scroll to their section. When an inner page is built, change its `href` in `src/data/site.ts`; `فريقنا` is marked `soon` and shows a "coming soon" note until then.
- **Consultation button**: links to `consultUrl` in `src/data/site.ts` (https://uhearu.com). It is in the header on every page.
- **Intro**: plays once per browser session, never when the visitor prefers reduced motion. Any key, scroll or the تخطٍّ button fast-forwards it.
- **Logo animation data**: `src/assets/calligraphy-strokes.json` holds the pen strokes the intro writes, traced from the calligraphy's skeleton.
- **Fonts**: Noto Naskh Arabic (headings) and IBM Plex Sans Arabic (text), self-hosted under the SIL Open Font License (`public/fonts/`).
