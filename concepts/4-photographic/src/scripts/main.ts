/* Al-Faisal — Concept 4 «ضوء الروشان»
   One motion vocabulary: expo.out for arrivals, power3.inOut for hand-offs,
   right-to-left ink wipes for running text, and the rhombus aperture for every transition. */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const RM = root.classList.contains('rm');
const mq = (q: string) => window.matchMedia(q).matches;
const PHONE = mq('(max-width: 760px)');
const WIDE = mq('(min-width: 961px)');
const $ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => el.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => [...el.querySelectorAll(s)] as T[];
const OUT = 'expo.out';
const IO = 'power3.inOut';
const DIAMOND_FULL = 'polygon(50% -60%, 160% 50%, 50% 160%, -60% 50%)';
const diamondAt = (x: string, y: string) => `polygon(${x} ${y}, ${x} ${y}, ${x} ${y}, ${x} ${y})`;
const DIAMOND_ZERO = diamondAt('50%', '50%');

/* ------------------------------------------------------------------ images */
for (const img of $$<HTMLImageElement>('.ph img')) {
  const on = () => img.classList.add('is-in');
  if (img.complete && img.naturalWidth) on();
  else img.addEventListener('load', on, { once: true });
}

/* ------------------------------------------------------------------ smooth scroll */
let lenis: Lenis | null = null;
if (!RM) {
  lenis = new Lenis({ lerp: 0.095, smoothWheel: true, wheelMultiplier: 0.95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  (window as any).__lenis = lenis;
}
const scrollToEl = (el: Element | number, immediate = true) => {
  if (lenis) lenis.scrollTo(el as HTMLElement, { immediate, force: true, offset: 0 });
  else if (typeof el === 'number') window.scrollTo(0, el);
  else (el as HTMLElement).scrollIntoView();
};

/* ------------------------------------------------------------------ header */
const head = $('#head');
const setSolid = () => head.classList.toggle('is-solid', window.scrollY > 40);
setSolid();
window.addEventListener('scroll', setSolid, { passive: true });

/* ------------------------------------------------------------------ veil: the rhombus aperture */
const veil = $('#veil');
const veilFill = $('.veil__fill', veil);
const veilEdge = $<SVGPolygonElement>('.veil__edge polygon', veil);
const veilLabel = $('.veil__label', veil);
const edgePts = (r: number) => `50,${50 - r} ${50 + r},50 50,${50 + r} ${50 - r},50`;
const names: Record<string, string> = { '#top': 'الرئيسية', '#about': 'من نحن', '#expertise': 'خبراتنا', '#method': 'منهجيتنا', '#contact': 'تواصل معنا', '#numbers': 'الأرقام', '#values': 'قيمنا' };
let veilBusy = false;
function transitionTo(hash: string) {
  const target = $(hash);
  if (!target) return;
  if (RM || veilBusy) { scrollToEl(target); return; }
  veilBusy = true;
  const idx = ['#top', '#about', '#expertise', '#method', '#team', '#contact'].indexOf(hash);
  $('span', veilLabel).textContent = idx >= 0 ? String(idx + 1).padStart(2, '0') : '';
  $('strong', veilLabel).textContent = names[hash] ?? '';
  const st = { r: 0 };
  const draw = () => {
    veilFill.style.clipPath = `polygon(50% ${50 - st.r}%, ${50 + st.r}% 50%, 50% ${50 + st.r}%, ${50 - st.r}% 50%)`;
    veilEdge.setAttribute('points', edgePts(st.r * 1.02));
  };
  gsap.timeline({ onComplete: () => { veilBusy = false; gsap.set(veil, { visibility: 'hidden' }); } })
    .set(veil, { visibility: 'visible' })
    .to(st, { r: 102, duration: 0.62, ease: 'power3.in', onUpdate: draw })
    .to(veilLabel, { opacity: 1, duration: 0.25 }, '-=0.2')
    .add(() => { scrollToEl(target); ScrollTrigger.update(); })
    .to(veilLabel, { opacity: 0, duration: 0.25 }, '+=0.18')
    .to(st, { r: 0, duration: 0.75, ease: 'power3.out', onUpdate: draw }, '<');
}

/* soon note (فريقنا) */
const soon = $('#soon-note');
let soonT = 0;
const showSoon = () => {
  soon.classList.add('is-on');
  clearTimeout(soonT);
  soonT = window.setTimeout(() => soon.classList.remove('is-on'), 3200);
};

/* ------------------------------------------------------------------ mobile menu */
const sheetMenu = $('#sheet-menu');
const menuBtn = $('.menu-btn');
let menuOpen = false;
function setMenu(open: boolean) {
  menuOpen = open;
  menuBtn.setAttribute('aria-expanded', String(open));
  sheetMenu.setAttribute('aria-hidden', String(!open));
  root.classList.toggle('menu-open', open);
  $$('a', sheetMenu).forEach((a) => a.setAttribute('tabindex', open ? '0' : '-1'));
  if (open) {
    lenis?.stop();
    gsap.set(sheetMenu, { visibility: 'visible' });
    gsap.fromTo(sheetMenu, { clipPath: diamondAt('50%', '0%') }, { clipPath: 'polygon(50% -100%, 200% 50%, 50% 200%, -100% 50%)', duration: RM ? 0 : 0.8, ease: IO });
    gsap.fromTo($$('li', sheetMenu), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: RM ? 0 : 0.9, ease: OUT, stagger: 0.05, delay: RM ? 0 : 0.25 });
  } else {
    lenis?.start();
    gsap.to(sheetMenu, { clipPath: diamondAt('50%', '0%'), duration: RM ? 0 : 0.6, ease: IO, onComplete: () => { gsap.set(sheetMenu, { visibility: 'hidden' }); } });
  }
}
menuBtn.addEventListener('click', () => setMenu(!menuOpen));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

for (const a of $$<HTMLAnchorElement>('[data-go]')) {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const hash = a.dataset.go!;
    if (a.hasAttribute('data-soon')) { if (menuOpen) setMenu(false); showSoon(); return; }
    if (menuOpen) { setMenu(false); setTimeout(() => transitionTo(hash), 380); return; }
    transitionTo(hash);
  });
}

