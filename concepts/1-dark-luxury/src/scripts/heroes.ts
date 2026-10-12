import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, lerp, EASE } from './util';

/**
 * Page 3 opening visuals — three ideas for «خبرات متعددة… تحت قيادة واحدة».
 *  A · the constellation: twenty-plus points on three orbits, every ray leading to the name
 *  B · many lines, one line: the firm's specialisms drift past in engraved gold, then gather into one line
 *  C · the arcade (الرواق): seven arches — the firm's seven leaders — receding toward one light
 * Each returns the element the house light rests on, its scroll/idle motion, and its entrance.
 */
export type Hero = {
  anchor: HTMLElement;
  /** scroll and idle motion (motion only) */
  setup: () => void;
  /** initial states before the entrance */
  prepare: () => void;
  /** adds the visual's entrance to the opening timeline */
  play: (tl: gsap.core.Timeline) => void;
};

export function createHero(page: HTMLElement, finePointer: boolean): Hero {
  const v = page.dataset.hero || 'a';
  if (v === 'b') return heroLines(page);
  if (v === 'c') return heroArcade(page, finePointer);
  return heroConstellation(page, finePointer);
}

/* ------------------------------------------------------------------ *
 * A · the constellation
 * ------------------------------------------------------------------ */
function heroConstellation(page: HTMLElement, finePointer: boolean): Hero {
  const svg = $<SVGSVGElement>('.constel', page);
  const orbits = $$<SVGGElement>('.cn__orbit', svg);
  const rings = $$<SVGCircleElement>('.cn__ring', svg);
  const pts = $$<SVGRectElement>('.cn__pt', svg);
  const rays = $$<SVGLineElement>('.cn__ray', svg);
  const core = $('.th__core', page);
  return {
    anchor: core,
    setup() {
      // three orbits turn at their own pace (outer slowest); the pointer tilts the field a little
      const speeds = [5.2, -3.4, 2.1]; // degrees per second
      const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
      if (finePointer) {
        window.addEventListener('pointermove', (e) => {
          ptr.tx = (e.clientX / window.innerWidth - 0.5) * 2;
          ptr.ty = (e.clientY / window.innerHeight - 0.5) * 2;
        }, { passive: true });
      }
      let visible = true;
      ScrollTrigger.create({ trigger: page, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });
      gsap.ticker.add((t) => {
        if (!visible) return;
        ptr.x = lerp(ptr.x, ptr.tx, 0.05);
        ptr.y = lerp(ptr.y, ptr.ty, 0.05);
        orbits.forEach((g, i) => {
          const depth = (i + 1) * 5;
          g.setAttribute('transform', `translate(${(-ptr.x * depth).toFixed(2)} ${(-ptr.y * depth).toFixed(2)}) rotate(${(t * speeds[i]).toFixed(3)})`);
        });
      });
      // leaving the opening, the field slowly gathers toward its centre
      gsap.to(svg, { scale: 0.9, opacity: 0.55, ease: 'none', scrollTrigger: { trigger: page, start: 'center center', end: 'bottom top', scrub: true } });
    },
    prepare() {
      gsap.set(rays, { attr: { 'stroke-dasharray': '1 1' }, strokeDashoffset: 1 });
      gsap.set(pts, { opacity: 0, scale: 0, transformOrigin: '50% 50%' });
      gsap.set(rings, { opacity: 0 });
      gsap.set(core, { opacity: 0, scale: 0.86 });
    },
    play(tl) {
      // points appear in a scattered order; then every ray finds the centre and the name lights
      const order = pts.map((_, i) => i).sort((a, b) => Math.sin(a * 91.7) - Math.sin(b * 91.7));
      tl.to(rings, { opacity: 1, duration: 1.6, ease: EASE.soft, stagger: 0.12 }, 0.05)
        .to(order.map((i) => pts[i]), { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(2.2)', stagger: 0.035 }, 0.15)
        .to(order.map((i) => rays[i]), { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: 0.03 }, 0.6)
        .to(core, { opacity: 1, scale: 1, duration: 1.4, ease: EASE.out }, 1.3);
    },
  };
}

/* ------------------------------------------------------------------ *
 * B · many lines, one line
 * ------------------------------------------------------------------ */
function heroLines(page: HTMLElement): Hero {
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

/* ------------------------------------------------------------------ *
 * C · the arcade (الرواق)
 * ------------------------------------------------------------------ */
function heroArcade(page: HTMLElement, finePointer: boolean): Hero {
  const stage = $('.rq', page);
  const world = $('.rq__world', page);
  const arches = $$<SVGPathElement>('.rq__arch path', page);
  const light = $('.rq__light', page);
  const haze = $('.rq__haze', page);
  const floor = $('.rq__floor', page);
  return {
    anchor: light,
    setup() {
      // the pointer moves the viewpoint a little, as if stepping to one side of the arcade
      if (finePointer) {
        const o = { x: 50, y: 44, tx: 50, ty: 44 };
        window.addEventListener('pointermove', (e) => {
          o.tx = 50 + (e.clientX / window.innerWidth - 0.5) * 16;
          o.ty = 44 + (e.clientY / window.innerHeight - 0.5) * 10;
        }, { passive: true });
        let visible = true;
        ScrollTrigger.create({ trigger: page, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });
        gsap.ticker.add(() => {
          if (!visible) return;
          o.x = lerp(o.x, o.tx, 0.05);
          o.y = lerp(o.y, o.ty, 0.05);
          stage.style.perspectiveOrigin = `${o.x.toFixed(2)}% ${o.y.toFixed(2)}%`;
        });
      }
      // scrolling walks down the arcade, toward the light
      gsap.to(world, { z: 520, ease: 'none', scrollTrigger: { trigger: page, start: 'top top', end: 'bottom top', scrub: 0.6 } });
      // fromTo: the opening is still hidden when this is set up, so the start must be stated
      gsap.fromTo(stage, { opacity: 1 }, { opacity: 0.4, ease: 'none', immediateRender: false, scrollTrigger: { trigger: page, start: 'center top', end: 'bottom top', scrub: true } });
    },
    prepare() {
      gsap.set(arches, { attr: { 'stroke-dasharray': '1 1' }, strokeDashoffset: 1 });
      gsap.set([light, haze], { opacity: 0, scale: 0.6 });
      gsap.set(floor, { opacity: 0 });
    },
    play(tl) {
      // the light at the far end comes on first; then the arches are drawn from the far end toward us
      tl.to([light, haze], { opacity: 1, scale: 1, duration: 1.6, ease: EASE.out }, 0.1)
        .to(floor, { opacity: 1, duration: 1.8, ease: EASE.soft }, 0.4);
      const far = [...arches].reverse();
      tl.to(far, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut', stagger: 0.11 }, 0.35);
    },
  };
}

