import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createGL } from './gl';
import { buildOdo, type Odo } from './odo';
import { $, $$, clamp, lerp, EASE, splitWords, riseWords, wipeIn } from './util';
import { createTeamPage } from './team';

declare global { interface Window { __alfReady?: boolean; __lenis?: Lenis } }
window.__alfReady = true;

gsap.registerPlugin(ScrollTrigger);
const root = document.documentElement;
const FX = root.classList.contains('fx');
const PAGE = (root.dataset.page || 'home') as 'home' | 'team' | 'contact';
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const isMobile = () => window.innerWidth <= 860;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/* ------------------------------------------------------------------ *
 * Smooth scroll
 * ------------------------------------------------------------------ */
let lenis: Lenis | null = null;
if (FX) {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ------------------------------------------------------------------ *
 * The light (WebGL) — one light carried from scene to scene
 * ------------------------------------------------------------------ */
const glCanvas = $<HTMLCanvasElement>('#gl');
const GL = createGL(glCanvas);
type SceneLight = { i: number; r: number; anchor?: HTMLElement | null; dx?: number; dy?: number };
// One light per scene, placed behind the focal element. r = falloff radius in viewport heights.
const sceneLight: Record<string, SceneLight> = {
  hero: { i: 1.0, r: 0.46 },
  story: { i: 0.5, r: 0.3 },
  numbers: { i: 0.8, r: 0.36 },
  expertise: { i: 0.85, r: 0.34 },
  method: { i: 0.85, r: 0.24 },
  statement: { i: 0.8, r: 0.3 },
  values: { i: 0.7, r: 0.18 },
  // page 3 · فريقنا
  'team-hero': { i: 1.0, r: 0.4 },
  leadership: { i: 0.75, r: 0.26 },
  groups: { i: 0.7, r: 0.2 },
  // page · تواصل معنا
  'contact-page': { i: 0.85, r: 0.34 },
  contact: { i: 0.85, r: 0.3 },
  outro: { i: 0.9, r: 0.36 },
};
const scenes = $$<HTMLElement>('.scene');
scenes.forEach((s) => {
  const k = s.dataset.scene!;
  if (sceneLight[k]) sceneLight[k].anchor = $<HTMLElement>('[data-anchor]', s);
});
const light = { boost: 0, override: null as null | { x: number; y: number } };
let introLight = FX ? 0 : 1; // the lamp is lit by the intro
let currentScene = 'hero';

function activeScene(): HTMLElement | null {
  const mid = window.innerHeight * 0.5;
  for (const s of scenes) {
    const r = s.getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) return s;
  }
  return null;
}

let lastT = 0;
function tickLight(time: number, snap = false) {
  if (!GL) return;
  const st = GL.state;
  const s = activeScene();
  if (s) currentScene = s.dataset.scene || currentScene;
  const cfg = sceneLight[currentScene] || sceneLight.hero;
  let tx = st.lx, ty = st.ly;
  if (light.override) {
    tx = light.override.x;
    ty = light.override.y;
  } else if (cfg.anchor) {
    const r = cfg.anchor.getBoundingClientRect();
    tx = (r.left + r.width / 2) / window.innerWidth + (cfg.dx || 0);
    ty = (r.top + r.height / 2) / window.innerHeight + (cfg.dy || 0);
  }
  tx = clamp(tx, -0.2, 1.2);
  ty = clamp(ty, -0.3, 1.3);
  // frame-rate independent easing: the light glides to its next place, then holds still
  const dt = Math.min(0.1, Math.max(0.001, time - lastT));
  lastT = time;
  const k = snap ? 1 : 1 - Math.exp(-dt * 5);
  const k2 = snap ? 1 : 1 - Math.exp(-dt * 3);
  st.lx = lerp(st.lx, tx, k);
  st.ly = lerp(st.ly, ty, k);
  st.lr = lerp(st.lr, cfg.r, k2);
  st.li = lerp(st.li, (cfg.i + light.boost) * introLight, k2);
  GL.render(FX ? time : 0);
}

if (GL) {
  glCanvas.classList.add('is-on');
  if (FX) {
    let visible = true;
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
    gsap.ticker.add((t) => { if (visible) tickLight(t); });
  } else {
    // Reduced motion: the light is placed (not animated) behind each scene's focal element.
    const still = () => tickLight(0, true);
    still();
    window.addEventListener('scroll', () => requestAnimationFrame(still), { passive: true });
  }
  window.addEventListener('resize', () => { GL.resize(); if (!FX) tickLight(0, true); });
}

/* ------------------------------------------------------------------ *
 * Header: solid on scroll, progress thread, active section
 * ------------------------------------------------------------------ */
const hdr = $('.hdr');
const navLinks = $$<HTMLAnchorElement>('.hdr__nav a');
const updateHeader = () => {
  const y = window.scrollY;
  hdr.classList.toggle('is-solid', y > 40);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  hdr.style.setProperty('--prog', String(clamp(y / Math.max(1, max))));
};
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

// Home: the active item follows the section in view. Other pages mark their own item in the markup.
if (PAGE === 'home') {
  const navTargets = ['#top', '#about', '#expertise', '#method', '#contact'];
  const sectionFor: Record<string, string> = { numbers: '#top', statement: '#method', values: '#method', outro: '#contact' };
  const setActiveNav = () => {
    const s = activeScene();
    if (!s) return;
    const id = sectionFor[s.dataset.scene || ''] || (s.id ? `#${s.id}` : '');
    if (!navTargets.includes(id)) return;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
  };
  window.addEventListener('scroll', setActiveNav, { passive: true });
  setActiveNav();
}

/* ------------------------------------------------------------------ *
 * Mobile menu
 * ------------------------------------------------------------------ */
const menuBtn = $<HTMLButtonElement>('.hdr__menu');
const mnav = $('#mnav');
const setMenu = (open: boolean) => {
  menuBtn.setAttribute('aria-expanded', String(open));
  if (open) {
    mnav.hidden = false;
    lenis?.stop();
    if (FX) {
      gsap.fromTo(mnav, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 0.8, ease: EASE.io });
      gsap.fromTo($$('.mnav li', mnav), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, ease: EASE.out, stagger: 0.05, delay: 0.25 });
    }
  } else {
    lenis?.start();
    if (FX) {
      gsap.to(mnav, { clipPath: 'inset(0 0 0 100%)', duration: 0.6, ease: EASE.io, onComplete: () => { mnav.hidden = true; } });
    } else mnav.hidden = true;
  }
};
menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));

/* ------------------------------------------------------------------ *
 * Day / night — the choice is remembered; switching, the new theme
 * spreads from the button as a widening circle of light
 * ------------------------------------------------------------------ */
