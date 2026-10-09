import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Track, ease } from './director';
import type { Stage } from './gl/stage';
import { fitCamera, aimVanishing, LOGO_H, type V3 } from './gl/math';

/* ─────────────────────────── setup ─────────────────────────── */
const html = document.documentElement;
const RM = html.classList.contains('rm');
const params = new URLSearchParams(location.search);
const FORCE_NO_GL = params.get('gl') === '0';
const mqMobile = window.matchMedia('(max-width: 760px)');
let mobile = mqMobile.matches;
const qs = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const qsa = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];
const VW = () => document.documentElement.clientWidth || window.innerWidth;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const map = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
/** one motion vocabulary */
const EASE_WIPE = 'expo.inOut';
const EASE_OUT = 'expo.out';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
html.classList.add('booted');

const chapters = qsa<HTMLElement>('.sc').map((el) => ({ id: el.id, n: el.dataset.n || '', t: el.dataset.t || '', el, top: 0 }));
let lenis: Lenis | null = null;
let stage: Stage | null = null;
const track = new Track();
const sts: Record<string, ScrollTrigger> = {};
let scrollNow = 0;
let introK = 0; // 1 = camera held at the loader's mark
let introCam: { cam: V3; look: V3 } | null = null;
let outro = { O0: 0, O1: 1 };
let aim = { C0: 0, C1: 1, O0: 0, O1: 1 };
const ctaEl = document.querySelector('.contact-act .btn-solid') as HTMLElement;

/* ─────────────────────────── reveal gesture: the RTL light wipe ─────────────────────────── */
const wipeTargets = (el: Element) => {
  const lines = qsa('.ln', el);
  return lines.length ? lines : [el];
};
function prepareWipe(el: Element) {
  wipeTargets(el).forEach((t) => { t.classList.add('wv'); (t as HTMLElement).style.setProperty('--r', '0'); });
}
function wipeIn(el: Element, delay = 0, dur = 1.25) {
  return gsap.to(wipeTargets(el), { '--r': 1.2, duration: dur, ease: EASE_WIPE, stagger: 0.12, delay });
}
const setR = (el: Element, v: number) => (el as HTMLElement).style.setProperty('--r', String(v));

/* ─────────────────────────── loader ─────────────────────────── */
function createLoader() {
  const el = qs('.loader');
  const paths = qsa<SVGPathElement>('#write-mask path');
  const lens = paths.map((p) => +(p.dataset.l || 0));
  const total = lens.reduce((a, b) => a + b, 0);
  const digits = qsa('.loader-pct .d');
  const line = qs('.loader-line');
  let real = 0, disp = 0, last = performance.now(), raf = 0;
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  const MIN_T = 1.9; // seconds for a full write at best: progress can never run ahead of the real load
  const draw = () => {
    let drawn = disp * total;
    paths.forEach((p, i) => {
      const l = lens[i];
      const shown = Math.max(0, Math.min(l, drawn));
      drawn -= l;
      p.style.strokeDashoffset = String((l + 2) * (1 - shown / l));
    });
    const pct = String(Math.round(disp * 100)).padStart(3, '0');
    const lead = pct.search(/[1-9]/);
    digits.forEach((d, i) => { d.textContent = pct[i]; d.classList.toggle('off', lead < 0 ? i < 2 : i < lead); });
    line?.style.setProperty('--p', disp.toFixed(4));
  };
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    disp = Math.min(real, disp + dt / MIN_T);
    draw();
    if (disp >= 0.9999) { resolve(); return; }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return {
    el,
    real(p: number) { real = Math.max(real, Math.min(1, p)); ((window as any).__alfT ||= []).push([Math.round(performance.now()), +p.toFixed(2)]); },
    done,
    kill() { cancelAnimationFrame(raf); },
  };
}

/* ─────────────────────────── navigation & transitions ─────────────────────────── */
const wipe = qs('.wipe');
const wipeA = qs('.wipe-a'), wipeB = qs('.wipe-b'), wipeEdge = qs('.wipe-edge');
let busy = false;

function targetY(id: string) {
  if (id === 'top' || !id) return 0;
  const el = document.getElementById(id);
  if (!el) return null;
  let y = el.getBoundingClientRect().top + window.scrollY;
  if (id === 'about' && sts.story) y = sts.story.start + (sts.story.end - sts.story.start) * 0.04;
  if (id === 'method' && sts.method) y = sts.method.start + (sts.method.end - sts.method.start) * 0.06;
  if (id === 'expertise' && sts.exp) y = sts.exp.start;
  return Math.min(y, ScrollTrigger.maxScroll(window));
}

let soonTimer = 0;
function showSoon() {
  const s = qs('.soon');
  s.classList.add('show');
  clearTimeout(soonTimer);
  soonTimer = window.setTimeout(() => s.classList.remove('show'), 2800);
}