/* ------------------------------------------------------------------ text primitives */
const splits = new Map<Element, SplitText>();
function inkLines(el: Element) {
  // Running text is written in, line by line, right to left — like the pen in the hero.
  let s = splits.get(el);
  if (!s) { s = new SplitText(el, { type: 'lines', linesClass: 'ink-line' }); splits.set(el, s); }
  gsap.set(el, { clipPath: 'none' });
  return s.lines as HTMLElement[];
}
function inkIn(el: Element, delay = 0, dur = 1.15) {
  const lines = inkLines(el);
  gsap.set(lines, { clipPath: 'inset(-20% 0% -20% 100%)' });
  return gsap.to(lines, { clipPath: 'inset(-20% 0% -20% 0%)', duration: dur, ease: 'power2.inOut', stagger: 0.16, delay });
}
function riseIn(els: Element | Element[], delay = 0) {
  return gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: OUT, stagger: 0.08, delay });
}

/* generic reveals outside the scripted scenes */
function bindReveals() {
  if (RM) return;
  for (const el of $$('[data-rise]').filter((e) => !e.closest('.hero'))) {
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => riseIn(el) });
  }
  for (const el of $$('[data-ink]').filter((e) => !e.closest('.hero') && !e.closest('.story'))) {
    ScrollTrigger.create({ trigger: el, start: 'top 86%', once: true, onEnter: () => inkIn(el) });
  }
}

/* ------------------------------------------------------------------ odometer (rolling + developing digits) */
function roll(odo: HTMLElement, dur = 2.2, delay = 0) {
  const digs = $$('.dg', odo);
  const tl = gsap.timeline({ delay });
  digs.forEach((dg, i) => {
    const reel = $('.reel', dg);
    const d = Number(getComputedStyle(dg).getPropertyValue('--d'));
    const h = dg.getBoundingClientRect().height;
    gsap.set(reel, { y: 0 });
    reel.style.transform = 'translateY(0)';
    // later digits travel further and land later: the number settles from the left (most significant) outwards
    tl.to(reel, { y: -(10 + d) * h, duration: dur + (digs.length - i) * 0.12, ease: 'expo.out' }, i * 0.05);
  });
  return tl;
}
function primeOdo(odo: HTMLElement) {
  for (const reel of $$('.reel', odo)) { reel.style.transform = 'translateY(0)'; }
}

/* ------------------------------------------------------------------ HERO */
const heroVideo = $<HTMLVideoElement>('#hero-video');
function startVideo() {
  if (PHONE || RM || !heroVideo) return;
  const webm = heroVideo.canPlayType('video/webm; codecs="vp9"');
  heroVideo.src = webm ? heroVideo.dataset.webm! : heroVideo.dataset.mp4!;
  heroVideo.load();
  const p = heroVideo.play();
  heroVideo.addEventListener('playing', () => heroVideo.classList.add('is-playing'), { once: true });
  p?.catch(() => {});
  ScrollTrigger.create({ trigger: '#top', start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? heroVideo.play().catch(() => {}) : heroVideo.pause()) });
}

