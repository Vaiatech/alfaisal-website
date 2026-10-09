// Build-time access to the shared traced logo: every group's path data, so the page can
// define the paths once (<defs>) and reuse them everywhere via <use>.
import raw from '../../../shared/logo/alfaisal-logo.svg?raw';
import strokesJson from '../../../shared/calligraphy-strokes.json';

export type LogoPart = 'pen' | 'calligraphy' | 'scale' | 'penband' | 'wordmark' | 'tagline' | 'rule';

const parts = {} as Record<LogoPart, string>;
for (const m of raw.matchAll(/<g id="([a-z]+)"[^>]*>\s*<path d="([^"]+)"/g)) {
  parts[m[1] as LogoPart] = m[2];
}
export const logoPaths = parts;

export type Stroke = { d: string; w: number; l: number };
export const strokes = strokesJson as Stroke[];

/** viewBox of the mark (calligraphy + pen + scale) — same as alfaisal-mark.svg */
export const MARK_VB = '100 -10 830 835';
export const WORDMARK_VB = '0 868 1031 327';