function go(hash: string) {
  if (hash === '#team') return showSoon();
  const id = hash.replace('#', '');
  const y = targetY(id);
  if (y === null) return;
  if (RM || !lenis) {
    window.scrollTo({ top: y });
    return;
  }
  if (busy) return;
  busy = true;
  const ch = chapters.find((c) => c.id === id) || chapters[0];
  qs('.wipe-n').textContent = ch.n;
  qs('.wipe-t').textContent = ch.t;
  const label = qsa('.wipe-n, .wipe-t');
  label.forEach((l) => { l.classList.add('wv'); setR(l, 0); });
  wipe.classList.add('on');
  lenis.stop();
  gsap.timeline({ defaults: { ease: EASE_WIPE }, onComplete: () => { wipe.classList.remove('on'); busy = false; lenis!.start(); } })
    .fromTo(wipeA, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 0.75 })
    .fromTo(wipeB, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 0.75 }, 0.09)
    .fromTo(wipeEdge, { right: '0%', opacity: 1 }, { right: '100%', duration: 0.75 }, 0.09)
    .to(label, { '--r': 1.2, duration: 0.8, stagger: 0.08 }, 0.35)
    .add(() => {
      lenis!.start();
      lenis!.scrollTo(y, { immediate: true, force: true });
      lenis!.stop();
      ScrollTrigger.update();
      drive();
      stage?.snap();
    })
    .to(wipeB, { clipPath: 'inset(0 100% 0 0)', duration: 0.8 }, '+=0.45')
    .fromTo(wipeEdge, { right: '0%' }, { right: '100%', duration: 0.8 }, '<')
    .to(wipeA, { clipPath: 'inset(0 100% 0 0)', duration: 0.8 }, '<0.08')
    .set(wipeEdge, { opacity: 0 });
}

// Page transitions (for when inner pages exist): cover on leave, uncover on arrival.
function setupPageTransitions() {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest('a');
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    if (a.hasAttribute('data-nav') || url.protocol.startsWith('tel') || url.protocol.startsWith('mailto')) return;
    e.preventDefault();
    if (RM) return void location.assign(url.href);
    try { sessionStorage.setItem('alf-pt', '1'); } catch {}
    wipe.classList.add('on');
    gsap.timeline({ defaults: { ease: EASE_WIPE }, onComplete: () => location.assign(url.href) })
      .fromTo(wipeA, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 0.7 })
      .fromTo(wipeB, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 0.7 }, 0.08);
  });
}

/* ─────────────────────────── menu ─────────────────────────── */
const menu = qs('.menu');
const menuBtn = qs<HTMLButtonElement>('.menu-btn');
let menuOpen = false;
function openMenu() {
  menuOpen = true;
  menu.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
  lenis?.stop();
  const items = qsa('.menu-list li');
  if (RM) return;
  gsap.fromTo(menu, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 0.85, ease: EASE_WIPE });
  items.forEach((i) => { i.classList.add('wv'); setR(i, 0); });
  gsap.to(items, { '--r': 1.2, duration: 1.1, ease: EASE_WIPE, stagger: 0.06, delay: 0.3 });
  (qs('.menu-list a') as HTMLElement)?.focus({ preventScroll: true });
}
function closeMenu(instant = false) {
  if (!menuOpen) return;
  menuOpen = false;
  menuBtn.setAttribute('aria-expanded', 'false');
  lenis?.start();
  if (instant || RM) { menu.hidden = true; return; }
  gsap.to(menu, { clipPath: 'inset(0 100% 0 0)', duration: 0.7, ease: EASE_WIPE, onComplete: () => { menu.hidden = true; } });
}
function setupNav() {
  menuBtn.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  qsa<HTMLAnchorElement>('a[data-nav]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
      e.preventDefault();
      const wasOpen = menuOpen;
      if (href === '#team') { if (wasOpen) closeMenu(); showSoon(); return; }
      if (wasOpen) closeMenu(true);
      go(href);
    }),
  );
  setupPageTransitions();
}

/* ─────────────────────────── HUD & nav state ─────────────────────────── */
const hudN = qs('.hud-n'), hudT = qs('.hud-t'), hud = qs('.hud');
let curChapter = '';
function updateHud(s: number) {
  const vh = window.innerHeight;
  let c = chapters[0];
  for (const ch of chapters) if (ch.top <= s + vh * 0.45) c = ch;
  const max = ScrollTrigger.maxScroll(window) || 1;
  hud.style.setProperty('--hp', clamp01(s / max).toFixed(4));
  if (c.id === curChapter) return;
  curChapter = c.id;
  hudN.textContent = c.n;
  hudT.textContent = c.t;
  if (!RM) gsap.fromTo([hudN, hudT], { '--r': 0 }, { '--r': 1.2, duration: 0.9, ease: EASE_WIPE, stagger: 0.06 });
  qsa('.hdr-nav a').forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + c.id)));
}