const heroLines = $$('.hero__title .line-mask > span');
const heroBodyPs = $$('#hero-body p');
function heroPrime() {
  if (RM) return;
  gsap.set(heroLines, { yPercent: 108 });
  gsap.set($$('.hero [data-rise]'), { opacity: 0, y: 26 });
}
function heroIn() {
  if (RM) return gsap.timeline();
  const tl = gsap.timeline();
  tl.to(heroLines, { yPercent: 0, duration: 1.25, ease: OUT, stagger: 0.12 })
    .to($$('.hero [data-rise]'), { opacity: 1, y: 0, duration: 1.1, ease: OUT, stagger: 0.08 }, 0.25);
  if (!WIDE) heroBodyPs.forEach((p, i) => tl.add(inkIn(p, 0, 1.2), 0.7 + i * 0.35));
  return tl;
}
function heroScroll() {
  if (RM) return;
  const media = $('#hero-media');
  const col = $('#hero-col');
  const knot = $('#hero-knot');
  if (WIDE) {
    const body = $('#hero-body');
    const shift = () => body.offsetHeight / 2 + 15;
    heroBodyPs.forEach((p) => { const ls = inkLines(p); gsap.set(ls, { clipPath: 'inset(-20% 0% -20% 100%)' }); });
    gsap.set(col, { y: shift() });
    // the wrapper is 235vh: the hero sits sticky for 135vh of scroll (see CSS)
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#hero-wrap', start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true },
      defaults: { ease: 'none' },
    });
    tl.to(col, { y: 0, duration: 0.22, ease: 'power2.out' }, 0);
    heroBodyPs.forEach((p, i) => tl.to(inkLines(p), { clipPath: 'inset(-20% 0% -20% 0%)', duration: 0.14, stagger: 0.05 }, 0.05 + i * 0.17));
    tl.to(media, { scale: 1.06, duration: 1 }, 0)
      .to([col, '.hero__foot', '.hero__plate'], { opacity: 0, y: -30, duration: 0.1 }, 0.52)
      // the frame closes into a rhombus; the next scene is already rising beneath it
      .fromTo(media, { clipPath: DIAMOND_FULL }, { clipPath: DIAMOND_ZERO, ease: 'power2.inOut', duration: 0.4 }, 0.56)
      .fromTo(knot, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 0.05 }, 0.93)
      .to(knot, { opacity: 0, duration: 0.04 }, 0.98);
  } else {
    // tablets and phones: no pin, the frame simply closes as it leaves
    gsap.fromTo(media, { clipPath: DIAMOND_FULL }, {
      clipPath: DIAMOND_ZERO, ease: 'power2.in',
      scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
    gsap.to([col, '.hero__foot'], { opacity: 0, y: -40, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: '55% top', scrub: true } });
  }
}

