import gsap from 'gsap';
import { $, $$, EASE } from './util';

/**
 * Page 3 opening · «سطور كثيرة… سطر واحد» — many lines, one line.
 * The firm's specialisms drift past in engraved gold, row against row;
 * scrolling away, they gather onto the one gold line.
 */
export type Hero = {
  /** the element the house light rests on */
  anchor: HTMLElement;
  /** scroll motion (motion only) */
  setup: () => void;
  /** initial states before the entrance */
  prepare: () => void;
  /** adds the visual's entrance to the opening timeline */
  play: (tl: gsap.core.Timeline) => void;
};

export function createHero(page: HTMLElement): Hero {
  const rows = $$('.tl__row', page);
  const line = $('.tl__line', page);
  const core = $('.tl__core', page);
  const mid = (rows.length - 1) / 2;
  return {
    anchor: core,
    setup() {
      // scrolling away, the many lines gather onto the one gold line and the line spans the page
      const tl = gsap.timeline({ scrollTrigger: { trigger: page, start: 'top top', end: 'bottom top', scrub: 0.6 } });
      rows.forEach((r, i) => {
        tl.to(r, { yPercent: (mid - i) * 100, scaleY: 0.2, opacity: 0, ease: 'power2.in' }, 0);
      });
      tl.to(line, { scaleX: 1.25, ease: 'none' }, 0);
    },
    prepare() {
      gsap.set(rows, { opacity: 0 });
      gsap.set(line, { scaleX: 0 });
    },
    play(tl) {
      // rows surface from the middle outward, each from its own direction; the one line draws across
      const order = rows.map((_, i) => i).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
      order.forEach((i, k) => {
        tl.fromTo(rows[i], { opacity: 0, x: (i % 2 ? -1 : 1) * 80 }, { opacity: 1, x: 0, duration: 1.8, ease: EASE.out }, 0.1 + k * 0.09);
      });
      tl.to(line, { scaleX: 1, duration: 1.6, ease: EASE.io }, 0.5);
    },
  };
}
