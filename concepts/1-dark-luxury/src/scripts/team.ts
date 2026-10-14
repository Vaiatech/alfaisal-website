import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';
import type { Odo } from './odo';
import { $, $$, EASE, splitWords, wipeIn } from './util';
import { createHero } from './heroes';

type SceneLight = { i: number; r: number; anchor?: HTMLElement | null };
type Ctx = {
  FX: boolean;
  finePointer: boolean;
  isMobile: () => boolean;
  lenis: Lenis | null;
  sceneLight: Record<string, SceneLight>;
  odos: Map<HTMLElement, Odo>;
  hdr: HTMLElement;
  /** the house light's intensity (0 → 1), shared with the WebGL lamp */
  lamp: { v: number };
};

/**
 * PAGE 3 · فريقنا
 * - Opening: the firm's specialisms drift past in engraved gold, then gather onto one gold line.
 * - Leadership: three arches; the frame is drawn in gold, the portrait rises into the light.
 * - Groups: a portrait medallion and the group's name; hovering either (or tapping) drops the scope of work.
 */
export function createTeamPage(ctx: Ctx) {
  const page = document.querySelector<HTMLElement>('.th');
  const noop = () => {};
  if (!page) return { setup: noop, enter: (_open: () => void) => {}, setupStatic: noop };

  const { FX, finePointer, isMobile, sceneLight } = ctx;

  /* ---------------------------------------------------------------- *
   * GROUPS — the dropdown (works with and without motion)
   * ---------------------------------------------------------------- */
  function setupGroups(animate: boolean) {
    const list = $('.grp__list');
    const cards = $$('.gc', list);
    const medals = cards.map((c) => $('.gc__medal', c));
    let open = -1;
    let hoverAt = 0;
    const timers = new Map<number, number>();
    // a pointer that can hover gets the overlay dropdown; touch and narrow screens get an in-flow accordion
    const overlay = () => finePointer && !isMobile();

    const show = (i: number) => {
      if (open === i) return;
      if (open > -1) hide(open);
      open = i;
      const c = cards[i];
      const drop = $('.gc__drop', c);
      const items = $$('.gc__pn, .gc__k, .gc__scope li', c);
      c.classList.add('is-open');
      list.classList.add('has-open');
      $('.gc__trigger', c).setAttribute('aria-expanded', 'true');
      if (sceneLight.groups) sceneLight.groups.anchor = medals[i];
      gsap.killTweensOf([drop, items, $('.gc__thread', c)]);
      if (!animate) { gsap.set(drop, { clearProps: 'all' }); return; }
      if (overlay()) {
        gsap.fromTo($('.gc__thread', c), { scaleY: 0 }, { scaleY: 1, duration: 0.35, ease: EASE.io });
        // the scope rises over the card itself, like a page drawn up over the portrait
        gsap.fromTo(drop, { clipPath: 'inset(100% 0% 0% 0% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 0.65, ease: EASE.io });
      } else {
        gsap.fromTo(drop, { height: 0 }, { height: 'auto', duration: 0.6, ease: EASE.io, onComplete: () => { gsap.set(drop, { clearProps: 'height' }); } });
      }
      gsap.fromTo(items, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, ease: EASE.out, stagger: 0.035, delay: overlay() ? 0.22 : 0.15 });
    };
    function hide(i: number) {
      const c = cards[i];
      const drop = $('.gc__drop', c);
      $('.gc__trigger', c).setAttribute('aria-expanded', 'false');
      if (open === i) { open = -1; list.classList.remove('has-open'); }
      if (sceneLight.groups) sceneLight.groups.anchor = medals[0];
      gsap.killTweensOf(drop);
      const done = () => { if (open !== i) { c.classList.remove('is-open'); gsap.set(drop, { clearProps: 'clipPath,height' }); } };
      if (!animate) { done(); return; }
      if (overlay()) gsap.to(drop, { clipPath: 'inset(100% 0% 0% 0% round 28px)', duration: 0.42, ease: 'power2.in', onComplete: done });
      else gsap.to(drop, { height: 0, duration: 0.42, ease: EASE.io, onComplete: done });
    }

    cards.forEach((c, i) => {
      const trigger = $<HTMLButtonElement>('.gc__trigger', c);
      // the brief: hovering the leader's portrait or the group's name opens its scope
      $$('[data-hover]', c).forEach((el) => el.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || !overlay()) return;
        clearTimeout(timers.get(i));
        hoverAt = performance.now();
        show(i);
      }));
      // it stays open while the pointer is anywhere on the card or its list
      c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') clearTimeout(timers.get(i)); });
      c.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse' || !overlay() || open !== i) return;
        timers.set(i, window.setTimeout(() => { if (open === i) hide(i); }, 220));
      });
      trigger.addEventListener('click', () => {
        // a click right after the hover opened it should not close it again
        if (open === i && performance.now() - hoverAt < 600) return;
        if (open === i) hide(i); else show(i);
      });
      c.addEventListener('focusout', (e) => {
        if (open === i && !c.contains(e.relatedTarget as Node | null)) hide(i);
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || open < 0) return;
      const i = open;
      hide(i);
      $<HTMLButtonElement>('.gc__trigger', cards[i]).focus();
    });
    document.addEventListener('pointerdown', (e) => {
      if (open > -1 && !cards[open].contains(e.target as Node)) hide(open);
    });
    if (sceneLight.groups) sceneLight.groups.anchor = medals[0];
  }

  // the opening's visual: «سطور كثيرة… سطر واحد» (heroes.ts)
  const hero = createHero(page);
  const count = $('.th__count', page);
  const countOdo = count ? $('.odo', count) : null;

  /* ---------------------------------------------------------------- *
   * LEADERSHIP — arches
   * ---------------------------------------------------------------- */
  function setupLeadership() {
    const items = $$('.ldr__item');
    const featured = $<HTMLElement>('.ldr__item.is-featured .arch') || $<HTMLElement>('.ldr__item .arch');
    items.forEach((it, i) => {
      const fig = $('.arch', it);
      const frame = $<SVGPathElement>('.arch__frame path', it);
      const win = $('.arch__win', it);
      const img = $('.arch__img', it);
      const meta = $$('.ldr__label, .ldr__role, .ldr__creds, .ldr__rule', it);
      const name = splitWords($('.ldr__name', it));
      const bio = $('.ldr__bio', it);
      gsap.set(frame, { attr: { 'stroke-dasharray': '1 1' }, strokeDashoffset: 1 });
      gsap.set(win, { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 6px 6px)' });
      gsap.set(img, { yPercent: 14, scale: 1.06 });
      gsap.set(meta, { opacity: 0, y: 12 });
      gsap.set(name, { yPercent: 118 });
      bio.classList.add('wiping');
      bio.style.setProperty('--wp', '0');
      const d = isMobile() ? 0 : i * 0.16;
      ScrollTrigger.create({
        trigger: it,
        start: 'top 82%',
        once: true,
        onEnter: () => {
          const tl = gsap.timeline({ delay: d });
          tl.to(frame, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut' }, 0)
            .to(win, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 6px 6px)', duration: 1.25, ease: EASE.io }, 0.25)
            .to(img, { yPercent: 0, scale: 1, duration: 1.6, ease: EASE.out }, 0.35)
            .to(meta, { opacity: 1, y: 0, duration: 1, ease: EASE.out, stagger: 0.08 }, 0.7)
            .to(name, { yPercent: 0, duration: 1.1, ease: EASE.out, stagger: 0.05 }, 0.8)
            .add(() => wipeIn(bio, { duration: 1.5 }), 1.0)
            .add(() => fig.classList.add('is-lit'), 1.1);
        },
      });

      // a fine pointer tilts the arch toward it, and the house light comes to rest behind it
      if (finePointer) {
        const rx = gsap.quickTo(fig, 'rotationX', { duration: 0.8, ease: EASE.soft });
        const ry = gsap.quickTo(fig, 'rotationY', { duration: 0.8, ease: EASE.soft });
        gsap.set(fig, { transformPerspective: 1000 });
        fig.addEventListener('pointerenter', () => {
          it.classList.add('is-hover');
          if (sceneLight.leadership) sceneLight.leadership.anchor = fig;
        });
        fig.addEventListener('pointermove', (e) => {
          const r = fig.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          ry(px * 7);
          rx(-py * 5);
          fig.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
          fig.style.setProperty('--my', `${(py + 0.5) * 100}%`);
        });
        fig.addEventListener('pointerleave', () => {
          it.classList.remove('is-hover');
          if (sceneLight.leadership) sceneLight.leadership.anchor = featured;
          rx(0); ry(0);
        });
      }
    });
    // without a pointer, the light follows the arch nearest the middle of the screen
    if (sceneLight.leadership) sceneLight.leadership.anchor = featured;
    if (!finePointer) {
      const figs = $$('.ldr__item .arch');
      ScrollTrigger.create({
        trigger: '.ldr',
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: () => {
          const mid = window.innerHeight / 2;
          let best = figs[0], bd = Infinity;
          figs.forEach((f) => { const r = f.getBoundingClientRect(); const dd = Math.abs(r.top + r.height / 2 - mid); if (dd < bd) { bd = dd; best = f; } });
          if (sceneLight.leadership) sceneLight.leadership.anchor = best;
        },
      });
    }
  }

  /* ---------------------------------------------------------------- *
   * GROUPS — entrance
   * ---------------------------------------------------------------- */
  function groupsEntrance() {
    const cards = $$('.gc');
    cards.forEach((c, i) => {
      const orbit = $<SVGCircleElement>('.gc__orbit circle', c);
      const disc = $('.gc__disc', c);
      const name = splitWords($('.gc__name', c));
      const rest = $$('.gc__idx, .gc__lead, .gc__cue', c);
      gsap.set(orbit, { strokeDashoffset: 100 });
      gsap.set(disc, { scale: 0.82, opacity: 0 });
      gsap.set(name, { yPercent: 118 });
      gsap.set(rest, { opacity: 0, y: 10 });
      ScrollTrigger.create({
        trigger: c,
        start: 'top 86%',
        once: true,
        onEnter: () => {
          const tl = gsap.timeline({ delay: isMobile() ? 0 : i * 0.12 });
          tl.to(orbit, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, 0)
            .to(disc, { scale: 1, opacity: 1, duration: 1.2, ease: EASE.out }, 0.2)
            .to(name, { yPercent: 0, duration: 1.1, ease: EASE.out, stagger: 0.04 }, 0.4)
            .to(rest, { opacity: 1, y: 0, duration: 1, ease: EASE.out, stagger: 0.08 }, 0.6);
        },
      });
    });
  }

  return {
    /** motion: everything that depends on scroll; called once fonts are ready */
    setup() {
      sceneLight['team-hero'].anchor = hero.anchor;
      hero.setup();
      setupLeadership();
      groupsEntrance();
      setupGroups(true);
    },
    /** the page's opening: the visual assembles while the words rise, and the house light comes on */
    enter(openVeil: () => void) {
      const l1 = splitWords($('.th__l1', page));
      const l2 = splitWords($('.th__l2', page));
      const body = $$('.th__body p', page);
      const eyebrow = $('.th__eyebrow', page);
      gsap.set([...l1, ...l2], { yPercent: 118 });
      body.forEach((b) => { b.classList.add('wiping'); b.style.setProperty('--wp', '0'); });
      gsap.set(eyebrow, { '--rule': 0, opacity: 0 });
      hero.prepare();
      if (count) gsap.set(count, { opacity: 0, y: 14 });
      const odo = countOdo ? ctx.odos.get(countOdo) : undefined;
      if (countOdo) $$('.strip', countOdo).forEach((s) => gsap.set(s, { yPercent: 0 }));

      const arriving = document.documentElement.classList.contains('is-arriving');
      document.documentElement.classList.remove('is-intro');
      ctx.lenis?.start();
      openVeil();
      const tl = gsap.timeline({ delay: arriving ? 0.35 : 0.1 });
      // arriving under the veil, the header is already in place; on a fresh load it drops in
      if (!arriving) tl.fromTo(ctx.hdr, { yPercent: -110 }, { yPercent: 0, duration: 1, ease: EASE.out, clearProps: 'transform' }, 0);
      tl.to(ctx.lamp, { v: 1, duration: 2, ease: 'power2.out' }, 0);
      hero.play(tl);
      tl.to(eyebrow, { opacity: 1, '--rule': 1, duration: 1.1, ease: EASE.out }, 0.15)
        .to(l1, { yPercent: 0, duration: 1.05, ease: EASE.out, stagger: 0.06 }, 0.25)
        .to(l2, { yPercent: 0, duration: 1.05, ease: EASE.out, stagger: 0.05 }, 0.45)
        .add(() => body.forEach((b, i) => wipeIn(b, { delay: i * 0.12, duration: 1.3 })), 0.7)
        .fromTo('.th + .link--hero', { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.4);
      if (count) tl.to(count, { opacity: 1, y: 0, duration: 1, ease: EASE.out }, 1.7).add(() => { odo?.play(0); }, 1.7);
    },
    /** reduced motion: the complete page, still — only the dropdown works */
    setupStatic() {
      setupGroups(false);
    },
  };
}