/* ------------------------------------------------------------------ INTRO */
function nibTarget() {
  // where the real nib sits on screen: object-fit cover, object-position 57% 72%, source 16:9, tip at (57.5%, 77.4%)
  const W = window.innerWidth, H = window.innerHeight;
  const s = Math.max(W / 1600, H / 900);
  const w = 1600 * s, h = 900 * s;
  const x0 = (W - w) * 0.57, y0 = (H - h) * 0.72;
  return { x: x0 + 0.575 * w, y: y0 + 0.774 * h, nibW: 0.062 * w };
}
function runIntro(): Promise<void> {
  const intro = $('#intro');
  return new Promise((resolve) => {
    if (RM || !intro) { intro?.classList.add('is-done'); resolve(); return; }
    let seen = false;
    try { seen = sessionStorage.getItem('af4-intro') === '1'; sessionStorage.setItem('af4-intro', '1'); } catch { /* private mode */ }
    lenis?.stop();
    window.scrollTo(0, 0);
    const mark = $('#intro-mark');
    const pen = $('.intro__pen', intro);
    const scale = $('.intro__scale', intro);
    const cal = $('use[mask]', mark);
    const strokes = $$<SVGPathElement>('.wstroke', intro);
    const name = $('.intro__name', intro);
    const bar = $('.intro__bar i', intro);

    // the ink layer with a rhombus hole that will open around the nib
    const ink = document.createElement('div');
    ink.style.cssText = 'position:absolute;inset:0;background:var(--ink);z-index:-1';
    intro.style.background = 'transparent';
    intro.prepend(ink);

    // place the mark in px so we can transform around the nib tip
    const r = mark.getBoundingClientRect();
    gsap.set(mark, { left: r.left, top: r.top, xPercent: 0, yPercent: 0, x: 0, y: 0, transform: 'none' });
    const VB = { x: 110, y: -8, w: 810, h: 830 };
    const ox = ((733 - VB.x) / VB.w) * r.width;
    const oy = ((773 - VB.y) / VB.h) * r.height;
    gsap.set(mark, { transformOrigin: `${ox}px ${oy}px` });
    const tip = { x: r.left + ox, y: r.top + oy };
    const tgt = nibTarget();
    const penW = (48 / VB.w) * r.width;
    const S = Math.max(2.4, Math.min(9, tgt.nibW / penW));

    const total = strokes.reduce((a, s) => a + Number(s.dataset.l), 0);
    const writeDur = seen ? 0.9 : 1.75;
    const tl = gsap.timeline({
      onComplete: () => { intro.classList.add('is-done'); lenis?.start(); resolve(); },
    });
    gsap.set([pen, scale], { opacity: 0 });
    gsap.set(pen, { y: -40 });
    tl.to(bar, { scaleX: 1, duration: writeDur + 0.5, ease: 'power1.inOut' }, 0);
    let t = 0.15;
    for (const s of strokes) {
      const d = (Number(s.dataset.l) / total) * writeDur;
      tl.to(s, { strokeDashoffset: 0, duration: d, ease: 'none' }, t);
      t += d * 0.92;
    }
    tl.to(pen, { opacity: 1, y: 0, duration: 0.8, ease: OUT }, 0.35)
      .to(scale, { opacity: 1, duration: 0.7, ease: OUT }, writeDur * 0.7)
      .to(name, { opacity: 1, duration: 0.8, ease: OUT }, writeDur * 0.55)
      .add('cut', writeDur + 0.45)
      .add(() => { startVideo(); }, 'cut-=0.6')
      // the match cut: the logo's nib travels to the real nib, takes its angle and size
      .to([cal, scale], { opacity: 0, duration: 0.35, ease: 'power2.in' }, 'cut')
      .to([name, '.intro__bar', '.intro__skip'], { opacity: 0, duration: 0.3 }, 'cut')
      .to(mark, { x: tgt.x - tip.x, y: tgt.y - tip.y, rotation: 36, scale: S, duration: 1.05, ease: IO }, 'cut')
      // the cream pen of the logo darkens into the silhouette of the real steel nib
      .to($$('use', pen), { attr: { fill: '#07080b' }, duration: 0.9, ease: 'power2.inOut' }, 'cut+=0.3');
    // aperture opens around the nib
    const W = window.innerWidth, H = window.innerHeight;
    const ap = { r: 0 };
    const drawAp = () => {
      const { x, y } = tgt; const rr = ap.r;
      ink.style.clipPath = `polygon(evenodd, 0px 0px, ${W}px 0px, ${W}px ${H}px, 0px ${H}px, 0px 0px, ${x}px ${y - rr}px, ${x + rr}px ${y}px, ${x}px ${y + rr}px, ${x - rr}px ${y}px, ${x}px ${y - rr}px)`;
    };
    tl.to(ap, { r: Math.hypot(W, H) * 1.05, duration: 1.15, ease: 'power3.in', onUpdate: drawAp }, 'cut+=0.55')
      .to(mark, { opacity: 0, duration: 0.5, ease: 'power1.in' }, 'cut+=0.85')
      .add(() => { heroIn(); }, 'cut+=1.05');
    if (seen) tl.timeScale(1.5);
    const skip = () => { tl.timeScale(6); };
    intro.addEventListener('click', skip, { once: true });
    window.addEventListener('wheel', skip, { once: true, passive: true });
    window.addEventListener('keydown', skip, { once: true });
  });
}