/* ─────────────────────────── scenes ─────────────────────────── */
const sky = qs('.sky');
let skyCache: Record<string, string> = {};
function setSky(k: string, v: string) {
  if (skyCache[k] === v) return;
  skyCache[k] = v;
  sky.style.setProperty(k, v);
}

// 02 — story: lines are read one by one, the copy gives way to the line of light
const storyLines = qsa('.story-line');
const storyCopy = qs('.story-copy');
const storyClose = qsa('.story-close .ln');
function storyScene(p: number) {
  const th = [0.02, 0.12, 0.24];
  storyLines.forEach((l, i) => (l.style.opacity = (0.2 + 0.8 * smooth(map(p, th[i], th[i] + 0.08))).toFixed(3)));
  const out = smooth(map(p, 0.44, 0.54));
  storyCopy.style.opacity = (1 - out).toFixed(3);
  storyCopy.style.visibility = out > 0.999 ? 'hidden' : '';
  storyClose.forEach((l, i) => setR(l, 1.2 * map(p, 0.64 + i * 0.07, 0.78 + i * 0.07)));
}

// 03a — the line pours into the engraving
const engr = qs('.engr');
const leadSub = qsa('.lead-sub .ln');
const leadEl = qs('.lead');
const ledgerWrap = qs('.ledger-wrap');
/** one scene: the line pours into the engraving, the figure rises, the beam reads the ledger */
function numbersScene(p: number) {
  engr.style.setProperty('--fill', smooth(map(p, 0.17, 0.33)).toFixed(4));
  engr.style.setProperty('--sweep', (-0.3 + 1.7 * map(p, 0.24, 0.5)).toFixed(4));
  const subOut = smooth(map(p, 0.4, 0.46));
  leadSub.forEach((l, i) => { setR(l, 1.2 * map(p, 0.22 + i * 0.05, 0.32 + i * 0.05)); l.style.opacity = (1 - subOut).toFixed(3); });
  const lift = smooth(map(p, 0.42, 0.56));
  const vh = window.innerHeight;
  const dy = (mobile ? 0.27 : 0.29) * vh * lift;
  leadEl.style.transform = lift > 0 ? `translate3d(0, ${(-dy).toFixed(1)}px, 0) scale(${(1 - (mobile ? 0.4 : 0.5) * lift).toFixed(4)})` : '';
  setR(ledgerWrap, 1.2 * map(p, 0.5, 0.62));
  ledgerScene(map(p, 0.6, 0.97));
}

// 03b — the ledger is read by a beam of light; each figure counts only while lit
type Cell = { el: HTMLElement; v: number; fmt: string; spans: HTMLElement[]; a: number; b: number; last: number };
const ledgerIn = qs('.ledger-in');
const beam = qs('.beam');
const cells: Cell[] = qsa('.cell').map((el) => {
  const v = +(el.dataset.v || 0);
  return { el, v, fmt: v.toLocaleString('en-US'), spans: qsa('.cell-v > span', el), a: 0, b: 1, last: -1 };
});
function measureCells() {
  const W = ledgerIn.offsetWidth || 1;
  cells.forEach((c) => {
    c.a = c.el.offsetLeft / W;
    c.b = (c.el.offsetLeft + c.el.offsetWidth) / W;
  });
}
function renderCell(c: Cell, value: number) {
  if (value === c.last) return;
  c.last = value;
  const digitsFinal = c.fmt.replace(/,/g, '').length;
  const s = String(value).padStart(digitsFinal, '0');
  const lit = String(value).length;
  let di = 0;
  c.fmt.split('').forEach((ch, i) => {
    const span = c.spans[i];
    if (ch === ',') {
      span.classList.toggle('off', digitsFinal - di > lit);
      return;
    }
    span.textContent = s[di];
    span.classList.toggle('off', digitsFinal - di > lit || value === 0);
    di++;
  });
}
function ledgerScene(p: number) {
  const t = smooth(map(p, 0.05, 0.9));
  const bx = 1.02 - 1.04 * t;
  beam.style.setProperty('--bx', bx.toFixed(4));
  beam.style.opacity = String(smooth(map(p, 0.0, 0.06)) * (1 - smooth(map(p, 0.92, 1))));
  cells.forEach((c) => {
    const cp = clamp01((c.b - bx) / (c.b - c.a));
    const e = 1 - Math.pow(1 - cp, 2.2);
    renderCell(c, Math.round(c.v * e));
    c.el.classList.toggle('hot', cp > 0 && cp < 1);
  });
}

