// Reads the traced vector logo once at build time so every mark on the page is inline SVG.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Resolved from the concept folder (cwd for dev/build) — works in dev and in the prerender bundle.
const shared = (p: string) => join(process.cwd(), '..', 'shared', p);
const svg = readFileSync(shared('logo/alfaisal-logo.svg'), 'utf8');

const groups: Record<string, string> = {};
for (const m of svg.matchAll(/<g id="([^"]+)" fill="[^"]+">([\s\S]*?)<\/g>/g)) {
  groups[m[1]] = [...m[2].matchAll(/<path d="([^"]+)"/g)].map((x) => x[1]).join(' ');
}
export const logoPaths = groups as Record<'pen' | 'calligraphy' | 'scale' | 'penband' | 'wordmark' | 'tagline' | 'rule', string>;

export type Stroke = { d: string; w: number; l: number };
export const strokes: Stroke[] = JSON.parse(readFileSync(shared('calligraphy-strokes.json'), 'utf8'));

// Mark (calligraphy + pen + scale) crop of the 1031×1195 logo space.
export const MARK_VB = '110 -8 810 830';
// Nib tip of the pen, in logo space (measured from the traced path's bbox).
export const NIB = { x: 733, y: 773 };
