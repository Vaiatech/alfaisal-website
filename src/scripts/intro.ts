import { gsap, root, lenis, $, $$ } from './env';
import { heroIn } from './reveal';

/*
  First visit only.
  1. The pen is drawn top to bottom.
  2. The calligraphy is written stroke by stroke, along its own skeleton.
  3. The scale drops in and swings until it settles level.
  4. The mark glides into its place in the hero while the page appears around it.
*/

const WRITE_TIME = 1.55;

export function runIntro(): Promise<void> {
  const overlay = $('[data-intro]')!;
  const mark = overlay.querySelector<SVGSVGElement>('svg')!;
  const strokes = $$<SVGPathElement>('.ink-stroke', mark);
  const penClip = mark.querySelector('.pen-clip')!;
  const scale = mark.querySelector('.lg-scale-g')!;
  const name = $('[data-intro-name]', overlay)!;
  const skip = $('[data-intro-skip]', overlay)!;
  const bg = $('[data-intro-bg]', overlay)!;
  const heroArt = $('[data-hero-art]')!;
  const heroMark = heroArt.querySelector('svg')!;
  const header = $('[data-header]')!;

  window.scrollTo(0, 0);
  lenis?.stop();
  root.classList.add('intro-ready');

  return new Promise((resolve) => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

    // 1 — pen
    tl.to(penClip, { attr: { height: 800 }, duration: 1.05, ease: 'power3.inOut' }, 0.1);

    // 2 — calligraphy, paced by each stroke's real length
    const lens = strokes.map((s) => Number(s.dataset.l) || 50);
    const total = lens.reduce((a, b) => a + b, 0);
    let acc = 0;
    strokes.forEach((s, i) => {
      const at = 0.45 + (acc / total) * WRITE_TIME;
      const dur = Math.max(0.14, (lens[i] / total) * WRITE_TIME * 2.1);
      tl.to(s, { strokeDashoffset: 0, duration: dur, ease: 'sine.inOut' }, at);
      acc += lens[i];
    });
    tl.to(name, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0.5);

    // 3 — the scale finds its balance
    tl.fromTo(
      scale,
      { opacity: 0, rotation: -10, y: -14, svgOrigin: '835 41' },
      { opacity: 1, rotation: 0, y: 0, svgOrigin: '835 41', duration: 1.9, ease: 'elastic.out(1, 0.32)' },
      0.45 + WRITE_TIME - 0.15,
    );

    // 4 — hand-off to the hero
    const handoff = 0.45 + WRITE_TIME + 0.55;
    tl.add(() => {
      // remove the mask so every stroke is fully solid
      mark.querySelector('.lg-callig-g')?.removeAttribute('mask');
      mark.querySelector('.lg-pen-g')?.removeAttribute('clip-path');
      const from = mark.getBoundingClientRect();
      const to = heroMark.getBoundingClientRect();
      const s = to.width / from.width;
      gsap
        .timeline({
          onComplete: () => {
            gsap.set(heroArt, { opacity: 1 });
            overlay.style.display = 'none';
            root.classList.remove('has-intro', 'intro-ready');
            try { sessionStorage.setItem('alf-intro', '1'); } catch {}
            if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
            lenis?.start();
            resolve();
          },
        })
        .to(mark, { x: to.left - from.left, y: to.top - from.top, scale: s, duration: 1.25, ease: 'expo.inOut' }, 0)
        .to(name, { opacity: 0, duration: 0.4 }, 0)
        .to(skip, { opacity: 0, duration: 0.3 }, 0)
        .to(bg, { opacity: 0, duration: 1.0, ease: 'power2.inOut' }, 0.3)
        .fromTo(header, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', clearProps: 'transform,opacity' }, 0.7)
        .add(heroIn(), 0.55);
    }, handoff);

    // Skip / impatience: fast-forward rather than cut.
    const hurry = () => tl.timeScale(4);
    skip.addEventListener('click', hurry, { once: true });
    window.addEventListener('keydown', hurry, { once: true });
    window.addEventListener('wheel', hurry, { once: true, passive: true });
    window.addEventListener('touchstart', hurry, { once: true, passive: true });
  });
}