const themeBtns = $$<HTMLButtonElement>('.thm');
const themeMeta = $<HTMLMetaElement>('meta[name="theme-color"]');
const syncThemeButtons = () => {
  const day = root.dataset.theme === 'light';
  themeBtns.forEach((b) => {
    b.setAttribute('aria-pressed', String(day));
    if (!b.classList.contains('thm--row')) b.setAttribute('aria-label', day ? 'المظهر الداكن' : 'المظهر الفاتح');
  });
};
syncThemeButtons();
function setTheme(next: 'light' | 'dark', from?: HTMLElement) {
  const apply = () => {
    root.dataset.theme = next;
    try { localStorage.setItem('alf-theme', next); } catch {}
    themeMeta?.setAttribute('content', next === 'light' ? '#f6f1e8' : '#070b14');
    syncThemeButtons();
    if (GL) { GL.state.theme = next === 'light' ? 1 : 0; GL.render(performance.now() / 1000); }
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!FX || !doc.startViewTransition || !from) { apply(); return; }
  const r = from.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const R = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  root.classList.add('is-theming');
  const vt = doc.startViewTransition(apply);
  vt.ready.then(() => {
    const anim = root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
      { duration: 1100, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
    );
    anim.finished.finally(() => root.classList.remove('is-theming'));
  }).catch(() => root.classList.remove('is-theming'));
}
themeBtns.forEach((b) => b.addEventListener('click', () => {
  setTheme(root.dataset.theme === 'light' ? 'dark' : 'light', b);
}));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !mnav.hidden) setMenu(false); });

/* ------------------------------------------------------------------ *
 * Transitions — one gesture: a gold edge of light sweeps right → left,
 * names the destination, and uncovers it.
 * ------------------------------------------------------------------ */
const veil = $('.veil');
const veilTitle = $('.veil__title');
let navigating = false;
function targetY(hash: string) {
  if (hash === '#top') return 0;
  const el = document.querySelector<HTMLElement>(hash);
  if (!el) return null;
  // pinned scenes are wrapped in a pin-spacer — scroll to the spacer's top
  const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
  return box.getBoundingClientRect().top + window.scrollY;
}
async function navigate(hash: string) {
  const y = targetY(hash);
  if (y === null) return;
  if (!mnav.hidden) setMenu(false);
  if (!FX) {
    window.scrollTo({ top: y, behavior: 'auto' });
    return;
  }
  if (navigating) return;
  navigating = true;
  const scene = hash === '#top' ? $('#top') : $(hash);
  veilTitle.textContent = scene?.dataset.title || '';
  const W = window.innerWidth;
  const v = { a: 100, b: 0 };
  const apply = (edge: number) => {
    veil.style.setProperty('--a', `${v.a}%`);
    veil.style.setProperty('--b', `${v.b}%`);
    veil.style.setProperty('--ex', `${edge}px`);
  };
  veil.classList.add('is-on');
  apply(W);
  light.boost = 0.25;
  await gsap.to(v, { a: 0, duration: 0.75, ease: EASE.io, onUpdate: () => apply((v.a / 100) * W - 1) });
  lenis?.scrollTo(y, { immediate: true, force: true });
  window.scrollTo(0, y);
  ScrollTrigger.update();
  // let the (possibly heavy) first frame at the destination pass before uncovering
  const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
  await raf(); await raf(); await raf();
  await new Promise((r) => setTimeout(r, 280));
  await raf();
  await gsap.to(v, { b: 100, duration: 0.9, ease: EASE.io, onUpdate: () => apply(W - (v.b / 100) * W - 1) });
  veil.classList.remove('is-on');
  v.a = 100; v.b = 0; apply(W);
  light.boost = 0;
  navigating = false;
  history.replaceState(null, '', hash === '#top' ? location.pathname : hash);
}
/* Between pages: the veil closes here, names the destination, and opens on the next page. */
const veilState = { a: 100, b: 0 };
const applyVeil = (edge: number) => {
  veil.style.setProperty('--a', `${veilState.a}%`);
  veil.style.setProperty('--b', `${veilState.b}%`);
  veil.style.setProperty('--ex', `${edge}px`);
};
async function leaveTo(href: string, title: string) {
  if (!FX) { location.href = href; return; }
  if (navigating) return;
  navigating = true;
  if (!mnav.hidden) setMenu(false);
  veilTitle.textContent = title;
  const W = window.innerWidth;
  veilState.a = 100; veilState.b = 0;
  veil.classList.add('is-on');
  applyVeil(W);
  light.boost = 0.25;
  await gsap.to(veilState, { a: 0, duration: 0.75, ease: EASE.io, onUpdate: () => applyVeil((veilState.a / 100) * W - 1) });
  try { sessionStorage.setItem('alf-veil', title); } catch {}
  location.href = href;
}
/** Opens the veil a page arrived under (see the head script in Base.astro). */
async function openArrivalVeil() {
  if (!root.classList.contains('is-arriving')) return;
  const W = window.innerWidth;
  veilState.a = 0; veilState.b = 0;
  veil.classList.add('is-on');
  applyVeil(-10);
  root.classList.remove('is-arriving');
  await gsap.to(veilState, { b: 100, duration: 0.9, ease: EASE.io, delay: 0.15, onUpdate: () => applyVeil(W - (veilState.b / 100) * W - 1) });
  veil.classList.remove('is-on');
  veilState.a = 100; veilState.b = 0; applyVeil(W);
}
// Coming back with the browser's back button restores this page as it was left: under a closed veil.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  navigating = false;
  light.boost = 0;
  veil.classList.remove('is-on');
  veilState.a = 100; veilState.b = 0; applyVeil(window.innerWidth);
});

$$<HTMLAnchorElement>('a[data-nav]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href') || '';
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new tab / window: let the browser handle it
    if (href.startsWith('#')) {
      e.preventDefault();
      navigate(href);
    } else if (href.startsWith('/')) {
      if (a.getAttribute('aria-current') === 'page') { e.preventDefault(); navigate('#top'); return; }
      e.preventDefault();
      leaveTo(href, a.dataset.title || a.textContent?.trim() || '');
    }
  });
});

/* ------------------------------------------------------------------ *
 * Odometers (built in both modes; animated only with motion)
 * ------------------------------------------------------------------ */
const odos = new Map<HTMLElement, Odo>();
$$('[data-odo]').forEach((el) => odos.set(el, buildOdo(el)));

const team = createTeamPage({
  FX,
  finePointer,
  isMobile,
  lenis,
  sceneLight,
  odos,
  hdr,
  lamp: { get v() { return introLight; }, set v(x: number) { introLight = x; } },
});

/* ================================================================== *
 * Everything below is motion — skipped entirely for reduced motion.
 * ================================================================== */
if (FX) {
  document.fonts.ready.then(() => {
    if (PAGE === 'home') {
      setupStory();
      setupNumbers();
      setupExpertise();
      setupMethod();
      setupStatement();
      setupValues();
    } else if (PAGE === 'team') {
      team.setup();
    }
    setupVoice();
    setupOutro();
    setupReveals(); // after the pins, so their positions include pin spacing
    ScrollTrigger.refresh();
    if (PAGE === 'home') {
      if (root.classList.contains('is-arriving')) arriveHome();
      else runIntro();
    } else if (PAGE === 'team') {
      team.enter(openArrivalVeil);
    } else {
      enterContact();
    }
  });
} else {
  setupVoice();
  if (PAGE === 'team') team.setupStatic();
}

