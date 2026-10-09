import { gsap, ScrollTrigger, SplitText, reduceMotion, $$, EASE } from './env';

// Arabic letters join, so text is only ever split into lines — never letters.
function splitLines(el: HTMLElement) {
  return SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'none' });
}

export function initReveals() {
  const fades = $$('[data-reveal="fade"]').filter((el) => !el.hasAttribute('data-hero'));
  const lines = $$('[data-reveal="lines"]');
  const areas = $$('[data-reveal="area"]');

  if (reduceMotion) {
    gsap.set([...fades, ...lines, ...areas], { opacity: 1 });
    return;
  }

  ScrollTrigger.batch(fades, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) =>
      gsap.fromTo(
        batch,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 1.2, ease: EASE.soft, stagger: 0.09, overwrite: true },
      ),
  });

  lines.forEach((el) => {
    gsap.set(el, { opacity: 1 });
    const split = splitLines(el);
    gsap.set(split.lines, { yPercent: 108 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () =>
        gsap.to(split.lines, { yPercent: 0, duration: 1.25, ease: EASE.out, stagger: 0.1 }),
    });
  });

  ScrollTrigger.batch(areas, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      gsap.fromTo(
        batch,
        { opacity: 0, y: 34 },
        { opacity: 1, y: 0, duration: 1.2, ease: EASE.out, stagger: 0.1, overwrite: true },
      ),
  });

  // Ledger: each rule is drawn from the right, then its row settles in.
  const items = $$('[data-ledger-item]');
  gsap.set(items.map((i) => i.querySelector('.ledger__rule')), { scaleX: 0 });
  gsap.set(items.map((i) => Array.from(i.children).filter((c) => !c.classList.contains('ledger__rule'))), {
    opacity: 0,
    y: 16,
  });
  ScrollTrigger.batch(items, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => {
      batch.forEach((item, k) => {
        const rule = item.querySelector('.ledger__rule');
        const rest = Array.from(item.children).filter((c) => c !== rule);
        gsap.to(rule, { scaleX: 1, duration: 1.4, ease: EASE.out, delay: k * 0.09 });
        gsap.to(rest, { opacity: 1, y: 0, duration: 1.1, ease: EASE.soft, delay: 0.15 + k * 0.09, stagger: 0.05 });
        item.dispatchEvent(new CustomEvent('ledger:enter', { detail: { delay: 0.2 + k * 0.09 } }));
      });
    },
  });
}

/** Hero entrance — used by the intro hand-off and on repeat visits. */
export function heroIn(delay = 0) {
  const lines = $$('[data-hero-line]');
  const fades = $$('[data-hero]');
  const art = $$('[data-hero-art]');
  if (reduceMotion) {
    gsap.set([...lines, ...fades, ...art], { opacity: 1 });
    return gsap.timeline();
  }
  const tl = gsap.timeline({ delay });
  lines.forEach((el, i) => {
    gsap.set(el, { opacity: 1 });
    const split = splitLines(el);
    tl.fromTo(split.lines, { yPercent: 110 }, { yPercent: 0, duration: 1.4, ease: EASE.out, stagger: 0.08 }, i * 0.12);
  });
  tl.fromTo(fades, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2, ease: EASE.soft, stagger: 0.08 }, 0.35);
  return tl;
}