/* ------------------------------------------------------------------ NUMBERS */
function numbersScene() {
  const thread = $('#numbers-thread');
  const tally = $('#tally');
  const leadOdo = $('.tally__digits .odo', tally);
  const frames = $$('.frame');
  if (RM) return;
  gsap.fromTo(thread, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#numbers', start: WIDE ? 'top 40%' : 'top bottom', end: WIDE ? 'top -10%' : 'top 30%', scrub: true } });
  const rise = $$('.label, .tally__pre, .tally__unit, .tally__sub', tally);
  gsap.set(rise, { opacity: 0, y: 26 });
  primeOdo(leadOdo);
  gsap.set('.tally__digits', { filter: 'blur(16px) brightness(1.9)', opacity: 0.2 });
  ScrollTrigger.create({
    trigger: tally, start: WIDE ? 'top 45%' : 'top 72%', once: true,
    onEnter: () => {
      riseIn(rise.slice(0, 2));
      // develop: the figure starts over-exposed and soft, then settles sharp as the reels land
      gsap.to('.tally__digits', { filter: 'blur(0px) brightness(1)', opacity: 1, duration: 2.1, ease: 'power2.out', delay: 0.15 });
      roll(leadOdo, 2.3, 0.15);
      riseIn(rise.slice(2), 1.1);
    },
  });
  frames.forEach((f) => {
    primeOdo($('.odo', f));
    gsap.set($('.ph', f), { scale: 1.22, filter: 'brightness(2.2) blur(6px)' });
    gsap.set($$('.frame__txt > *, .frame__no', f), { opacity: 0, y: 14 });
  });
  ScrollTrigger.create({
    trigger: '#sheet', start: 'top 74%', once: true,
    onEnter: () => {
      frames.forEach((f, i) => {
        const at = 0.12 * i;
        const tl = gsap.timeline({ delay: at });
        tl.fromTo($('.frame__flash', f), { opacity: 0 }, { opacity: 0.85, duration: 0.07, ease: 'none' })
          .to($('.frame__flash', f), { opacity: 0, duration: 0.6, ease: 'power2.out' })
          .to($('.ph', f), { scale: 1, filter: 'brightness(1) blur(0px)', duration: 1.6, ease: OUT }, 0.04)
          .to($$('.frame__txt > *, .frame__no', f), { opacity: 1, y: 0, duration: 0.9, ease: OUT, stagger: 0.06 }, 0.15)
          .add(roll($('.odo', f), 1.5), 0.15);
      });
    },
  });
}

/* ------------------------------------------------------------------ STORY: the rawshan assembles */
type Cell = { el: SVGPathElement; g: number; r: number };
function buildLattice(svg: SVGSVGElement): Cell[] {
  const panel = svg.parentElement!;
  const W = panel.clientWidth, H = panel.clientHeight;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const cols = W < 500 ? 5 : 7;
  const cw = W / cols, ch = cw * 1.32;
  const ns = 'http://www.w3.org/2000/svg';
  const seeds = [[0.5, 0.36], [0.2, 0.42], [0.8, 0.4], [0.5, 0.55], [0.22, 0.8], [0.78, 0.82], [0.5, 0.95]].map(([x, y]) => [x * W, y * H]);
  const cells: Cell[] = [];
  let lines = '';
  const rows = Math.ceil(H / (ch / 2)) + 2;
  for (let j = -1; j < rows; j++) {
    for (let i = -1; i <= cols; i++) {
      const cx = i * cw + (j % 2 ? cw / 2 : 0), cy = j * (ch / 2);
      const d = `M${cx} ${cy - ch / 2}L${cx + cw / 2} ${cy}L${cx} ${cy + ch / 2}L${cx - cw / 2} ${cy}Z`;
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', 'cell');
      // nearest seed = which word lights this cell; rank = distance (light spreads outward)
      let g = 0, best = Infinity;
      seeds.forEach(([sx, sy], k) => { const dd = Math.hypot(cx - sx, cy - sy); if (dd < best) { best = dd; g = k; } });
      cells.push({ el: p, g, r: Math.min(1, best / (Math.max(W, H) * 0.42)) });
      svg.appendChild(p);
      lines += d;
    }
  }
  const ln = document.createElementNS(ns, 'path');
  ln.setAttribute('d', lines);
  ln.setAttribute('class', 'ln');
  svg.appendChild(ln);
  return cells;
}
function storyScene() {
  const svg = $<SVGSVGElement>('#lattice');
  const words = $$('#words li');
  const close = $('#story-close');
  const glow = $('#story-glow');
  if (RM || !svg) return;
  let cells = buildLattice(svg);
  const ln = () => $('.ln', svg);
  let lastW = $('#story-panel').clientWidth;
  ScrollTrigger.addEventListener('refreshInit', () => {
    const w = $('#story-panel').clientWidth;
    if (Math.abs(w - lastW) > 2) { cells = buildLattice(svg); lastW = w; }
  });
  gsap.set($$('span', close), { opacity: 0, y: 24 });
  const N = words.length; // 7
  let closed = false;
  const update = (p: number) => {
    const q = 0.55 + p * (N + 0.75);
    for (const c of cells) {
      const t = Math.min(1, Math.max(0, (q - c.g) * 1.35 - c.r * 0.9));
      c.el.style.opacity = String(1 - t);
    }
    const active = Math.min(N - 1, Math.floor(q));
    words.forEach((w, i) => { w.classList.toggle('is-on', i < active || q >= N); w.classList.toggle('is-now', i === active && q < N && q >= 0); });
    const lnEl = ln(); if (lnEl) lnEl.style.opacity = String(0.34 - Math.max(0, q - N + 0.3) * 0.18);
    glow.style.backgroundPosition = `${120 - p * 140}% 0`;
    const show = q >= N + 0.1;
    if (show !== closed) {
      closed = show;
      gsap.to($$('span', close), { opacity: show ? 1 : 0, y: show ? 0 : 24, duration: 0.9, ease: OUT, stagger: 0.12, overwrite: true });
    }
  };
  update(0);
  if (WIDE) {
    ScrollTrigger.create({ trigger: '#story-pin', start: 'top top', end: '+=115%', pin: true, scrub: 0.6, onUpdate: (s) => update(s.progress) });
  } else {
    ScrollTrigger.create({ trigger: '#story-panel', start: 'top 70%', end: 'bottom 25%', scrub: 0.6, onUpdate: (s) => update(s.progress) });
  }
  // the words of the copy column
  const copyRise = $$('.story__copy .label, .story__title');
  gsap.set(copyRise, { opacity: 0, y: 30 });
  ScrollTrigger.create({
    trigger: '#about', start: WIDE ? 'top 55%' : 'top 30%', once: true,
    onEnter: () => {
      riseIn(copyRise);
      $$('.story__body [data-ink]').forEach((p, i) => inkIn(p, 0.35 + i * 0.4));
    },
  });
  const tail = $('.story__copy p.lead[data-ink]');
  if (tail) ScrollTrigger.create({ trigger: WIDE ? '#story-pin' : tail, start: WIDE ? 'top -60%' : 'top 85%', once: true, onEnter: () => inkIn(tail) });
}

/* ------------------------------------------------------------------ EXPERTISE: six plates, one lens */
function expertiseScene() {
  const plates = $$('.plate');
  const imgs = $$('.vf__img');
  const cap = $('#vf-cap');
  const num = $('#vf-n');
  const caps = ['ملفات مؤرشفة', 'باب عتيق في جدار حجري', 'خرسانة في ضوء مائل', 'رواشين، جدة التاريخية', 'فانوسان وظلّان', 'قراءة المستند معًا'];
  let cur = -1;
  let z = 10;
  const setActive = (i: number, instant = false) => {
    if (i === cur) return;
    const prev = cur;
    cur = i;
    plates.forEach((p, k) => p.classList.toggle('is-active', k === i));
    num.textContent = String(i + 1).padStart(2, '0');
    cap.innerHTML = `<b class="num">03</b>${caps[i]}`;
    if (!WIDE) return;
    const im = imgs[i];
    im.style.zIndex = String(++z);
    if (instant || RM) { gsap.set(im, { clipPath: DIAMOND_FULL }); return; }
    gsap.fromTo(im, { clipPath: DIAMOND_ZERO }, { clipPath: DIAMOND_FULL, duration: 1.1, ease: IO, overwrite: true });
    gsap.fromTo($('.ph', im), { scale: 1.18 }, { scale: 1, duration: 1.6, ease: OUT });
    if (prev >= 0) gsap.to($('.ph', imgs[prev]), { scale: 0.94, duration: 1.1, ease: IO });
  };
  setActive(0, true);
  plates.forEach((p, i) => {
    ScrollTrigger.create({ trigger: p, start: 'top 58%', end: 'bottom 58%', onToggle: (s) => s.isActive && setActive(i) });
  });
  if (RM) return;
  const headRise = $$('.expertise__head > *');
  gsap.set(headRise, { opacity: 0, y: 30 });
  ScrollTrigger.create({ trigger: '.expertise__head', start: 'top 80%', once: true, onEnter: () => riseIn(headRise) });
  if (WIDE) {
    gsap.fromTo('.vf__frame', { clipPath: 'polygon(50% 20%, 80% 50%, 50% 80%, 20% 50%)' }, {
      clipPath: DIAMOND_FULL, ease: 'power2.out',
      scrollTrigger: { trigger: '#expertise', start: 'top 85%', end: 'top 15%', scrub: 0.6 },
    });
  } else {
    for (const ph of $$('.plate__ph')) {
      gsap.fromTo(ph, { clipPath: diamondAt('50%', '50%') }, { clipPath: DIAMOND_FULL, duration: 1.2, ease: IO, scrollTrigger: { trigger: ph, start: 'top 85%', once: true } });
    }
  }
}

/* ------------------------------------------------------------------ METHOD: one day of light across a dune */
function methodScene() {
  const pin = $('#method-pin');
  const canvas = $<HTMLCanvasElement>('#dune-canvas');
  const media = $('#method-media');
  const words = $$('#method-word span');
  const stepNo = $('#step-no');
  const rulerItems = $$('#ruler li');
  const fill = $('#ruler-fill');
  const statement = $('#method-statement');
  const stepBox = $('#method-step');
  const top = $('.method__top');
  if (RM || !WIDE) {
    rulerItems.forEach((li) => li.classList.add('is-on'));
    return;
  }
  // frames: 60 graded stills of a real time-lapse, drawn to canvas as you scroll
  const FR = 60;
  const imgs: HTMLImageElement[] = [];
  let loaded = 0;
  const load = () => {
    if (imgs.length) return;
    for (let i = 0; i < FR; i++) {
      const im = new Image();
      im.decoding = 'async';
      im.src = `/media/seq/dune/${String(i).padStart(2, '0')}.webp`;
      im.onload = () => { loaded++; if (i === 0 || i === curF) draw(curF); };
      imgs.push(im);
    }
  };
  const ctx = canvas.getContext('2d')!;
  let curF = 0;
  const size = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    draw(curF);
  };
  function draw(f: number) {
    // nearest loaded frame
    let k = f;
    while (k > 0 && !(imgs[k]?.complete && imgs[k].naturalWidth)) k--;
    const im = imgs[k];
    if (!im || !im.complete || !im.naturalWidth) return;
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.drawImage(im, (cw - w) * 0.5, (ch - h) * 0.62, w, h);
  }
  ScrollTrigger.create({ trigger: '#expertise', start: 'top bottom', once: true, onEnter: load });
  window.addEventListener('resize', size);
  size();

  // hand-off: the plate opens into the landscape — same rhombus aperture
  gsap.fromTo(media, { clipPath: 'polygon(50% 26%, 74% 50%, 50% 74%, 26% 50%)' }, {
    clipPath: DIAMOND_FULL, ease: 'power2.inOut',
    scrollTrigger: { trigger: '#method', start: 'top 95%', end: 'top top', scrub: 0.6 },
  });
  const topEls = $$('.method__top > *');
  gsap.set(topEls, { opacity: 0, y: 30 });
  ScrollTrigger.create({ trigger: '#method', start: 'top 35%', once: true, onEnter: () => riseIn(topEls) });

  let step = -1;
  const setStep = (i: number) => {
    if (i === step) return;
    const dir = i > step ? 1 : -1;
    const prev = step;
    step = i;
    stepNo.textContent = String(i + 1).padStart(2, '0');
    rulerItems.forEach((li, k) => li.classList.toggle('is-on', k <= i));
    if (prev >= 0) gsap.to(words[prev], { yPercent: -105 * dir, duration: 0.8, ease: IO, overwrite: true });
    gsap.fromTo(words[i], { yPercent: 105 * dir }, { yPercent: 0, duration: 0.95, ease: IO, overwrite: true });
  };
  gsap.set(words, { yPercent: 105 });
  setStep(0);
  let stated = false;
  ScrollTrigger.create({
    trigger: pin, start: 'top top', end: '+=125%', pin: true, scrub: 0.4,
    onUpdate: (s) => {
      const p = s.progress;
      const a = Math.min(1, p / 0.78);
      const f = Math.round(a * (FR - 1));
      if (f !== curF) { curF = f; draw(f); }
      fill.style.transform = `scaleX(${a})`;
      setStep(Math.min(4, Math.floor(a * 5 - 1e-6 + (a >= 1 ? 0 : 0))));
      const show = p > 0.8;
      if (show !== stated) {
        stated = show;
        gsap.to(statement, { opacity: show ? 1 : 0, duration: 0.8, ease: OUT, overwrite: true });
        gsap.to(statement.children, { y: show ? 0 : 30, duration: 1, ease: OUT, stagger: 0.08, overwrite: true });
        gsap.to([stepBox, top], { opacity: show ? 0 : 1, y: show ? -20 : 0, duration: 0.7, ease: OUT, overwrite: true });
        statement.style.pointerEvents = show ? 'auto' : 'none';
      }
    },
  });
  gsap.set(statement.children, { y: 30 });
}

