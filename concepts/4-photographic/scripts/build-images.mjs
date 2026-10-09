// Encode graded masters (media-src/graded/*.png) into responsive AVIF + WebP,
// with a tiny blurred placeholder and a mean colour. Writes src/lib/media.json.
// Run: node scripts/build-images.mjs   (FORCE=1 to re-encode existing files)
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'media-src/graded');
const out = join(root, 'public/media/img');
mkdirSync(out, { recursive: true });
const cfg = JSON.parse(readFileSync(join(root, 'scripts/media.json'), 'utf8'));
cfg.images.push({ slug: 'hero-nib-poster', title: 'Macro: a nib writing in ink', ar: 'سنّ ريشة يكتب بالحبر على الورق' });
const WIDTHS = [480, 960, 1440, 2000];
const only = process.argv.slice(2);
const manifestPath = join(root, 'src/lib/media.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

for (const it of cfg.images) {
  if (only.length && !only.includes(it.slug)) continue;
  const file = join(src, `${it.slug}.png`);
  const meta = await sharp(file).metadata();
  const max = it.max ?? (['hero-nib-poster', 'rawshan-facade'].includes(it.slug) ? 2000 : 1440);
  const widths = WIDTHS.filter((w) => w <= Math.min(max, meta.width));
  for (const w of widths) {
    const a = join(out, `${it.slug}-${w}.avif`);
    const b = join(out, `${it.slug}-${w}.webp`);
    if (existsSync(a) && existsSync(b) && !process.env.FORCE) continue;
    // Source sensor noise is softened: the page lays one shared grain over every photograph.
    const r = sharp(file).resize({ width: w }).blur(w > 1000 ? 0.55 : 0.4);
    await r.clone().avif({ quality: w > 1000 ? 40 : 46, effort: 3 }).toFile(a);
    await r.clone().webp({ quality: w > 1000 ? 62 : 68, effort: 4 }).toFile(b);
  }
  const lq = await sharp(file).resize({ width: 24 }).blur(1.2).webp({ quality: 40 }).toBuffer();
  const px = await sharp(file).resize(1, 1, { fit: 'cover' }).removeAlpha().raw().toBuffer();
  const hex = '#' + [px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
  manifest[it.slug] = {
    w: meta.width,
    h: meta.height,
    widths,
    color: hex,
    lqip: `data:image/webp;base64,${lq.toString('base64')}`,
    alt: it.ar ?? it.title,
  };
  console.log(it.slug, widths.join(','), hex);
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