// 04 — the horizontal journey along the path
const expTrack = qs('.exp-track');
const expItems = qsa('.exp-item');
const expRail = qs('.exp-rail');
function expDist() { return Math.max(0, expTrack.scrollWidth - VW()); }
function expScene(p: number) {
  const d = expDist();
  gsap.set(expTrack, { x: p * d });
  expRail.style.setProperty('--ep', p.toFixed(4));
  const vw = VW();
  expItems.forEach((it) => {
    const r = it.getBoundingClientRect();
    // only the area at the focus point is fully legible; its neighbours recede
    const k = 1 - smooth(Math.abs(r.right - vw * 0.6) / (r.width * 0.85));
    it.style.setProperty('--lit', k.toFixed(3));
  });
}

// 05 — five weights settle the balance
const steps = qsa('.steps li');
const methodCopy = qs('.method-copy');
const methodState = qs('.method-state');
const methodStateLines = qsa('.method-state .ln');
const methodBtn = qs('.method-state .btn');
const lsParts = qsa<SVGPathElement>('.ls-part');
const lsSwing = qs('.ls-swing');
const lsSvg = qs('.lscale');
const swing = { amp: 9, target: 9, t: 0 };
let curStep = -1;
function methodScene(p: number) {
  const f = map(p, 0.04, 0.7) * 5;
  const idx = Math.min(4, Math.floor(f));
  if (idx !== curStep) {
    curStep = idx;
    steps.forEach((s, i) => { s.classList.toggle('on', i === idx); s.classList.toggle('done', i < idx); });
  }
  // each step draws one part of the logo's scale; its swing dies down step by step
  lsParts.forEach((el) => { const k = +(el.dataset.s || 0); el.style.setProperty('--d', (1 - clamp01(f - k)).toFixed(4)); });
  const bowl = clamp01(f - 3);
  lsSvg.style.setProperty('--bf', (0.04 + bowl * 0.14).toFixed(3));
  const amps = [9, 7, 4.5, 2.4, 1];
  swing.target = f >= 4.999 ? 0 : amps[idx];
  lsSvg.style.setProperty('--ha', (0.35 + 0.65 * smooth(map(f, 4.6, 5))).toFixed(3));
  const out = smooth(map(p, 0.73, 0.8));
  methodCopy.style.opacity = (1 - out).toFixed(3);
  methodCopy.style.visibility = out > 0.999 ? 'hidden' : '';
  methodState.style.visibility = p > 0.74 ? 'visible' : 'hidden';
  methodStateLines.forEach((l, i) => setR(l, 1.2 * map(p, 0.76 + i * 0.07, 0.88 + i * 0.07)));
  methodBtn.style.opacity = smooth(map(p, 0.9, 0.97)).toFixed(3);
}
function swingTick(dt: number) {
  swing.amp += (swing.target - swing.amp) * Math.min(1, dt * 1.6);
  swing.t += dt;
  lsSwing.style.setProperty('--sw', (swing.amp * Math.sin((swing.t * Math.PI * 2) / 2.6)).toFixed(3) + 'deg');
}

function setupScenes() {
  const vh = () => window.innerHeight;
  sts.story = ScrollTrigger.create({
    trigger: '.story-pin', pin: true, start: 'top top', end: () => '+=' + vh() * (mobile ? 1.1 : 1.0), scrub: true,
    onUpdate: (s) => storyScene(s.progress), onRefresh: (s) => storyScene(s.progress),
  });
  storyClose.forEach((l) => l.classList.add('wv'));
  storyScene(0);

  sts.num = ScrollTrigger.create({
    trigger: '.num-pin', pin: true, start: 'top top', end: () => '+=' + vh() * 1.15, scrub: true,
    onUpdate: (s) => numbersScene(s.progress), onRefresh: (s) => { measureCells(); numbersScene(s.progress); },
  });
  leadSub.forEach((l) => l.classList.add('wv'));
  ledgerWrap.classList.add('wv');
  measureCells();
  numbersScene(0);

  if (!mobile) {
    sts.exp = ScrollTrigger.create({
      trigger: '.exp-pin', pin: true, start: 'top top', end: () => '+=' + vh() * 1.1, scrub: true, invalidateOnRefresh: true,
      onUpdate: (s) => expScene(s.progress), onRefresh: (s) => expScene(s.progress),
    });
    expScene(0);
  } else {
    expItems.forEach((it) => {
      it.style.setProperty('--lit', '0.35');
      ScrollTrigger.create({ trigger: it, start: 'top 75%', end: 'bottom 35%', onToggle: (s) => it.style.setProperty('--lit', s.isActive ? '1' : '0.45') });
    });
  }

  sts.method = ScrollTrigger.create({
    trigger: '.method-pin', pin: true, start: 'top top', end: () => '+=' + vh() * (mobile ? 1.2 : 1.05), scrub: true,
    onUpdate: (s) => methodScene(s.progress), onRefresh: (s) => methodScene(s.progress),
  });
  methodStateLines.forEach((l) => l.classList.add('wv'));
  methodScene(0);
  swing.amp = 9;
  gsap.ticker.add((_t, dms) => swingTick(Math.min(0.05, dms / 1000)));

  // 06 — each value is engraved by the raking light as it crosses the frame
  qsa('.val').forEach((row) => {
    const ink = qs('.val-ink', row);
    ink.style.setProperty('--lit', '0');
    row.style.setProperty('--lit', '0');
    ScrollTrigger.create({
      trigger: row, start: 'top 88%', end: 'top 42%', scrub: true,
      onUpdate: (s) => { const v = s.progress.toFixed(4); ink.style.setProperty('--lit', v); row.style.setProperty('--lit', v); },
    });
  });

  // one gesture for every heading and block that enters
  const reveal = [
    ...qsa('.story .rv, .exp .rv, .method .rv, .values .rv'),
    ...qsa('.values-head .label, .story-copy .label, .exp-head .label, .method-copy .label, .num-label'),
    ...qsa('.contact > *'),
    ...(mobile ? qsa('.exp-text') : []),
  ];
  reveal.forEach((el) => {
    prepareWipe(el);
    ScrollTrigger.create({ trigger: el, start: 'top 86%', once: true, onEnter: () => wipeIn(el) });
  });

  // the outro writes the wordmark under the signature
  const ow = qs('.outro-word');
  ow.classList.add('wv');
  setR(ow, 0);
}

