# Al-Faisal home page — concept brief (shared by all three concepts)

## Client
**شركة الفيصل للمحاماة والاستشارات القانونية** (Al-Faisal Law Firm & Legal Consultancy), Makkah, Saudi Arabia.
Tagline: محامون | مستشارون | محكمون. A serious, senior firm (20+ lawyers, 6,750+ clients) that handles complex files:
estates, liquidations, corporate, real-estate assets, disputes, arbitration. Their core idea: *a file is a system of
interlocking details, not a single case* — «عندما تتعقد التفاصيل… تحتاج إلى منظومة قانونية متكاملة».

## What the person asked for (their words, paraphrased)
- "Wonderful, phenomenal, professional, غير مبتذل (not cheap/cliché)."
- "Better than Awwwards." "Not AI-generic at all."
- Motion and animation matter: loading/intro, switching between pages/sections, outro, and **especially the numbers**.
- "Fill things" — sections must feel full and designed, never empty or like a printed document.
- Good storytelling.
- Colours must look like a senior designer chose them.
- They rejected a previous version for being too plain / document-like (ivory paper, hairlines, text-heavy). Do not repeat that.

## Hard requirements
- **Arabic, RTL** (`<html lang="ar" dir="rtl">`). Mobile-perfect at 390px; no horizontal page scroll at any width.
- **Font: Almarai** (the font of the firm's consultation platform uhearu.com) — self-host from `concepts/shared/fonts/`
  (weights 400/700/800 only; never request 500/600 → no faux bold). Noto Naskh Arabic is available as a calligraphic accent if useful.
- **Never split Arabic text into letters** for animation (it breaks letter joining). Split by words or lines only.
- **Header** on every page: logo (right), menu, and a fixed **«احجز استشارة»** consultation button at the **top-left**
  linking to `https://uhearu.com` (always visible, including on mobile).
- **Menu**: الرئيسية، من نحن، خبراتنا، منهجيتنا، فريقنا، تواصل معنا. Only the home page exists: each item scrolls/transitions
  to its section on the home page; «فريقنا» shows an elegant "قريبًا" (coming soon) note.
- **Content**: use the approved copy in `concepts/shared/content.ts` exactly (hero, numbers, «ليست كل الملفات قضية»,
  six practice areas, the 5-step method, six values, closing + contact). Do not invent claims, clients, awards or
  testimonials. Short UI microcopy (labels, button text) is fine.
- **Numbers**: 6,750+ clients and the nine figures — animate them memorably (not a generic count-up).
- **Intro/loader**, **section/page transitions** (build the system even though there is one page), **outro** at the end.
- Respect `prefers-reduced-motion` (everything readable and complete without motion). Works without JS (content visible).
- Logo: use the traced vector in `concepts/shared/logo/` (inline SVG so parts can be animated). `calligraphy-strokes.json`
  lets you make the calligraphy write itself (stroke mask). See `concepts/shared/README.md`.
- **Photos**: there is no internet image access from this machine (stock/CDN hosts are blocked). The only real photos are
  three practice-group leaders in `concepts/shared/photos/`. Do not use AI-generated images. If the concept needs imagery,
  create it with code (SVG/Canvas/WebGL) from the brand's own material: the logo, the calligraphy, the gold, the rhombus dot.
- Avoid clichés: gavels, Lady Justice, handshakes, skyline stock, purple gradients, emoji, icon-in-a-circle card grids,
  `rounded-lg` everything, generic fade-up on every element.

## Engineering
- Build a standalone site in your own folder `concepts/<your-folder>/` (its own `package.json`; Astro + TypeScript is
  recommended; npm registry access works — GSAP 3.15 incl. ScrollTrigger/SplitText, Lenis, three.js, OGL are all
  installable). Do **not** touch anything outside your folder (the repo root site, `brand/`, `concepts/shared/`, the other
  concepts). Do **not** run git commands that change state (no commit, no checkout, no stash).
- Build with `npm run build`; serve with `npx astro preview --port <your port> --host 127.0.0.1` (run it in the background).
- Verify visually with Playwright (Chromium is pre-installed; `require('/tmp/claude-0/-home-user-alfaisal-website/d73a7499-d5c6-5f38-88a7-9c7418c63023/scratchpad/node_modules/playwright')`,
  never run `playwright install`). Look at your screenshots and fix what you see — iterate until it is genuinely excellent,
  at 1440×900 and 390×844, and check the console has no errors.
- When finished, leave in `concepts/<your-folder>/preview/`: 5–6 PNG stills (desktop + mobile) and one MP4 screen recording
  of the intro + a slow scroll through the whole page (Playwright `recordVideo`, then
  `ffmpeg -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart`). Exclude `node_modules` and `dist` via a `.gitignore`.
- Final report: what the concept is (2–3 sentences), the signature ideas, palette + type decisions, how each motion
  requirement is met, known limitations, and the exact commands to run it.