/* The contact page opens simply: the light comes on, the invitation rises, the four cards follow. */
function enterContact() {
  const title = splitWords($('.cp__title'));
  const eyebrow = $('.cp__eyebrow');
  const lead = $('.cp__lead');
  const cards = $$('.cc');
  gsap.set(title, { yPercent: 118 });
  gsap.set(eyebrow, { '--rule': 0, opacity: 0 });
  gsap.set(lead, { opacity: 0, y: 14 });
  gsap.set(cards, { opacity: 0, y: 34 });
  const arriving = root.classList.contains('is-arriving');
  root.classList.remove('is-intro');
  lenis?.start();
  openArrivalVeil();
  const tl = gsap.timeline({ delay: arriving ? 0.35 : 0.1 });
  if (!arriving) tl.fromTo(hdr, { yPercent: -110 }, { yPercent: 0, duration: 1, ease: EASE.out, clearProps: 'transform' }, 0);
  tl.to({ v: introLight }, { v: 1, duration: 1.8, ease: 'power2.out', onUpdate() { introLight = (this.targets()[0] as { v: number }).v; } }, 0)
    .to(eyebrow, { opacity: 1, '--rule': 1, duration: 1.1, ease: EASE.out }, 0.15)
    .to(title, { yPercent: 0, duration: 1.1, ease: EASE.out, stagger: 0.07 }, 0.25)
    .to(lead, { opacity: 1, y: 0, duration: 1.2, ease: EASE.out }, 0.6)
    .to(cards, { opacity: 1, y: 0, duration: 1.3, ease: EASE.out, stagger: 0.09, clearProps: 'transform' }, 0.75);
}

/* Arriving on the home page from another page: no writing — the logo is already
   complete; jump straight to the section asked for, then open the veil. */
function arriveHome() {
  const svg = $<SVGSVGElement>('.hero__mark svg');
  $$('[mask]', svg).forEach((g) => g.removeAttribute('mask'));
  introLight = 1;
  startHeroSpecular(svg);
  const hash = location.hash;
  if (hash && hash.length > 1 && document.querySelector(hash)) {
    const y = targetY(hash);
    if (y !== null) {
      lenis?.scrollTo(y, { immediate: true, force: true });
      window.scrollTo(0, y);
      ScrollTrigger.update();
    }
  }
  openArrivalVeil();
}

/* ------------------------------------------------------------------ *
 * INTRO — the pen writes the name in light; the name becomes the lamp
 * ------------------------------------------------------------------ */
function runIntro() {
  const wrap = $('.hero__mark');
  const svg = $<SVGSVGElement>('svg', wrap);
  const paths = $$<SVGPathElement>('.write path', svg);
  const spark = $<SVGCircleElement>('.m-spark', svg);
  const penclip = $<SVGRectElement>('.penclip', svg);
  const pen = $('.m-pen', svg);
  const scale = $('.m-scale', svg);
  const glow = $('.m-glow', svg);
  lenis?.stop();
  window.scrollTo(0, 0);

  // centre the mark on screen for the writing
  const r = wrap.getBoundingClientRect();
  const targetH = Math.min(window.innerHeight * 0.58, window.innerWidth * 0.78);
  const s = targetH / r.height;
  const dx = window.innerWidth / 2 - (r.left + r.width / 2);
  const dy = window.innerHeight / 2 - (r.top + r.height / 2);
  gsap.set(wrap, { x: dx, y: dy, scale: s, transformOrigin: '50% 50%' });
  gsap.set(paths, { attr: { 'stroke-dasharray': '1 1' }, strokeDashoffset: 1 });
  gsap.set(penclip, { attr: { height: 0 } });
  gsap.set(scale, { rotation: -10, svgOrigin: '834 44' });
  gsap.set(glow, { opacity: 0 });

  // hero copy prepared
  const l1 = splitWords($('.hero__l1'));
  const l2 = splitWords($('.hero__l2'));
  gsap.set([...l1, ...l2], { yPercent: 118 });
  const body = $$('.hero__body p, .hero__cta');
  body.forEach((b) => { b.classList.add('wiping'); b.style.setProperty('--wp', '0'); });
  const eyebrow = $('.hero__eyebrow');
  gsap.set(eyebrow, { '--rule': 0, opacity: 0 });

  // the full writing plays once per tab; a reload or return visit gets a short fade
  let seen = false;
  try {
    seen = sessionStorage.getItem('alf-intro') === '1';
    sessionStorage.setItem('alf-intro', '1');
  } catch {}

  const finish = () => {
    lenis?.start();
    paths.forEach((p) => p.removeAttribute('style'));
    // the writing is complete: drop the mask for a crisp, cheap logo
    $$('[mask]', svg).forEach((g) => g.removeAttribute('mask'));
    gsap.set(penclip, { attr: { height: 840 } });
    startHeroSpecular(svg);
    // deep link (e.g. /#method): travel there with the house transition
    if (location.hash && location.hash.length > 1 && document.querySelector(location.hash)) navigate(location.hash);
  };
  const revealCopy = (tl: gsap.core.Timeline, at: number) => {
    tl.add(() => root.classList.remove('is-intro'), at)
      .fromTo(hdr, { yPercent: -110 }, { yPercent: 0, duration: 0.9, ease: EASE.out, clearProps: 'transform' }, at + 0.05)
      .to(eyebrow, { opacity: 1, '--rule': 1, duration: 1, ease: EASE.out }, at + 0.1)
      .to(l1, { yPercent: 0, duration: 0.95, ease: EASE.out, stagger: 0.06 }, at + 0.12)
      .to(l2, { yPercent: 0, duration: 0.95, ease: EASE.out, stagger: 0.045 }, at + 0.25)
      .add(() => body.forEach((b, i) => wipeIn(b, { delay: i * 0.1, duration: 1.2 })), at + 0.35)
      .fromTo('.link--hero', { opacity: 0 }, { opacity: 1, duration: 0.8 }, at + 0.6);
  };

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  if (seen) {
    gsap.set(wrap, { x: 0, y: 0, scale: 1 });
    gsap.set(paths, { strokeDashoffset: 0, visibility: 'visible' });
    gsap.set(penclip, { attr: { height: 840 } });
    gsap.set([pen, scale], { opacity: 1 });
    gsap.set(scale, { rotation: 0 });
    tl.fromTo(svg, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: EASE.soft }, 0)
      .to(glow, { opacity: 0.55, duration: 0.8, ease: EASE.soft }, 0.1)
      .add(() => { introLight = 1; }, 0);
    revealCopy(tl, 0.05);
    tl.add(finish, 0.9);
  } else {
    const weights = paths.map((p) => Math.pow(Number(p.dataset.l || 40), 0.6));
    const sum = weights.reduce((a, b) => a + b, 0);
    const TOTAL = 1.45;
    let cursor = 0.12;
    const lens = paths.map((p) => p.getTotalLength());
    tl.set(spark, { opacity: 1 }, cursor);
    paths.forEach((p, i) => {
      const d = (weights[i] / sum) * TOTAL;
      const prog = { v: 0 };
      tl.set(p, { visibility: 'visible' }, cursor);
      tl.to(prog, {
        v: 1,
        duration: d,
        ease: 'power1.inOut',
        onUpdate: () => {
          p.style.strokeDashoffset = String(1 - prog.v);
          const pt = p.getPointAtLength(prog.v * lens[i]);
          spark.setAttribute('cx', String(pt.x));
          spark.setAttribute('cy', String(pt.y));
          introLight = Math.min(1, 0.2 + (cursor / (TOTAL * 0.8)) * 0.8);
        },
      }, cursor);
      cursor += d * 0.8;
    });
    const writeEnd = cursor;
    tl.to(glow, { opacity: 0.55, duration: 0.9, ease: EASE.soft }, writeEnd - 0.6)
      .set(pen, { opacity: 1 }, writeEnd - 0.35)
      .to(penclip, { attr: { height: 820 }, duration: 0.55, ease: 'power2.inOut' }, writeEnd - 0.35)
      .to(spark, { attr: { cx: 712, cy: 770 }, duration: 0.55, ease: 'power2.inOut' }, writeEnd - 0.35)
      .to(spark, { opacity: 0, duration: 0.3 }, writeEnd + 0.15)
      .to(scale, { opacity: 1, duration: 0.4, ease: EASE.soft }, writeEnd - 0.25)
      .to(scale, { rotation: 0, duration: 1.6, ease: 'elastic.out(1, 0.34)' }, writeEnd - 0.25)
      .add(() => { introLight = 1; }, writeEnd - 0.2);
    const move = writeEnd - 0.05;
    tl.to(wrap, { x: 0, y: 0, scale: 1, duration: 1, ease: 'expo.inOut' }, move);
    revealCopy(tl, move + 0.35);
    tl.add(finish, move + 0.95);
  }

  const skip = () => { if (tl.progress() < 0.9) tl.timeScale(5); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, skip, { once: true, passive: true }));
}