/* ─────────────────────────── the director: scroll → film ─────────────────────────── */
function rectAtScroll(el: Element, s: number) {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top + scrollNow - s, w: r.width, h: r.height };
}

async function layout() {
  const vw = VW(), vh = window.innerHeight;
  scrollNow = window.scrollY;
  const maxS = ScrollTrigger.maxScroll(window);
  const docTop = (el: Element) => el.getBoundingClientRect().top + scrollNow;
  chapters.forEach((c) => (c.top = docTop(c.el)));

  const S0 = sts.story.start, S1 = sts.story.end, SL = S1 - S0;
  const N0 = sts.num.start, N1 = sts.num.end, NL = N1 - N0;
  const expEl = qs('#expertise');
  const E0 = sts.exp ? sts.exp.start : docTop(expEl) - vh * 0.3;
  const E1 = sts.exp ? sts.exp.end : docTop(expEl) + expEl.offsetHeight - vh * 0.7;
  const M0 = sts.method.start, M1 = sts.method.end;
  const valuesEl = qs('#values'), contactEl = qs('#contact');
  const V0 = docTop(valuesEl) - vh * 0.5;
  const C0 = docTop(contactEl) - vh * 0.6;
  const O1 = maxS, O0 = Math.max(C0 + 10, O1 - vh * 0.95);
  outro = { O0, O1 };

  // hero: the particles sit exactly where the static mark would be
  const heroRect = rectAtScroll(qs('.hero-mark'), 0);
  const hero = fitCamera(heroRect, vw, vh, LOGO_H);
  const heroFollow = S0 * 0.5;
  const shiftY = (c: V3, dy: number): V3 => [c[0], c[1] + dy, c[2]];
  const hcx = ((heroRect.x + heroRect.w / 2) / vw) * 100, hcy = ((heroRect.y + heroRect.h / 2) / vh) * 100;

  // story
  const A = mobile ? { cam: [0, 4.2, 31] as V3, look: [0, 4.2, 0] as V3 } : { cam: [2.3, 0, 15.5] as V3, look: [2.3, 0, 0] as V3 };
  const B = mobile ? { cam: [0, 3.6, 27] as V3, look: [0, 3.6, 0] as V3 } : { cam: [2.0, -0.3, 13.6] as V3, look: [2.0, -0.3, 0] as V3 };
  const C = mobile ? { cam: [0, 0.5, 26] as V3, look: [0, 0.1, 0] as V3 } : { cam: [0, 1.0, 17.5] as V3, look: [0, 0.45, 0] as V3 };
  const Dk = mobile ? { cam: [0, 0.5, 25] as V3, look: [0, 0.1, 0] as V3 } : { cam: [0, 1.0, 16.5] as V3, look: [0, 0.45, 0] as V3 };

  // numbers: straight camera; the glyphs are sampled from the DOM number in its pinned place
  const ND = 14;
  const numCam: V3 = [0, 0, ND], numLook: V3 = [0, 0, 0];

  // expertise: the camera rides the line; the line sits on the rail (60% of the frame)
  const expA = mobile ? { cam: [5, 0.6, 19] as V3, look: [4.2, 0.6, 0] as V3 } : { cam: [10, 0.8, 12] as V3, look: [8.8, 0.8, 0] as V3 };
  const expB = mobile ? { cam: [-5, 0.6, 19] as V3, look: [-5.8, 0.6, 0] as V3 } : { cam: [-10, 0.8, 12] as V3, look: [-11.2, 0.8, 0] as V3 };

  // method: the air around the scale
  const mCam: V3 = [0, -30, 13], mLook: V3 = [0, -30, 0];
  const mvr = qs('.method-visual').getBoundingClientRect(), mpr = qs('.method-pin').getBoundingClientRect();
  const mcx = ((mvr.left + mvr.width / 2) / vw) * 100, mcy = ((mvr.top - mpr.top + mvr.height * 0.42) / vh) * 100;

  // outro: camera pulls back to the full signature
  const oRect = rectAtScroll(qs('.outro-mark'), O1);
  const out = fitCamera(oRect, vw, vh, LOGO_H, [0, 0, 0]);
  // contact: the camera lies down on the line, which runs away to a vanishing point of light
  const horizon = mobile
    ? { cam: [16, 1.5, -2.6] as V3, cam2: [13, 1.3, -2.2] as V3, look: [-14, -0.5, 1.5] as V3 }
    : { cam: [16, 1.6, -3.8] as V3, cam2: [13, 1.4, -3.2] as V3, look: [-14, -0.4, 2.4] as V3 };
  aim = { C0: C0 - vh * 0.5, C1: C0 + vh * 0.2, O0, O1 };
  const ocy = ((oRect.y + oRect.h / 2) / vh) * 100;

  track.clear();
  const k = (at: number, v: Record<string, number | number[]>, e = ease.io) => track.key(at, v, e);
  // ── film ──
  k(0, { near: 9, par: 1, seq: 0, cam: hero.cam, look: hero.look, spread: 0.25, turb: 0, mouseK: 1, write: 1, rot: 0, gain: 1 });
  k(heroFollow, { seq: 0.3, cam: shiftY(hero.cam, -heroFollow * hero.wpp * 0.55), look: shiftY(hero.look, -heroFollow * hero.wpp * 0.55), turb: 1.6, mouseK: 0 }, ease.lin);
  k(S0, { seq: 1, cam: A.cam, look: A.look, turb: 0.5, rot: 0 });
  k(S0 + SL * 0.4, { seq: 1, cam: B.cam, look: B.look, rot: 1.1 });
  k(S0 + SL * 0.46, { seq: 1, spread: 1.0, turb: 0.8 });
  k(S0 + SL * 0.74, { seq: 2, cam: C.cam, look: C.look, rot: 1.5 });
  k(S1, { seq: 2, spread: 0.18, cam: Dk.cam, look: Dk.look, turb: 0.8 });
  k(N0 - vh * 0.2, { par: 1 });
  k(N0, { seq: 2, cam: numCam, look: numLook, spread: 0.18 });
  k(N0 + NL * 0.08, { par: 0 });
  k(N0 + NL * 0.17, { seq: 3, turb: 0.6 });
  k(N0 + NL * 0.42, { seq: 3, cam: numCam, look: numLook });
  k(N0 + NL * 0.54, { seq: 4, turb: 0.4, par: 0 });
  k(N0 + NL * 0.66, { par: 1 });
  k(N1, { seq: 4, cam: shiftY(numCam, -2), look: shiftY(numLook, -2), spread: 0.18, gain: 1 });
  k(E0, { seq: 5, spread: mobile ? 0.5 : 0.34, cam: expA.cam, look: expA.look, gain: mobile ? 0.55 : 0.9 });
  k(E1, { seq: 5, cam: expB.cam, look: expB.look }, sts.exp ? ease.lin : ease.io);
  k(M0, { seq: 6, cam: mCam, look: mLook, gain: 0.9 });
  k(M1, { seq: 6, cam: shiftY(mCam, -1.2), look: shiftY(mLook, -1.2) });
  k(V0, { seq: 6, cam: shiftY(mCam, -8), look: shiftY(mLook, -8) });
  k(Math.max(V0 + 10, C0 - vh * 0.9), { seq: 6, write: 1, near: 9 });
  k(C0, { near: 19, seq: 7, spread: 0.5, cam: horizon.cam, look: horizon.look, gain: 0.6 });
  k(O0, { seq: 7, write: 0, cam: horizon.cam2, look: horizon.look, mouseK: 0, spread: 0.3 });
  k(O1, { near: 9, par: 0, seq: 8, write: 1, cam: out.cam, look: out.look, mouseK: 1, gain: 1.15 });

  // ── light: one clean ink world; gold light placed behind each focal element ──
  const INK_A = [17, 19, 26], INK_B = [7, 8, 11];
  k(0, { kx: hcx, ky: hcy, ka: 1, fa: 0.6, da: 0, ba: INK_A, bb: INK_B });
  k(S0, { kx: mobile ? 50 : 36, ky: mobile ? 72 : 50, ka: 0.7, ba: [14, 16, 22] });
  k(S1, { kx: 50, ky: mobile ? 56 : 58, ka: 0.8 });
  k(N0 + NL * 0.2, { kx: 50, ky: 50, ka: 1.05, ba: INK_A });
  k(N0 + NL * 0.56, { kx: 50, ky: mobile ? 66 : 68, ka: 0.6 });
  k(E0, { kx: 62, ky: 60, ka: 0.75 });
  k(M0, { kx: mcx, ky: mcy, ka: 1.05 });
  k(M1, { ka: 1.1 });
  k(V0, { kx: 74, ky: 40, ka: 0.5, da: 0 });
  k(C0, { kx: 50, ky: 50, ka: 0.95, da: 0.4 });
  k(O0, { da: 0.8, ka: 0.9, ky: 52 });
  k(O1, { kx: 50, ky: ocy, ka: 1.1, da: 1, ba: INK_A, bb: INK_B });
  track.finalize();

  if (stage) {
    stage.resize();
    const prevT = leadEl.style.transform;
    leadEl.style.transform = '';
    const er = engr.getBoundingClientRect(), lr = qs('.num-pin').getBoundingClientRect();
    leadEl.style.transform = prevT;
    stage.sampleNumber(engr, { x: er.left, y: er.top - lr.top, w: er.width, h: er.height }, numCam, ND);
    stage.setWords(qsa('.story-words li'), mobile ? 1.05 : 2.15, mobile);
    if (introK > 0) {
      const mr = qs('.loader-mark')?.getBoundingClientRect();
      if (mr) introCam = fitCamera({ x: mr.left, y: mr.top, w: mr.width, h: mr.height }, vw, vh, LOGO_H);
    }
  }
  drive();
}