/* ------------------------------------------------------------------ VALUES: six materials */
function valuesScene() {
  const slats = $$('.slat');
  const open = (i: number) => slats.forEach((s, k) => { s.classList.toggle('is-open', k === i); s.setAttribute('aria-expanded', String(k === i)); });
  slats.forEach((s, i) => {
    s.addEventListener('click', () => open(i));
    s.addEventListener('focus', () => open(i));
    if (WIDE) s.addEventListener('mouseenter', () => open(i));
  });
  if (RM) return;
  const head = $$('.values__head > *');
  gsap.set(head, { opacity: 0, y: 30 });
  // the shutters open one by one as the scene rises — like the slats of a rawshan (scrubbed, never half-empty)
  gsap.fromTo(slats, { clipPath: 'inset(100% 0% 0% 0%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', stagger: 0.12,
    scrollTrigger: { trigger: '#slats', start: 'top 100%', end: 'top 45%', scrub: 0.5 },
  });
  ScrollTrigger.create({ trigger: '#values', start: 'top 80%', once: true, onEnter: () => riseIn(head) });
}

/* ------------------------------------------------------------------ CLOSING + OUTRO */
function closingScene() {
  const media = $('#closing-media');
  if (RM) return;
  gsap.fromTo(media, { clipPath: 'polygon(50% 34%, 66% 50%, 50% 66%, 34% 50%)' }, {
    clipPath: DIAMOND_FULL, ease: 'power2.inOut',
    scrollTrigger: { trigger: '#contact', start: 'top 92%', end: PHONE ? 'top 30%' : 'top 5%', scrub: 0.6 },
  });
  const els = $$('.closing__inner > *');
  gsap.fromTo($('.ph', media), { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '#contact', start: 'top bottom', end: 'top top', scrub: true } });
  gsap.set(els, { opacity: 0, y: 34 });
  ScrollTrigger.create({ trigger: '.closing__inner', start: 'top 45%', once: true, onEnter: () => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, ease: OUT, stagger: 0.1 }) });
  const cells = $$('.contact__cell, .team-note');
  gsap.set(cells, { opacity: 0, y: 24 });
  ScrollTrigger.create({ trigger: '.contact', start: 'top 88%', once: true, onEnter: () => riseIn(cells) });
}
function outroScene() {
  const strokes = $$<SVGPathElement>('.wstroke2');
  const pen = $('.outro__pen');
  const scale = $('.outro__scale');
  if (RM) return;
  strokes.forEach((s) => { const l = s.dataset.l!; s.style.strokeDasharray = l; s.style.strokeDashoffset = l; });
  gsap.set([pen, scale], { opacity: 0 });
  gsap.set(pen, { y: -30 });
  const rest = $$('.outro__name, .outro__tag');
  gsap.set(rest, { opacity: 0, y: 20 });
  ScrollTrigger.create({
    trigger: '#outro', start: 'top 70%', once: true,
    onEnter: () => {
      const total = strokes.reduce((a, s) => a + Number(s.dataset.l), 0);
      const tl = gsap.timeline();
      let t = 0;
      for (const s of strokes) { const d = (Number(s.dataset.l) / total) * 1.8; tl.to(s, { strokeDashoffset: 0, duration: d, ease: 'none' }, t); t += d * 0.92; }
      tl.to(pen, { opacity: 1, y: 0, duration: 0.9, ease: OUT }, 0.3).to(scale, { opacity: 1, duration: 0.8 }, 1.3).to(rest, { opacity: 1, y: 0, duration: 1, ease: OUT, stagger: 0.1 }, 1.2);
    },
  });
}