/* The gold catches the pointer — a specular band across the calligraphy. */
function startHeroSpecular(svg: SVGSVGElement) {
  const hi = $<SVGStopElement>('.g-hi', svg);
  const s1 = $<SVGStopElement>('.g-s1', svg);
  const s2 = $<SVGStopElement>('.g-s2', svg);
  const st = { v: 0.5 };
  const set = () => {
    hi.setAttribute('offset', st.v.toFixed(3));
    s1.setAttribute('offset', clamp(st.v - 0.2, 0.01, 0.98).toFixed(3));
    s2.setAttribute('offset', clamp(st.v + 0.2, 0.02, 0.99).toFixed(3));
  };
  // one slow sweep, then follow the pointer
  gsap.fromTo(st, { v: 0.05 }, { v: 0.5, duration: 2.4, ease: EASE.io, onUpdate: set });
  if (finePointer) {
    let raf = 0;
    window.addEventListener('pointermove', (e) => {
      if (window.scrollY > window.innerHeight) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const t = clamp(0.2 + (e.clientX / window.innerWidth) * 0.4 + (e.clientY / window.innerHeight) * 0.2, 0.1, 0.9);
        gsap.to(st, { v: t, duration: 1.2, ease: EASE.soft, overwrite: true, onUpdate: set });
      });
    }, { passive: true });
  }
  // the hero copy drifts a little on scroll; the lamp sinks behind the fold
  gsap.to('.hero__mark', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
}

/* ------------------------------------------------------------------ *
 * Generic reveals (same vocabulary everywhere)
 * ------------------------------------------------------------------ */
function setupReveals() {
  $$('[data-split]').forEach((el) => {
    if (el.closest('[data-intro]')) return; // the page's opening plays its own entrance
    if (el.closest('.xp__list')) return;
    const words = splitWords(el);
    gsap.set(words, { yPercent: 118 });
    ScrollTrigger.create({ trigger: el, start: 'top 86%', once: true, onEnter: () => riseWords(words) });
  });
  $$('[data-reveal="rule"]').forEach((el) => {
    if (el.closest('[data-intro]')) return; // the page's opening plays its own entrance
    gsap.set(el, { '--rule': 0 });
    const rh = $('.rh', el);
    if (rh) gsap.set(rh, { scale: 0 });
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => {
        gsap.to(el, { '--rule': 1, duration: 1.6, ease: EASE.out });
        if (rh) gsap.to(rh, { scale: 1, rotation: 45, duration: 1, ease: 'back.out(2)' });
      },
    });
  });
  $$('[data-reveal="wipe"]').forEach((el) => {
    if (el.closest('[data-intro]')) return; // the page's opening plays its own entrance
    el.classList.add('wiping');
    el.style.setProperty('--wp', '0');
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => wipeIn(el) });
  });
}

/* ------------------------------------------------------------------ *
 * STORY — «الملف يُفتح»: a file opens, its sheets fan out,
 * and a gold seal ties them into one system
 * ------------------------------------------------------------------ */
type SheetPose = { x: number; y: number; r: number; s: number };
type StoryLayout = {
  mob: boolean;
  W: number; H: number;
  cx: number; u: number;
  fw: number; fh: number; fx: number; ftop: number;
  seal0: { x: number; y: number }; seal1: { x: number; y: number };
  sw: number; sh: number;
  inside: SheetPose[]; fan: SheetPose[]; sys: SheetPose[];
  busY: number; rowTop: number;
  y0: number; s0: number;
};