function drive() {
  const s = lenis ? lenis.animatedScroll : window.scrollY;
  const g = (n: string) => track.get(n, s);
  // sky
  const num = (n: string, unit = '') => { const v = g(n); if (typeof v === 'number') setSky('--' + n, v.toFixed(3) + unit); };
  if (introK > 0) {
    // during the intro the key light stays behind the centred signature
    const kx = g('kx') as number, ky = g('ky') as number;
    setSky('--kx', (kx + (50 - kx) * introK).toFixed(3) + '%');
    setSky('--ky', (ky + (48 - ky) * introK).toFixed(3) + '%');
  } else { num('kx', '%'); num('ky', '%'); }
  num('ka'); num('fa'); num('da');
  const ba = g('ba') as number[] | undefined, bb = g('bb') as number[] | undefined;
  if (ba) setSky('--ba', `rgb(${ba.map((x) => x.toFixed(0)).join(' ')})`);
  if (bb) setSky('--bb', `rgb(${bb.map((x) => x.toFixed(0)).join(' ')})`);
  // outro wordmark
  const op = map(s, outro.O0 + (outro.O1 - outro.O0) * 0.5, outro.O1 - 4);
  setR(qs('.outro-word'), 1.2 * op);
  hud.style.opacity = op > 0.05 ? '0' : '';
  updateHud(s);
  if (!stage) return;
  let cam = g('cam') as V3, look = g('look') as V3;
  // contact: the line of light vanishes exactly on the consultation button
  const wIn = smooth(map(s, aim.C0, aim.C1)) * (1 - smooth(map(s, aim.O0, aim.O0 + (aim.O1 - aim.O0) * 0.45)));
  let gainMul = 1;
  if (wIn > 0.001 && ctaEl) {
    const r = ctaEl.getBoundingClientRect();
    const vw = VW(), vh = window.innerHeight;
    // the line lives while its destination is on screen, then gives the details room
    gainMul = 1 - wIn * (1 - smooth(map(r.top + r.height / 2, vh * 0.05, vh * 0.4)));
    const tx = ((r.left + r.width / 2) / vw) * 2 - 1, ty = -(((r.top + r.height / 2) / vh) * 2 - 1);
    const L = aimVanishing(cam, [-1, 0, 0], Math.max(-0.95, Math.min(0.95, tx)), Math.max(-1.4, Math.min(1.4, ty)), vw / vh);
    look = look.map((x, i) => x + (L[i] - x) * wIn) as V3;
  }
  if (introK > 0 && introCam) {
    const t = introK;
    cam = cam.map((x, i) => x + (introCam!.cam[i] - x) * t) as V3;
    look = look.map((x, i) => x + (introCam!.look[i] - x) * t) as V3;
  }
  stage.set({
    seq: g('seq') as number, cam, look, spread: g('spread') as number, turb: g('turb') as number,
    mouseK: g('mouseK') as number, write: g('write') as number,
    rot: g('rot') as number, gain: (g('gain') as number) * gainMul, par: g('par') as number, near: g('near') as number,
  });
}