const navLinks = $$<HTMLAnchorElement>('.nav a');
function navScene() {
const sectionsForNav = ['#top', '#about', '#expertise', '#method', '#contact'];
for (const id of sectionsForNav) {
  const el = $(id);
  if (!el) continue;
  ScrollTrigger.create({
    trigger: el, start: 'top 45%', end: 'bottom 45%',
    onToggle: (self) => {
      if (!self.isActive) return;
      navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === id)));
    },
  });
}

}

/* ------------------------------------------------------------------ boot */
async function boot() {
  heroPrime();
  try { await (document as any).fonts?.ready; } catch { /* ignore */ }
  // ScrollTriggers are created in page order so pin spacing is measured correctly
  heroScroll();
  numbersScene();
  storyScene();
  expertiseScene();
  methodScene();
  valuesScene();
  closingScene();
  outroScene();
  navScene();
  bindReveals();
  ScrollTrigger.refresh();
  if (RM) { root.classList.add('booted'); return; }
  if (location.hash && location.hash.length > 1 && $(location.hash)) {
    $('#intro')?.classList.add('is-done');
    startVideo();
    heroIn();
    setTimeout(() => scrollToEl($(location.hash)), 60);
  } else {
    await runIntro();
  }
  root.classList.add('booted');
}
boot();