function setupStory() {
  const sec = $('.story');
  const stage = $('.story__stage', sec);
  const vis = $('.story__vis', sec);
  const text = $('.story__text', sec);
  const dossier = $('.dossier', sec);
  const cover = $('.dossier__front', sec);
  const seal = $('.story__seal', sec);
  const sheets = $$('.sheet', sec);
  const wires = $<SVGSVGElement>('.story__wires', sec);
  const link = $('.link--story');
  const strike = $<SVGPathElement>('.strike__m', sec);
  const N = sheets.length;
  const MID = (N - 1) / 2;
  const wire = (cls: string) => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', cls);
    wires.appendChild(p);
    return p;
  };
  const fanWires = sheets.map(() => wire('w-fan'));
  const tree = wire('w-tree');
  const tail = wire('w-tail');
  const io = gsap.parseEase('power3.inOut');
  const out = gsap.parseEase('power3.out');
  const l1 = splitWords($('.story__l1', sec));
  const l2 = splitWords($('.story__l2', sec));
  const value = splitWords($('.story__value', sec));
  const closing = $$('.story__closing > span', sec).flatMap((s) => splitWords(s));
  gsap.set(strike, { attr: { 'stroke-dasharray': '1 1' }, strokeDashoffset: 1 });

  let L: StoryLayout | undefined;
  const measure = () => {
    const sr = stage.getBoundingClientRect();
    const W = sr.width, H = sr.height;
    const mob = isMobile();
    const hdrH = mob ? 66 : 84;
    const pad = parseFloat(getComputedStyle(stage).getPropertyValue('padding-right')) || Math.max(20, W * 0.046);
    const gutter = Math.min(76, Math.max(20, W * 0.046)) || pad;
    if (mob) {
      // phones: the text on top, the file below; the sheets settle into a column
      const tr = text.getBoundingClientRect();
      const l1Bottom = $('.story__l1', sec).getBoundingClientRect().bottom - sr.top;
      const top = tr.bottom - sr.top + 18;
      const bottom = H - 18;
      const u = clamp((bottom - top) / 470, 0.66, 1.1);
      const cx = W / 2;
      const fw = 152 * u, fh = 112 * u;
      const ftop = bottom - fh;
      const seal1 = { x: cx, y: top + 8 };
      const step = (ftop - 16 * u - (seal1.y + 26 * u)) / N;
      L = {
        mob, W, H, cx, u, fw, fh, fx: cx - fw / 2, ftop,
        seal0: { x: cx, y: ftop + fh * 0.07 }, seal1,
        sw: 172 * u, sh: 34 * u,
        inside: sheets.map((_, i) => ({ x: cx + (MID - i) * 2, y: ftop + fh * 0.52, r: 0, s: 0.72 })),
        fan: sheets.map((_, i) => ({ x: cx + (i % 2 ? -1 : 1) * 26 * u, y: ftop - 58 * u - (N - 1 - i) * 39 * u, r: (i % 2 ? -1 : 1) * 3.5, s: 1 })),
        sys: sheets.map((_, i) => ({ x: cx, y: seal1.y + 26 * u + step * i + step / 2, r: 0, s: 1 })),
        busY: 0, rowTop: 0,
        // the file starts large, centred under the first line, then sinks into place
        y0: (l1Bottom + bottom) / 2 - (fh * 1.7) / 2, s0: 1.7,
      };
    } else {
      // desktop: the file in the left column; the sheets fan in an arc, then hang in a row from one bus
      const left = gutter, right = W * 0.53;
      const top = hdrH + 26, bottom = H - 34;
      const u = clamp(Math.min((right - left) / 700, (bottom - top) / 780), 0.72, 1.4);
      const cx = (left + right) / 2;
      const fw = 340 * u, fh = 236 * u;
      const ftop = top + (bottom - top) * 0.6 - fh / 2;
      const sw = 98 * u, sh = 130 * u;
      const seal0 = { x: cx, y: ftop + fh * 0.07 };
      const seal1 = { x: cx, y: top + 30 * u };
      const R = 252 * u;
      const k = 0.86;
      const gap = 11 * u;
      const rowTop = seal1.y + 70 * u;
      L = {
        mob, W, H, cx, u, fw, fh, fx: cx - fw / 2, ftop, seal0, seal1, sw, sh,
        inside: sheets.map((_, i) => ({ x: cx + (MID - i) * 4 * u, y: ftop + fh * 0.5, r: (MID - i) * 1.2, s: 0.86 })),
        fan: sheets.map((_, i) => {
          const a = ((MID - i) * 20 * Math.PI) / 180;
          return { x: seal0.x + Math.sin(a) * R, y: seal0.y - Math.cos(a) * R, r: (MID - i) * 20, s: 1 };
        }),
        sys: sheets.map((_, i) => ({ x: cx + (MID - i) * (sw * k + gap), y: rowTop + (sh * k) / 2, r: 0, s: k })),
        busY: rowTop - 24 * u, rowTop,
        y0: ftop, s0: 1,
      };
    }
    vis.style.setProperty('--sw', `${L.sw}px`);
    vis.style.setProperty('--sh', `${L.sh}px`);
    vis.style.setProperty('--fz', `${(L.mob ? 15 : 15.5) * L.u}px`);
    dossier.style.width = `${L.fw}px`;
    dossier.style.height = `${L.fh}px`;
    dossier.style.transform = `translate(${L.fx}px, ${L.ftop}px)`;
    wires.setAttribute('viewBox', `0 0 ${W} ${H}`);
    link.style.setProperty('--lx', `${(L.cx / W) * 100}%`);
  };

  const state = { p: 0 };
  const seg = (a: number, b: number) => clamp((state.p - a) / (b - a));
  const mix = (a: SheetPose, b: SheetPose, t: number): SheetPose => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), r: lerp(a.r, b.r, t), s: lerp(a.s, b.s, t) });
  const render = () => {
    if (!L) return;
    const l = L;
    // the cover swings open, then closes once the sheets are out
    const open = io(seg(0.13, 0.3)) * (1 - io(seg(0.66, 0.82)));
    cover.style.setProperty('--open', `${-180 * open}deg`);
    const fx = l.fx - (l.fw / 2) * open;
    const settleIn = io(seg(0.04, 0.2));
    const s = lerp(l.s0, 1, settleIn);
    const fy = lerp(l.y0, l.ftop, settleIn);
    dossier.style.transformOrigin = '50% 0';
    dossier.style.transform = `translate(${fx}px, ${fy}px) scale(${s})`;
    const fileCx = fx + l.fw / 2;
    const sealAt = { x: l.seal0.x, y: fy + (l.seal0.y - l.ftop) * s };
    vis.classList.toggle('is-out', state.p > 0.27);
    // the seal rises from the file to the head of the system and lights
    const rise = io(seg(0.6, 0.78));
    const sx = lerp(sealAt.x, l.seal1.x, rise);
    const sy = lerp(sealAt.y, l.seal1.y, rise);
    seal.style.transform = `translate(${sx}px, ${sy}px) rotate(45deg) scale(${1 + 0.25 * io(seg(0.78, 0.86))})`;
    const lit = io(seg(0.76, 0.88));
    seal.style.setProperty('--lit', String(lit));
    sceneLight.story.i = 0.35 + 0.65 * lit;
    sceneLight.story.r = 0.18 + 0.06 * lit;
    // sheets: inside the file → fanned out → settled into the system
    const settle = sheets.map((_, i) => io(seg(0.6 + Math.abs(MID - i) * 0.012, 0.76 + Math.abs(MID - i) * 0.012)));
    const fanOut = sheets.map((_, i) => out(seg(0.27 + i * 0.022, 0.46 + i * 0.022)));
    const poses = sheets.map((el, i) => {
      const inside = { ...l.inside[i], x: l.inside[i].x - l.cx + fileCx, y: fy + (l.inside[i].y - l.ftop) * s, s: l.inside[i].s * s };
      const p = mix(mix(inside, l.fan[i], fanOut[i]), l.sys[i], settle[i]);
      el.style.transform = `translate(${p.x - l.sw / 2}px, ${p.y - l.sh / 2}px) rotate(${p.r}deg) scale(${p.s})`;
      return p;
    });
    // fan wires: from the seal to each sheet while they hang in the arc
    fanWires.forEach((w, i) => {
      const k = clamp((fanOut[i] - 0.55) / 0.45) * (1 - clamp(settle[i] * 2.2));
      if (k <= 0.001) { w.setAttribute('d', ''); return; }
      const p = poses[i];
      const a = (p.r * Math.PI) / 180;
      const edge = l.mob ? 0 : (l.sh / 2) * p.s; // desktop: the arc sits above the seal, so wires meet the sheet's lower edge
      const ex = p.x + Math.sin(a) * edge;
      const ey = p.y + Math.cos(a) * edge;
      w.setAttribute('d', `M${sx},${sy} L${lerp(sx, ex, k)},${lerp(sy, ey, k)}`);
    });
    // the system's tree: a trunk from the seal, then a bus with a drop to every sheet
    const grow = io(seg(0.74, 0.9));
    if (grow > 0.001) {
      if (l.mob) {
        tree.setAttribute('d', `M${l.cx},${sy} L${l.cx},${lerp(sy, l.ftop, grow)}`);
      } else {
        const half = (l.sys[0].x - l.sys[N - 1].x) / 2;
        const xl = l.cx - half * grow, xr = l.cx + half * grow;
        let d = `M${l.cx},${sy} L${l.cx},${lerp(sy, l.busY, clamp(grow * 2))}`;
        if (grow > 0.5) {
          const b = (grow - 0.5) * 2;
          d += ` M${lerp(l.cx, xl, b)},${l.busY} L${lerp(l.cx, xr, b)},${l.busY}`;
          l.sys.forEach((n) => {
            if (Math.abs(n.x - l.cx) <= half * b + 0.5) d += ` M${n.x},${l.busY} L${n.x},${l.rowTop}`;
          });
        }
        tree.setAttribute('d', d);
      }
    } else tree.setAttribute('d', '');
    // the tail: the thread continues down into the next scene
    const drop = io(seg(0.88, 1));
    if (drop > 0.001) {
      const y0 = l.mob ? l.ftop : l.rowTop + l.sh * 0.86;
      tail.setAttribute('d', `M${l.cx},${y0} L${l.cx},${lerp(y0, l.H, drop)}`);
    } else tail.setAttribute('d', '');
  };

  measure();
  ScrollTrigger.addEventListener('refresh', () => { measure(); render(); });
  gsap.matchMedia().add({ desk: '(min-width: 861px)', mob: '(max-width: 860px)' }, (ctx) => {
    const mob = !!ctx.conditions?.mob;
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    tl.to(state, { p: 1, duration: 1 }, 0);
    tl.to(strike, { strokeDashoffset: 0, duration: 0.15, ease: 'power2.inOut' }, 0.02);
    const rise = (words: HTMLElement[], at: number, d: number) =>
      // ±135%: far enough that no dot above or below a letter lingers in the mask's padding
      tl.fromTo(words, { yPercent: 135 }, { yPercent: 0, duration: d, stagger: d / Math.max(1, words.length) / 2, ease: 'power3.out' }, at);
    const sink = (words: HTMLElement[], at: number, d: number) =>
      tl.fromTo(words, { yPercent: 0 }, { yPercent: -135, duration: d, stagger: d / Math.max(1, words.length) / 3, ease: 'power3.in', immediateRender: false }, at);
    if (mob) {
      // phones show one paragraph at a time in the same place
      sink(l1, 0.3, 0.05);
      rise(l2, 0.36, 0.1);
      sink(l2, 0.7, 0.05);
      rise(value, 0.76, 0.06);
      rise(closing, 0.83, 0.1);
    } else {
      rise(l2, 0.36, 0.12);
      rise(value, 0.79, 0.06);
      rise(closing, 0.85, 0.1);
    }
    ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      end: () => `+=${window.innerHeight * (mob ? 0.95 : 1.2)}`,
      pin: true,
      scrub: 0.6,
      animation: tl,
      invalidateOnRefresh: true,
    });
  });
  let visible = false;
  ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });
  gsap.ticker.add(() => { if (visible) render(); });
}