/* ─────────────────────────── boot ─────────────────────────── */
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

async function bootMotion() {
  window.scrollTo(0, 0);
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.3 });
  lenis.stop();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  const fromPage = (() => { try { const v = sessionStorage.getItem('alf-pt'); sessionStorage.removeItem('alf-pt'); return !!v; } catch { return false; } })();
  const loader = createLoader();
  loader.real(0.06);

  // hero copy waits under the loader
  qsa('.hero .rv').forEach(prepareWipe);
  gsap.set('.hero .eyebrow', { opacity: 0 });

  const fonts = Promise.all([
    document.fonts.load('800 64px Almarai', 'الفيصل'),
    document.fonts.load('400 18px Almarai', 'الفيصل'),
    document.fonts.load('700 18px Almarai', 'الفيصل'),
    document.fonts.load('800 64px Almarai', '6,750'),
    document.fonts.load('600 24px Naskh', 'بمنظومة'),
  ]).catch(() => null).then(() => loader.real(0.22));

  await fonts;
  setupScenes();
  ScrollTrigger.refresh();

  const useGL = !FORCE_NO_GL && hasWebGL();
  if (useGL) {
    try {
      const mod = await import('./gl/stage');
      loader.real(0.34);
      const strokes = qsa<SVGPathElement>('#write-mask path').map((p) => ({ d: p.getAttribute('d') || '', w: +(p.getAttribute('stroke-width') || 1) / 1.25, l: +(p.dataset.l || 0) }));
      stage = await mod.createStage(qs<HTMLCanvasElement>('canvas.gl'), { mobile, strokes, onProgress: (p) => loader.real(0.34 + p * 0.66) });
    } catch (e) {
      console.warn('[alfaisal] WebGL stage unavailable, static scenery instead', e);
      stage = null;
    }
  }
  loader.real(1);
  introK = stage ? 1 : 0;
  await layout();
  ScrollTrigger.addEventListener('refresh', () => void layout());
  gsap.ticker.add(() => drive());
  (window as unknown as { __alf: unknown }).__alf = { lenis, go, st: sts, stage, track };

  if (stage) {
    stage.snap();
    stage.setIntroGain(0);
  }
  if (fromPage) loader.real(1);
  await loader.done;
  intro();
}

