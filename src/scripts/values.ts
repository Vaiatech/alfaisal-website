import { gsap, ScrollTrigger, reduceMotion, $, $$, clamp } from './env';

/*
  Values: the section pins and the six words travel across it, right to left in
  reading order. The word nearest the centre comes forward in ink; the others
  wait in a lighter tone.
*/
export function initValues() {
  const stage = $('[data-values-stage]');
  const track = $('[data-values-track]');
  if (!stage || !track) return;
  const words = $$('[data-vword]', track);
  const index = $('[data-values-index]', stage);
  const bar = $('[data-values-progress]', stage);

  const emphasise = () => {
    const mid = innerWidth / 2;
    let best = 0;
    let bestD = Infinity;
    words.forEach((w, i) => {
      const r = w.querySelector('.vword__name')!.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      const a = clamp(1 - d / (innerWidth * 0.42), 0.12, 1);
      w.style.setProperty('--a', a.toFixed(3));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (index) index.textContent = String(best + 1).padStart(2, '0');
  };

  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    if (reduceMotion) {
      words.forEach((w) => w.style.setProperty('--a', '1'));
      return;
    }
    const distance = () => Math.max(0, track.offsetWidth - innerWidth);
    const tween = gsap.to(track, {
      x: () => distance(), // RTL: the track starts on the right and moves rightward
      ease: 'none',
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.7,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (bar) bar.style.transform = `scaleX(${self.progress})`;
          emphasise();
        },
        onRefresh: emphasise,
      },
    });
    emphasise();
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(track, { clearProps: 'transform' });
      words.forEach((w) => w.style.removeProperty('--a'));
    };
  });
  ScrollTrigger.refresh();
}
