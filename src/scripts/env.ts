import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };

export const root = document.documentElement;
export const reduceMotion = root.classList.contains('no-motion');

export const $ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) =>
  scope.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) =>
  Array.from(scope.querySelectorAll<T>(sel));

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// House easings — one family, used everywhere.
export const EASE = {
  out: 'expo.out',
  soft: 'power3.out',
  inOut: 'power3.inOut',
};

export const lenis: Lenis | null = reduceMotion
  ? null
  : new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, touchMultiplier: 1.2 });

if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

export const scrollY = () => window.scrollY || document.documentElement.scrollTop;

export function waitFonts(timeout = 1600): Promise<void> {
  if (!('fonts' in document)) return Promise.resolve();
  return Promise.race([
    document.fonts.ready.then(() => undefined),
    new Promise<void>((r) => setTimeout(r, timeout)),
  ]);
}