function intro() {
  const loaderEl = qs('.loader');
  const rest = qs('.loader-rest');
  const mark = qs('.loader-mark');
  const tl = gsap.timeline({
    onComplete: () => {
      html.classList.remove('intro');
      loaderEl.remove();
      lenis!.start();
    },
  });
  tl.to(rest, { opacity: 1, duration: 0.7, ease: 'power2.out' });
  tl.to('.loader-foot', { opacity: 0, duration: 0.5 }, '<');
  if (stage) {
    const g = { v: 0 };
    tl.add(() => html.classList.add('gl-on'), '+=0.05');
    tl.to(g, { v: 1, duration: 1.1, ease: 'power2.inOut', onUpdate: () => stage!.setIntroGain(g.v) });
    tl.to(loaderEl, { opacity: 0, duration: 1.0, ease: 'power2.inOut' }, '<0.2');
    const ik = { v: 1 };
    tl.to(ik, { v: 0, duration: 2.0, ease: EASE_WIPE, onUpdate: () => { introK = ik.v; } }, '-=0.35');
    tl.add('reveal', '-=1.25');
  } else {
    tl.to(loaderEl, { opacity: 0, duration: 0.9, ease: 'power2.inOut' }, '+=0.15');
    tl.add('reveal', '-=0.5');
  }
  tl.to('.hero .eyebrow', { opacity: 1, duration: 1, ease: EASE_OUT }, 'reveal');
  qsa('.hero .rv').forEach((el, i) => tl.add(wipeIn(el, 0, 1.3), `reveal+=${0.12 + i * 0.14}`));
  tl.to(['.hdr', '.consult', '.hud'], { opacity: 1, duration: 1, ease: EASE_OUT }, 'reveal+=0.4');
}

function bootStatic() {
  // reduced motion: everything is already laid out and visible; only navigation helpers
  const update = () => updateHud(window.scrollY);
  chapters.forEach((c) => (c.top = c.el.getBoundingClientRect().top + window.scrollY));
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function bindGlobal() {
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !stage) return;
    stage.setPointer((e.clientX / VW()) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1, true);
  }, { passive: true });
  document.addEventListener('pointerleave', () => stage?.setPointer(0, 0, false));
  document.addEventListener('visibilitychange', () => stage?.setRunning(!document.hidden));
  let rt = 0, lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      const wasMobile = mobile;
      mobile = mqMobile.matches;
      if (wasMobile !== mobile) return location.reload();
      stage?.resize();
      if (window.innerWidth !== lastW || !mobile) ScrollTrigger.refresh();
      lastW = window.innerWidth;
    }, 180);
  });
}

setupNav();
if (RM) bootStatic();
else {
  bindGlobal();
  bootMotion().catch((e) => {
    console.error(e);
    html.classList.remove('intro');
    lenis?.start();
  });
}