/* ------------------------------------------------------------------ *
 * NUMBERS — the record settles like a mechanism
 * ------------------------------------------------------------------ */
function setupNumbers() {
  const lead = $('.lead-num .odo');
  const leadOdo = odos.get(lead)!;
  // pre-wind to zero
  $$('.strip', lead).forEach((s) => gsap.set(s, { yPercent: 0 }));
  const pre = $('.lead-num__pre');
  const unit = $('.lead-num__unit');
  gsap.set([pre, unit], { opacity: 0, x: 30 });
  ScrollTrigger.create({
    trigger: '.lead-num', start: 'top 95%', once: true,
    onEnter: () => {
      gsap.to(pre, { opacity: 1, x: 0, duration: 1.2, ease: EASE.out });
      leadOdo.play(0.1);
      gsap.to(unit, { opacity: 1, x: 0, duration: 1.2, ease: EASE.out, delay: 1.6 });
    },
  });
  const items = $$('.ledger__item');
  items.forEach((it) => {
    const el = $('.odo', it);
    const o = odos.get(el)!;
    $$('.strip', el).forEach((s) => gsap.set(s, { yPercent: 0 }));
    gsap.set(it, { '--mp': 0 });
    gsap.set($('.ledger__label', it), { opacity: 0 });
    it.addEventListener('pointerenter', () => { if (o.done) o.sweep(); });
  });
  ScrollTrigger.create({
    trigger: '.ledger', start: 'top 80%', once: true,
    onEnter: () => {
      items.forEach((it, i) => {
        const el = $('.odo', it);
        const delay = i * 0.12;
        odos.get(el)!.play(delay);
        gsap.to($('.ledger__label', it), { opacity: 1, duration: 1, delay: delay + 0.3, ease: EASE.soft });
        gsap.to(it, { '--mp': 1, duration: 1.8, delay: delay + 0.9, ease: EASE.out });
      });
    },
  });
  // the glass catches light from the pointer
  const plate = $('.ledger');
  plate.addEventListener('pointermove', (e) => {
    const r = plate.getBoundingClientRect();
    plate.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`);
  });
}

/* ------------------------------------------------------------------ *
 * EXPERTISE — an astrolabe; turning it brings one practice into the light
 * ------------------------------------------------------------------ */
function setupExpertise() {
  const stage = $('.xp__stage');
  const dial = $('.xp__dial', stage);
  const ticks = $<SVGSVGElement>('.xp__ticks', stage);
  const items = $$('.xp__item', stage);
  const rows = $$<HTMLButtonElement>('.xp__row', stage);
  const nms = $$('.xp__nm', stage);
  const N = items.length;
  const SVGNS = 'http://www.w3.org/2000/svg';
  // build the instrument
  const mk = (tag: string, attrs: Record<string, string | number>, parent: Element) => {
    const e = document.createElementNS(SVGNS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
    parent.appendChild(e);
    return e;
  };
  mk('circle', { r: 498, fill: 'none', stroke: 'rgba(226,190,118,.38)', 'stroke-width': 1.2 }, ticks);
  mk('circle', { r: 440, fill: 'none', stroke: 'rgba(255,255,255,.07)', 'stroke-width': 1 }, ticks);
  mk('circle', { r: 268, fill: 'none', stroke: 'rgba(226,190,118,.18)', 'stroke-width': 1, 'stroke-dasharray': '2 6' }, ticks);
  mk('circle', { r: 120, fill: 'none', stroke: 'rgba(255,255,255,.08)', 'stroke-width': 1 }, ticks);
  mk('circle', { r: 46, fill: 'none', stroke: 'rgba(226,190,118,.3)', 'stroke-width': 1 }, ticks);
  const rotG = mk('g', { class: 'rot' }, ticks);
  for (let a = 0; a < 360; a += 2) {
    const major = a % 30 === 0;
    const mid = a % 10 === 0;
    const r1 = major ? 456 : mid ? 470 : 478;
    const rad = (a * Math.PI) / 180;
    mk('line', {
      x1: Math.cos(rad) * r1, y1: Math.sin(rad) * r1, x2: Math.cos(rad) * 492, y2: Math.sin(rad) * 492,
      stroke: major ? 'rgba(246,223,166,.85)' : 'rgba(226,190,118,.32)', 'stroke-width': major ? 2 : 1,
    }, rotG);
  }
  const sight = mk('g', { class: 'rot2' }, ticks);
  mk('circle', { r: 360, fill: 'none', stroke: 'rgba(226,190,118,.55)', 'stroke-width': 1.2, 'stroke-dasharray': '120 1011', 'stroke-linecap': 'round' }, sight);
  mk('circle', { r: 360, fill: 'none', stroke: 'rgba(255,255,255,.06)', 'stroke-width': 1 }, sight);
  mk('path', { d: 'M500 0 l-16 -8 v16z', fill: '#f6dfa6' }, ticks);

  let active = -1;
  const show = (i: number) => {
    if (i === active) return;
    active = i;
    items.forEach((it, k) => it.classList.toggle('is-on', k === i));
    nms.forEach((l, k) => l.classList.toggle('is-on', k === i));
  };
  show(0);

  const rot2 = $('.rot2', ticks) as unknown as SVGGElement;
  // one short pin (~0.9 viewport): the instrument turns through all six; every title stays readable
  const st = ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: () => `+=${window.innerHeight * 0.9}`,
    pin: true,
    scrub: 0.5,
    // snapping fights touch scrolling; only a mouse/trackpad gets it
    snap: finePointer ? { snapTo: 1 / (N - 1), duration: { min: 0.2, max: 0.5 }, delay: 0.1, ease: EASE.io } : undefined,
    onUpdate: (self) => {
      const f = self.progress * (N - 1);
      dial.style.setProperty('--rot', `${-f * 30}deg`);
      rot2.style.transform = `rotate(${f * 22}deg)`;
      show(Math.round(f));
    },
  });
  rows.forEach((r, i) => r.addEventListener('click', () => {
    const y = st.start + (i / (N - 1)) * (st.end - st.start);
    if (lenis) lenis.scrollTo(y, { duration: 1 });
    else window.scrollTo(0, y);
  }));
  gsap.from([ticks, $('.xp__num', dial)], { opacity: 0, scale: 0.92, duration: 1.8, ease: EASE.out, scrollTrigger: { trigger: '.xp', start: 'top 70%', once: true } as ScrollTrigger.Vars });

  // the pointer's leader: a gold line from the instrument to the area it names
  const lead = document.createElementNS(SVGNS, 'svg');
  lead.setAttribute('class', 'xp__lead');
  lead.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVGNS, 'path');
  const dot = document.createElementNS(SVGNS, 'circle');
  dot.setAttribute('r', '2.5');
  lead.append(path, dot);
  stage.appendChild(lead);
  const ly = { v: -1 };
  let vis = false;
  ScrollTrigger.create({ trigger: '.xp', start: 'top bottom', end: 'bottom top', onToggle: (x) => { vis = x.isActive; } });
  gsap.ticker.add(() => {
    if (!vis || isMobile()) { path.setAttribute('d', ''); return; }
    const sr = stage.getBoundingClientRect();
    const dr = dial.getBoundingClientRect();
    const px = dr.right - sr.left + 6, py = dr.top + dr.height / 2 - sr.top;
    const row = $('.xp__row', items[Math.max(0, active)]);
    const rr = row.getBoundingClientRect();
    const tx = rr.left - sr.left - 18;
    const ty = rr.top + rr.height / 2 - sr.top;
    ly.v = ly.v < 0 ? ty : lerp(ly.v, ty, 0.14);
    const mx = px + (tx - px) * 0.55;
    path.setAttribute('d', `M${px},${py} C${mx},${py} ${mx},${ly.v} ${tx},${ly.v}`);
    dot.setAttribute('cx', String(tx));
    dot.setAttribute('cy', String(ly.v));
  });
}

/* ------------------------------------------------------------------ *
 * METHOD — one scene: the file arrives as noise; a front of light moves
 * along the rail, each step lights, and behind it the strands become one line
 * ------------------------------------------------------------------ */
function setupMethod() {
  const sec = $('.mth');
  const stage = $('.mth__stage');
  const canvas = $<HTMLCanvasElement>('.mth__wave', stage);
  const ctx = canvas.getContext('2d')!;
  const steps = $$('.mth__step', stage);
  const nodes = $$('.mth__node', stage);
  const seal = $('.mth__seal', stage);
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    W = canvas.clientWidth; H = canvas.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
  };
  resize();
  window.addEventListener('resize', resize);
  const state = { p: 0 };
  ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: () => `+=${window.innerHeight * 0.9}`,
    pin: true,
    scrub: 0.6,
    onUpdate: (self) => { state.p = self.progress; },
  });
  let visible = false;
  ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });

  const draw = (t: number) => {
    const cr = canvas.getBoundingClientRect();
    const nx = nodes.map((n) => { const r = n.getBoundingClientRect(); return r.left + r.width / 2 - cr.left; });
    const sr = seal.getBoundingClientRect();
    const sealX = sr.left + sr.width / 2 - cr.left;
    const startX = nx[0] + (nx[0] - nx[1]) * 0.6; // a little before the first step
    const yc = H / 2;
    // the front travels right → left (RTL) across the whole rail
    const p = gsap.parseEase('power1.inOut')(clamp(state.p / 0.92));
    const front = lerp(startX, sealX, p);
    steps.forEach((s, i) => {
      s.classList.toggle('is-on', front <= nx[i] + 2);
      s.classList.toggle('is-now', front <= nx[i] + 2 && (i === steps.length - 1 || front > nx[i + 1] + 2));
    });
    sec.classList.toggle('is-sealed', state.p > 0.96);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const amp = H * (isMobile() ? 0.3 : 0.34);
    const left = sealX, right = Math.min(W, startX + W * 0.06);
    // noise ahead of the front (x < front), one calm line behind it (x > front)
    const ampAt = (x: number) => {
      const ahead = 1 - clamp((x - (front - 90)) / 150); // 1 well ahead, 0 behind
      const edgeL = clamp((x - left) / 60); // settle into the seal
      const edgeR = clamp((right - x) / 120); // fade in at the start of the rail
      return amp * ahead * edgeL * edgeR;
    };
    const alphaAt = (x: number) => clamp((right - x) / 140) * (x >= left - 1 ? 1 : 0);
    // the processed line — bright, single
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(Math.max(left, front), yc);
    ctx.lineTo(right, yc);
    const lg = ctx.createLinearGradient(right, 0, left, 0);
    lg.addColorStop(0, 'rgba(226,190,118,0)');
    lg.addColorStop(0.08, 'rgba(240,210,150,0.9)');
    lg.addColorStop(1, 'rgba(250,228,180,1)');
    ctx.strokeStyle = lg;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(226,190,118,0.8)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // the unprocessed strands
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      let started = false;
      for (let x = Math.min(front + 120, right); x >= left; x -= 3) {
        const A = ampAt(x);
        const n =
          Math.sin(x * 0.012 + t * 1.2 + k * 1.9) * 0.55 +
          Math.sin(x * 0.029 - t * 0.85 + k * 0.7) * 0.3 +
          Math.sin(x * 0.067 + t * 2.0 + k * 2.6) * 0.15;
        const y = yc + A * n * (0.65 + 0.35 * Math.sin(k + x * 0.004));
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(226,190,118,${(0.28 + k * 0.07) * alphaAt(front)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // the front: a bead of light (the pen tip again)
    if (state.p > 0.002 && state.p < 0.96) {
      const g = ctx.createRadialGradient(front, yc, 0, front, yc, 22);
      g.addColorStop(0, 'rgba(255,250,236,1)');
      g.addColorStop(0.3, 'rgba(232,196,122,0.55)');
      g.addColorStop(1, 'rgba(226,190,118,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(front, yc, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    const fx = (cr.left + clamp(front, left, right)) / window.innerWidth;
    light.override = currentScene === 'method' ? { x: fx, y: (cr.top + yc) / window.innerHeight } : null;
  };
  gsap.ticker.add((t) => {
    if (visible) draw(t);
    else if (light.override && currentScene !== 'method') light.override = null;
  });
}

/* ------------------------------------------------------------------ *
 * STATEMENT — reading turns the lights on; «بمنظومة» ignites
 * ------------------------------------------------------------------ */
function setupStatement() {
  const words = $$('.stmt [data-light]').flatMap((el) => splitWords(el));
  const b = $('.stmt__b');
  words.forEach((w) => { (w.parentElement as HTMLElement).style.overflow = 'visible'; });
  gsap.set($('.stmt__line'), { scaleX: 0 });
  ScrollTrigger.create({
    trigger: '.stmt',
    start: 'top 75%',
    end: 'center 45%',
    scrub: 0.5,
    onUpdate: (self) => {
      const p = self.progress;
      const n = words.length;
      words.forEach((w, i) => {
        const o = clamp(p * (n + 2) - i);
        w.style.opacity = String(0.14 + o * 0.86);
      });
      $('.stmt__line').style.transform = `scaleX(${clamp(p * 1.6)})`;
      const lit = clamp((p - 0.82) / 0.18);
      b.style.filter = lit > 0 ? `drop-shadow(0 0 ${lit * 26}px rgba(226,190,118,${lit * 0.55}))` : '';
      sceneLight.statement.i = 0.35 + lit * 0.7;
    },
  });
  words.forEach((w) => { w.style.opacity = '0.14'; });
}

/* ------------------------------------------------------------------ *
 * VALUES — a short pin: scroll fills each value with light, in reading order
 * ------------------------------------------------------------------ */
function setupValues() {
  const sec = $('.val');
  const stage = $('.val__stage', sec);
  const items = $$('.val__item', sec);
  const marks = items.map((it) => $('.val__rh', it));
  const N = items.length;
  items.forEach((it) => {
    it.style.setProperty('--f', '0');
    it.style.setProperty('--d', '0');
    it.style.setProperty('--r', '0');
  });
  const fill = gsap.parseEase('power2.inOut');
  const out = gsap.parseEase('power3.out');
  const apply = (p: number) => {
    const span = 0.92 / N;
    let current = 0;
    items.forEach((it, i) => {
      const at = 0.04 + i * span;
      const f = fill(clamp((p - at) / (span * 0.72)));
      const d = out(clamp((p - at - span * 0.45) / (span * 0.55)));
      it.style.setProperty('--f', f.toFixed(4));
      it.style.setProperty('--d', d.toFixed(4));
      it.style.setProperty('--r', f.toFixed(4));
      if (p >= at) current = i;
    });
    // the scene's light rests on the value being filled
    sceneLight.values.anchor = marks[current];
  };
  apply(0);
  ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: () => `+=${window.innerHeight * 0.95}`,
    pin: true,
    scrub: 0.5,
    onUpdate: (self) => apply(self.progress),
  });
}

/* ------------------------------------------------------------------ *
 * VOICE — the consultation mic listens; the waveform answers
 * ------------------------------------------------------------------ */
function setupVoice() {
  const link = $('.voice');
  const cvs = $$<HTMLCanvasElement>('.voice__wave', link);
  const ctxs = cvs.map((c) => c.getContext('2d')!);
  let energy = 0.55, target = 0.55, visible = !FX;
  link.addEventListener('pointerenter', () => { target = 1; });
  link.addEventListener('pointerleave', () => { target = 0.55; });
  const size = () => cvs.forEach((c) => {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.clientWidth * d; c.height = c.clientHeight * d;
  });
  size();
  window.addEventListener('resize', size);
  const draw = (t: number) => {
    energy = lerp(energy, target, 0.06);
    cvs.forEach((c, side) => {
      const ctx = ctxs[side];
      const w = c.width, h = c.height;
      ctx.clearRect(0, 0, w, h);
      const n = Math.max(14, Math.floor(w / (9 * (window.devicePixelRatio || 1))));
      const gap = w / n;
      for (let i = 0; i < n; i++) {
        // distance from the ring: right canvas → ring on its left edge; left canvas → ring on its right edge
        const fromRing = side === 0 ? i / n : 1 - i / n;
        const env = Math.pow(1 - fromRing, 1.6);
        const v = FX
          ? 0.5 + 0.5 * Math.sin(t * 3.1 + i * 0.55) * Math.sin(t * 1.7 + i * 0.23 + side)
          : 0.6 + 0.4 * Math.sin(i * 0.9);
        const bh = Math.max(2, h * (0.08 + 0.85 * env * v * energy));
        const x = i * gap + gap / 2;
        const g = ctx.createLinearGradient(0, h / 2 - bh / 2, 0, h / 2 + bh / 2);
        g.addColorStop(0, 'rgba(246,223,166,0.95)');
        g.addColorStop(1, 'rgba(173,131,45,0.6)');
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.25 + 0.75 * env;
        const bw = Math.max(1.5, gap * 0.34);
        ctx.beginPath();
        ctx.roundRect(x - bw / 2, h / 2 - bh / 2, bw, bh, bw / 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  };
  if (FX) {
    ScrollTrigger.create({ trigger: link, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });
    gsap.ticker.add((t) => { if (visible) draw(t); });
  } else draw(0);
}

/* ------------------------------------------------------------------ *
 * OUTRO — the name is written once more; the lamp dims to an ember
 * ------------------------------------------------------------------ */
function setupOutro() {
  const svg = $<SVGSVGElement>('.outro__logo svg');
  const paths = $$<SVGPathElement>('.write path', svg);
  const penclip = $<SVGRectElement>('.penclip', svg);
  const words = $('.m-words', svg);
  const scale = $('.m-scale', svg);
  const glow = $('.m-glow', svg);
  gsap.set(paths, { attr: { 'stroke-dasharray': '1 1' }, strokeDashoffset: 1, visibility: 'hidden' });
  gsap.set(penclip, { attr: { height: 0 } });
  gsap.set([words, scale], { opacity: 0 });
  gsap.set(glow, { opacity: 0 });
  const weights = paths.map((p) => Math.pow(Number(p.dataset.l || 40), 0.62));
  const sum = weights.reduce((a, b) => a + b, 0);
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  let c = 0;
  paths.forEach((p, i) => {
    const d = (weights[i] / sum) * 0.6;
    tl.set(p, { visibility: 'visible' }, c + 0.0001);
    tl.to(p, { strokeDashoffset: 0, duration: d }, c);
    c += d * 0.9;
  });
  tl.to(penclip, { attr: { height: 840 }, duration: 0.18, ease: 'power2.inOut' }, c - 0.05)
    .to(scale, { opacity: 1, duration: 0.1 }, c)
    .to(glow, { opacity: 0.5, duration: 0.2 }, c - 0.1)
    .to(words, { opacity: 1, duration: 0.18 }, c + 0.05);
  ScrollTrigger.create({
    trigger: '.outro',
    start: 'top 75%',
    end: 'bottom bottom',
    scrub: 0.6,
    animation: tl,
    onUpdate: (self) => {
      if (GL) GL.state.dim = self.progress * 0.38;
      sceneLight.outro.i = 0.5 + self.progress * 0.5;
      sceneLight.outro.r = 0.34 - self.progress * 0.12;
    },
  });
}
