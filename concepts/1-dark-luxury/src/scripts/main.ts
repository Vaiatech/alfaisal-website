import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createGL } from './gl';
import { buildOdo, type Odo } from './odo';
import { $, $$, clamp, lerp, EASE, splitWords, riseWords, wipeIn } from './util';

declare global { interface Window { __alfReady?: boolean; __lenis?: Lenis } }
window.__alfReady = true;

gsap.registerPlugin(ScrollTrigger);
const root = document.documentElement;
const FX = root.classList.contains('fx');
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
const sceneLight: Record<string, SceneLight> = {
  hero: { i: 1.2, r: 0.34 },
  story: { i: 0.55, r: 0.26 },
  numbers: { i: 0.75, r: 0.36 },
  expertise: { i: 0.85, r: 0.3 },
  method: { i: 0.7, r: 0.28 },
  statement: { i: 0.75, r: 0.3 },
  values: { i: 0.55, r: 0.22 },
  team: { i: 0.7, r: 0.22 },
  contact: { i: 0.85, r: 0.3 },
  outro: { i: 0.9, r: 0.26 },
};
const scenes = $$<HTMLElement>('.scene');
scenes.forEach((s) => {
  const k = s.dataset.scene!;
  if (sceneLight[k]) sceneLight[k].anchor = $('[data-anchor]', s);
});
const light = { boost: 0, override: null as null | { x: number; y: number } };
let introLight = FX ? 0 : 1; // the lamp is lit by the intro
let currentScene = 'hero';
const mouse = { x: 0.5, y: 0.4, tx: 0.5, ty: 0.4 };
window.addEventListener('pointermove', (e) => {
  mouse.tx = e.clientX / window.innerWidth;
  mouse.ty = e.clientY / window.innerHeight;
}, { passive: true });

function activeScene(): HTMLElement | null {
  const mid = window.innerHeight * 0.5;
  for (const s of scenes) {
    const r = s.getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) return s;
  }
  return null;
}

let lastT = 0;
function tickLight(time: number) {
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
    tx = (r.left + r.width / 2) / window.innerWidth;
    ty = (r.top + r.height / 2) / window.innerHeight;
  }
  // keep it on-screen-ish so the haze never vanishes entirely
  tx = clamp(tx, -0.15, 1.15);
  ty = clamp(ty, -0.2, 1.2);
  // frame-rate independent easing toward the target
  const dt = Math.min(0.1, Math.max(0.001, time - lastT));
  lastT = time;
  const k = 1 - Math.exp(-dt * 3.6);
  const k2 = 1 - Math.exp(-dt * 2.8);
  st.lx = lerp(st.lx, tx, k);
  st.ly = lerp(st.ly, ty, k);
  st.lr = lerp(st.lr, cfg.r, k2);
  const breathe = 1 + Math.sin(time * 0.6) * 0.06;
  st.li = lerp(st.li, (cfg.i + light.boost) * introLight * breathe, k2);
  mouse.x = lerp(mouse.x, mouse.tx, k2);
  mouse.y = lerp(mouse.y, mouse.ty, k2);
  st.mx = mouse.x;
  st.my = mouse.y;
  st.scroll = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  GL.render(FX ? time : 12.0);
}

if (GL) {
  glCanvas.classList.add('is-on');
  if (FX) {
    let visible = true;
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
    gsap.ticker.add((t) => { if (visible) tickLight(t); });
  } else {
    // Reduced motion: one still frame per scroll settle, no animation.
    GL.state.li = 0.9;
    const still = () => { const s = activeScene(); if (s) currentScene = s.dataset.scene || currentScene; GL.state.li = sceneLight[currentScene].i; tickLight(12); };
    for (let i = 0; i < 30; i++) tickLight(12);
    window.addEventListener('scroll', () => requestAnimationFrame(still), { passive: true });
  }
  window.addEventListener('resize', () => GL.resize());
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

const navTargets = ['#top', '#about', '#expertise', '#method', '#team', '#contact'];
const sectionFor: Record<string, string> = { numbers: '#about', statement: '#method', values: '#method', outro: '#contact' };
const setActiveNav = () => {
  const s = activeScene();
  if (!s) return;
  const id = s.id ? `#${s.id}` : sectionFor[s.dataset.scene || ''] || '';
  if (!navTargets.includes(id)) return;
  navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
};
window.addEventListener('scroll', setActiveNav, { passive: true });
setActiveNav();

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
  if (hash === '#team') veilTitle.textContent = 'فريقنا · قريبًا';
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
$$<HTMLAnchorElement>('a[data-nav]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('#')) return;
    e.preventDefault();
    navigate(href);
  });
});

/* ------------------------------------------------------------------ *
 * Odometers (built in both modes; animated only with motion)
 * ------------------------------------------------------------------ */
const odos = new Map<HTMLElement, Odo>();
$$('[data-odo]').forEach((el) => odos.set(el, buildOdo(el)));

/* ================================================================== *
 * Everything below is motion — skipped entirely for reduced motion.
 * ================================================================== */
if (FX) {
  document.fonts.ready.then(() => {
    setupStory();
    setupNumbers();
    setupExpertise();
    setupMethod();
    setupStatement();
    setupValues();
    setupTeam();
    setupVoice();
    setupOutro();
    setupReveals(); // after the pins, so their positions include pin spacing
    ScrollTrigger.refresh();
    runIntro();
  });
} else {
  setupVoice();
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

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  const weights = paths.map((p) => Math.pow(Number(p.dataset.l || 40), 0.62));
  const sum = weights.reduce((a, b) => a + b, 0);
  const TOTAL = 2.3;
  let cursor = 0.35;
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
        introLight = Math.min(1, 0.15 + (cursor / (TOTAL + 0.35)) * 0.85);
      },
    }, cursor);
    cursor += d * 0.86;
  });
  const writeEnd = cursor + 0.1;
  tl.to(glow, { opacity: 0.55, duration: 1.2, ease: EASE.soft }, writeEnd - 0.8)
    .to(spark, { attr: { cx: 712, cy: 418 }, duration: 0.5, ease: EASE.io }, writeEnd)
    .set(pen, { opacity: 1 }, writeEnd + 0.2)
    .to(penclip, { attr: { height: 820 }, duration: 0.9, ease: 'power2.inOut' }, writeEnd + 0.2)
    .to(spark, { attr: { cy: 770 }, duration: 0.9, ease: 'power2.inOut' }, writeEnd + 0.2)
    .to(spark, { opacity: 0, duration: 0.5 }, writeEnd + 0.9)
    .to(scale, { opacity: 1, duration: 0.6, ease: EASE.soft }, writeEnd + 0.4)
    .to(scale, { rotation: 0, duration: 2.4, ease: 'elastic.out(1, 0.32)' }, writeEnd + 0.4)
    .add(() => { introLight = 1; }, writeEnd + 0.4);

  const move = writeEnd + 1.0;
  tl.to(wrap, { x: 0, y: 0, scale: 1, duration: 1.5, ease: 'expo.inOut' }, move)
    .add(() => root.classList.remove('is-intro'), move + 0.4)
    .fromTo(hdr, { yPercent: -110 }, { yPercent: 0, duration: 1.2, ease: EASE.out, clearProps: 'transform' }, move + 0.7)
    .to(eyebrow, { opacity: 1, '--rule': 1, duration: 1.4, ease: EASE.out }, move + 0.8)
    .to(l1, { yPercent: 0, duration: 1.3, ease: EASE.out, stagger: 0.08 }, move + 0.85)
    .to(l2, { yPercent: 0, duration: 1.3, ease: EASE.out, stagger: 0.06 }, move + 1.05)
    .add(() => body.forEach((b, i) => wipeIn(b, { delay: i * 0.15 })), move + 1.25)
    .fromTo('.hero__cue', { opacity: 0 }, { opacity: 1, duration: 1 }, move + 1.8)
    .add(() => {
      lenis?.start();
      paths.forEach((p) => p.removeAttribute('style'));
      // the writing is complete: drop the mask for a crisp, cheap logo
      $$('[mask]', svg).forEach((g) => g.removeAttribute('mask'));
      gsap.set(penclip, { attr: { height: 840 } });
      startHeroSpecular(svg);
    }, move + 1.6);

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
    if (el.closest('.hero')) return;
    if (el.closest('.xp__list')) return;
    const words = splitWords(el);
    gsap.set(words, { yPercent: 118 });
    ScrollTrigger.create({ trigger: el, start: 'top 86%', once: true, onEnter: () => riseWords(words) });
  });
  $$('[data-reveal="rule"]').forEach((el) => {
    if (el.closest('.hero')) return;
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
    if (el.closest('.hero')) return;
    el.classList.add('wiping');
    el.style.setProperty('--wp', '0');
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => wipeIn(el) });
  });
}

/* ------------------------------------------------------------------ *
 * STORY — scattered details are pulled into one system by a gold thread
 * ------------------------------------------------------------------ */
function setupStory() {
  const stage = $('.story__stage');
  const chips = $$('.chip', stage);
  const canvas = $<HTMLCanvasElement>('.story__threads', stage);
  const ctx = canvas.getContext('2d')!;
  const lines = $$('.story__line', stage);
  const head = $('.story__head', stage);
  const core = $('.story__core', stage);
  const N = chips.length;
  // hand-placed scatter (fractions of the stage), like papers on a desk
  const scatterD = [[0.14, 0.24], [0.82, 0.18], [0.9, 0.62], [0.1, 0.7], [0.32, 0.88], [0.7, 0.86], [0.56, 0.12]];
  const scatterM = [[0.2, 0.16], [0.78, 0.22], [0.82, 0.78], [0.16, 0.84], [0.28, 0.66], [0.74, 0.62], [0.5, 0.92]];
  const rot = [-8, 6, -4, 9, -6, 4, -10];
  const state = { p: 0 };
  let W = 0, H = 0, dpr = 1;
  const sizes: { w: number; h: number }[] = [];
  const measure = () => {
    const r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    chips.forEach((c, i) => { sizes[i] = { w: c.offsetWidth, h: c.offsetHeight }; });
  };
  measure();
  window.addEventListener('resize', measure);

  const hdrH = () => (isMobile() ? 66 : 84);
  const cy = () => H / 2 + hdrH() * 0.35;
  const pos = (i: number, p: number, t: number) => {
    const sc = (isMobile() ? scatterM : scatterD)[i];
    const sx = sc[0] * W, sy = sc[1] * H;
    // ring (ellipse) around the centre, starting at the top, running clockwise in reading order (RTL)
    const mob = isMobile();
    const rx = mob ? W * 0.3 : Math.min(W * 0.34, H * 0.62);
    const ry = mob ? H * 0.32 : H * 0.33;
    // mobile: keep the horizontal band through the text clear of chips
    const MOB = [-90, -38, 38, 72, 108, 142, 218];
    const a = mob ? (MOB[i] * Math.PI) / 180 : -Math.PI / 2 + (i / N) * Math.PI * 2;
    const ox = W / 2 + Math.cos(a) * rx, oy = cy() + Math.sin(a) * ry;
    const k = gsap.parseEase('power3.inOut')(clamp((p - 0.55) / 0.3));
    const drift = (1 - k) * 8;
    return {
      x: lerp(sx, ox, k) + Math.sin(t * 0.5 + i * 1.7) * drift,
      y: lerp(sy, oy, k) + Math.cos(t * 0.4 + i * 1.3) * drift,
      r: lerp(rot[i], 0, k),
    };
  };

  const draw = (t: number) => {
    const p = state.p;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pts = chips.map((_, i) => pos(i, p, t));
    // chips
    chips.forEach((c, i) => {
      const lit = clamp((p - 0.18 - i * 0.04) / 0.08);
      c.style.transform = `translate(${pts[i].x - sizes[i].w / 2}px, ${pts[i].y - sizes[i].h / 2}px) rotate(${pts[i].r}deg)`;
      c.style.opacity = String(0.38 + lit * 0.62);
      c.style.filter = lit < 1 ? `blur(${(1 - lit) * 1.6}px)` : '';
    });
    // the thread: drawn chip to chip in reading order as each detail lights
    const reach = clamp((p - 0.2) / 0.32) * (N - 1);
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(226,190,118,0.8)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(233,200,130,0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < N - 1; i++) {
      const f = clamp(reach - i);
      if (f <= 0) break;
      const a = pts[i], b = pts[i + 1];
      const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.12, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.12;
      ctx.moveTo(a.x, a.y);
      // partial quadratic via subdivision
      const steps = 24;
      for (let s = 1; s <= Math.round(steps * f); s++) {
        const u = s / steps;
        const x = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * mx + u * u * b.x;
        const y = (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * my + u * u * b.y;
        ctx.lineTo(x, y);
      }
    }
    // closing the system
    const close = clamp((p - 0.78) / 0.1);
    if (close > 0) {
      const a = pts[N - 1], b = pts[0];
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(lerp(a.x, b.x, close), lerp(a.y, b.y, close));
    }
    ctx.stroke();
    // spokes to the core once the ring has formed
    const spokes = clamp((p - 0.82) / 0.12);
    if (spokes > 0) {
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      pts.forEach((pt) => {
        const g = ctx.createLinearGradient(pt.x, pt.y, W / 2, cy());
        g.addColorStop(0, `rgba(246,223,166,${0.34 * spokes})`);
        g.addColorStop(0.75, 'rgba(226,190,118,0)');
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(lerp(pt.x, W / 2, spokes), lerp(pt.y, cy(), spokes));
        ctx.stroke();
      });
    }
    // a bead of light travelling on the thread
    if (reach > 0 && reach < N - 1) {
      const i = Math.floor(reach), f = reach - i;
      const a = pts[i], b = pts[i + 1];
      const x = lerp(a.x, b.x, f), y = lerp(a.y, b.y, f);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
      g.addColorStop(0, 'rgba(255,248,230,0.95)');
      g.addColorStop(0.3, 'rgba(226,190,118,0.45)');
      g.addColorStop(1, 'rgba(226,190,118,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // text frames
  gsap.set(lines[0], { opacity: 1 });
  const tl = gsap.timeline({ defaults: { ease: EASE.io } });
  tl.to(state, { p: 1, duration: 1, ease: 'none' }, 0)
    .to(lines[0], { opacity: 0, y: -16, duration: 0.06 }, 0.17)
    .fromTo(lines[1], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.08 }, 0.22)
    .to(lines[1], { opacity: 0, y: -16, duration: 0.06 }, 0.52)
    .fromTo(lines[2], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.08 }, 0.56)
    .to(lines[2], { opacity: 0, y: -16, duration: 0.05 }, 0.8)
    .to(head, { opacity: 0, y: -30, duration: 0.08 }, 0.8)
    .fromTo(lines[3], { opacity: 0, y: 24 }, { opacity: 1, y: () => (isMobile() ? -96 : -40), duration: 0.1 }, 0.86)
    .fromTo(core, { scale: 0, rotation: 45 }, { scale: 1, rotation: 45, duration: 0.08, ease: 'back.out(2)' }, 0.86);

  ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: () => `+=${window.innerHeight * 2.6}`,
    pin: true,
    scrub: 0.8,
    animation: tl,
    onUpdate: (self) => {
      sceneLight.story.i = 0.4 + self.progress * 0.6;
    },
  });
  // lines[3] sits above centre to leave room for the core
  let visible = false;
  ScrollTrigger.create({ trigger: '.story', start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });
  gsap.ticker.add((t) => { if (visible) draw(t); });
  draw(0);
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
    trigger: '.lead-num', start: 'top 78%', once: true,
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
  const lbls = $$('.xp__lbl', stage);
  const nms = $$('.xp__nm', stage);
  lbls.forEach((l, k) => l.style.setProperty('--lo', String(clamp(1 - (k * 30) / 75) ** 1.4)));
  const pips = $$<HTMLButtonElement>('.xp__pips button', stage);
  const N = items.length;
  const SVGNS = 'http://www.w3.org/2000/svg';
  // build the instrument
  const mk = (tag: string, attrs: Record<string, string | number>, parent: Element) => {
    const e = document.createElementNS(SVGNS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
    parent.appendChild(e);
    return e;
  };
  const defs = mk('defs', {}, ticks);
  const rg = mk('radialGradient', { id: 'xpG' }, defs);
  mk('stop', { offset: 0, 'stop-color': '#e2be76', 'stop-opacity': 0.14 }, rg);
  mk('stop', { offset: 1, 'stop-color': '#e2be76', 'stop-opacity': 0 }, rg);
  mk('circle', { r: 500, fill: 'url(#xpG)' }, ticks);
  mk('circle', { r: 498, fill: 'none', stroke: 'rgba(226,190,118,.35)', 'stroke-width': 1.2 }, ticks);
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
  // a second, counter-rotating sight ring
  const sight = mk('g', { class: 'rot2' }, ticks);
  mk('circle', { r: 360, fill: 'none', stroke: 'rgba(226,190,118,.55)', 'stroke-width': 1.2, 'stroke-dasharray': '120 1011', 'stroke-linecap': 'round' }, sight);
  mk('circle', { r: 360, fill: 'none', stroke: 'rgba(255,255,255,.06)', 'stroke-width': 1 }, sight);
  // pointer at 3 o'clock
  mk('path', { d: 'M500 0 l-16 -8 v16z', fill: '#f6dfa6' }, ticks);

  let active = -1;
  const words = items.map((it) => splitWords($('.xp__h', it)));
  const show = (i: number) => {
    if (i === active) return;
    const prev = active;
    active = i;
    lbls.forEach((l, k) => l.classList.toggle('is-on', k === i));
    nms.forEach((l, k) => l.classList.toggle('is-on', k === i));
    pips.forEach((p, k) => p.classList.toggle('is-on', k === i));
    items.forEach((it, k) => {
      if (k === i) {
        gsap.killTweensOf([it, ...words[k], $('.xp__p', it), $('.xp__idx', it)]);
        gsap.set(it, { autoAlpha: 1 });
        gsap.fromTo($('.xp__idx', it), { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.9, ease: EASE.out });
        gsap.fromTo(words[k], { yPercent: 118 }, { yPercent: 0, duration: 1.05, ease: EASE.out, stagger: 0.06 });
        const p = $('.xp__p', it);
        p.classList.add('wiping');
        gsap.fromTo(p, { '--wp': 0 }, { '--wp': 1, duration: 1.3, ease: EASE.soft, delay: 0.15, onComplete: () => p.classList.remove('wiping') });
      } else if (k === prev) {
        gsap.to(it, { autoAlpha: 0, duration: 0.35, ease: 'power2.in' });
      } else {
        gsap.set(it, { autoAlpha: 0 });
      }
    });
  };
  items.forEach((it) => gsap.set(it, { autoAlpha: 0 }));
  show(0);

  const rot2 = $('.rot2', ticks) as unknown as SVGGElement;
  const st = ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: () => `+=${window.innerHeight * 0.75 * (N - 1)}`,
    pin: true,
    scrub: 0.6,
    snap: { snapTo: 1 / (N - 1), duration: { min: 0.25, max: 0.7 }, delay: 0.08, ease: EASE.io },
    onUpdate: (self) => {
      const f = self.progress * (N - 1);
      dial.style.setProperty('--rot', `${-f * 30}deg`);
      lbls.forEach((l, k) => {
        const ang = Math.abs((k - f) * 30);
        l.style.setProperty('--lo', String(clamp(1 - ang / 75) ** 1.4));
      });
      rot2.style.transform = `rotate(${f * 22}deg)`;
      show(Math.round(f));
    },
  });
  pips.forEach((p, i) => p.addEventListener('click', () => {
    const y = st.start + (i / (N - 1)) * (st.end - st.start);
    lenis?.scrollTo(y, { duration: 1.2 });
  }));
  // entrance: the instrument turns in from the dark
  gsap.from(dial, { rotation: 40, opacity: 0, scale: 0.9, duration: 2, ease: EASE.out, scrollTrigger: { trigger: '.xp', start: 'top 70%', once: true } as ScrollTrigger.Vars });
}

/* ------------------------------------------------------------------ *
 * METHOD — the file arrives as noise; each step calms it into one line
 * ------------------------------------------------------------------ */
function setupMethod() {
  const stage = $('.mth__stage');
  const track = $('.mth__track', stage);
  const canvas = $<HTMLCanvasElement>('.mth__wave', stage);
  const ctx = canvas.getContext('2d')!;
  const steps = $$('.mth__step', stage);
  const seal = $('.mth__seal', stage);
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    const r = stage.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
  };
  resize();
  window.addEventListener('resize', resize);
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  // snap so a step always comes to rest in the centre of the screen
  let snaps: number[] = [0, 1];
  const measureSnaps = () => {
    const prev = gsap.getProperty(track, 'x') as number;
    gsap.set(track, { x: 0 });
    const tr = track.getBoundingClientRect();
    const d = dist() || 1;
    snaps = [0, ...steps.map((s) => {
      const r = s.getBoundingClientRect();
      return clamp((tr.right - (r.left + r.width / 2) - window.innerWidth / 2) / d);
    }), 1];
    gsap.set(track, { x: prev });
  };
  ScrollTrigger.addEventListener('refreshInit', measureSnaps);
  measureSnaps();
  gsap.to(track, {
    x: () => dist(),
    ease: 'none',
    scrollTrigger: {
      trigger: stage,
      start: 'top top',
      end: () => `+=${dist()}`,
      pin: true,
      scrub: 0.7,
      invalidateOnRefresh: true,
      snap: { snapTo: (v: number) => snaps.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a)), duration: { min: 0.3, max: 0.9 }, delay: 0.12, ease: EASE.io },
    },
  });
  let visible = false;
  ScrollTrigger.create({ trigger: '.mth', start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });

  const draw = (t: number) => {
    const sr = stage.getBoundingClientRect();
    const xs = steps.map((s) => { const r = s.getBoundingClientRect(); return r.left + r.width / 2 - sr.left; });
    const sealR = seal.getBoundingClientRect();
    const sealX = sealR.left + sealR.width / 2 - sr.left;
    const yc = H * (isMobile() ? 0.62 : 0.64);
    // active step = nearest to centre
    let best = 0, bd = 1e9;
    xs.forEach((x, i) => { const d = Math.abs(x - W / 2); if (d < bd) { bd = d; best = i; } });
    steps.forEach((s, i) => s.classList.toggle('is-on', i === best && bd < W * 0.32));
    // light follows the wave-front
    const front = clamp((W / 2 - xs[0]) / (xs[xs.length - 1] - xs[0] || 1));
    void front;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // calm(x): 0 at step 1 → 1 at step 5 (RTL: x decreases along the journey)
    const calm = (x: number) => {
      if (x >= xs[0]) return 0;
      for (let i = 0; i < xs.length - 1; i++) {
        if (x <= xs[i] && x >= xs[i + 1]) return (i + (xs[i] - x) / (xs[i] - xs[i + 1])) / (xs.length - 1);
      }
      return 1;
    };
    const alpha = (x: number) => {
      const fadeIn = clamp(1 - (x - xs[0]) / (W * 0.45));
      const fadeOut = x < sealX ? 0 : 1;
      return fadeIn * fadeOut;
    };
    const amp = H * (isMobile() ? 0.1 : 0.13);
    const strands = 4;
    for (let k = 0; k < strands; k++) {
      ctx.beginPath();
      let started = false;
      for (let x = W + 4; x >= -4; x -= 4) {
        const a = alpha(x);
        if (a <= 0.001) { started = false; continue; }
        const c = calm(x);
        const A = amp * Math.pow(1 - c, 1.7);
        const n =
          Math.sin(x * 0.011 + t * 1.25 + k * 1.9) * 0.55 +
          Math.sin(x * 0.027 - t * 0.9 + k * 0.7) * 0.3 +
          Math.sin(x * 0.061 + t * 2.1 + k * 2.6) * 0.15;
        const y = yc + A * n * (0.6 + 0.4 * Math.sin(k + x * 0.003));
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      const g = ctx.createLinearGradient(W, 0, 0, 0);
      g.addColorStop(0, 'rgba(226,190,118,0.0)');
      g.addColorStop(0.2, `rgba(226,190,118,${0.35 + k * 0.08})`);
      g.addColorStop(1, `rgba(246,223,166,${0.55 + k * 0.08})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = k === 0 ? 1.6 : 1;
      ctx.shadowColor = 'rgba(226,190,118,0.7)';
      ctx.shadowBlur = k === 0 ? 12 : 0;
      ctx.stroke();
    }
    // light the lamp on the active word
    const ax = xs[best] + sr.left;
    light.override = currentScene === 'method' ? { x: ax / window.innerWidth, y: (sr.top + yc) / window.innerHeight } : null;
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
 * VALUES — engraved words, found only by light
 * ------------------------------------------------------------------ */
function setupValues() {
  const sec = $('.val');
  const lamp = $('.val__lamp', sec);
  const items = $$('.val__item', sec);
  const words = items.map((it) => $('.val__word', it));
  const lits = items.map((it) => $('.val__lit', it));
  const L = { x: 0, y: 0, tx: 0, ty: 0 };
  let pointerIn = false;
  let visible = false;
  if (finePointer) {
    sec.addEventListener('pointerenter', () => { pointerIn = true; });
    sec.addEventListener('pointerleave', () => { pointerIn = false; });
    sec.addEventListener('pointermove', (e) => {
      const r = sec.getBoundingClientRect();
      L.tx = e.clientX - r.left;
      L.ty = e.clientY - r.top;
    });
  }
  ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });
  const R = () => (isMobile() ? 170 : 300);
  gsap.ticker.add((t) => {
    if (!visible) return;
    const sr = sec.getBoundingClientRect();
    if (!pointerIn) {
      // the lamp wanders on its own, following the reader down the wall
      const vy = window.innerHeight * 0.55 - sr.top;
      L.tx = sr.width * (0.5 + Math.sin(t * 0.55) * (isMobile() ? 0.3 : 0.36));
      L.ty = clamp(vy + Math.sin(t * 0.8) * 40, 0, sr.height);
    }
    L.x = lerp(L.x || L.tx, L.tx, 0.08);
    L.y = lerp(L.y || L.ty, L.ty, 0.08);
    lamp.style.transform = `translate(${L.x}px, ${L.y}px)`;
    const rad = R();
    words.forEach((w, i) => {
      const r = w.getBoundingClientRect();
      const lx = L.x - (r.left - sr.left);
      const ly = L.y - (r.top - sr.top);
      lits[i].style.setProperty('--lx', `${lx}px`);
      lits[i].style.setProperty('--ly', `${ly}px`);
      lits[i].style.setProperty('--lr', `${rad}px`);
      const cx = r.left - sr.left + r.width / 2, cy = r.top - sr.top + r.height / 2;
      const d = Math.hypot((L.x - cx) / Math.max(1, r.width / 2 + rad * 0.3), (L.y - cy) / (r.height / 2 + rad * 0.4));
      items[i].style.setProperty('--b', String(clamp(1.6 - d)));
    });
  });
}

/* ------------------------------------------------------------------ *
 * TEAM — the door opens a little as you approach
 * ------------------------------------------------------------------ */
function setupTeam() {
  const door = $('.team__door');
  gsap.fromTo(door, { '--open': '2deg', '--gl': 0.5 }, {
    '--open': '24deg', '--gl': 1, ease: 'none',
    scrollTrigger: { trigger: '.team', start: 'top 80%', end: 'center 40%', scrub: 0.6 },
  });
  const soon = $('.team__soon');
  gsap.fromTo(soon, { opacity: 0, filter: 'blur(14px)' }, {
    opacity: 1, filter: 'blur(0px)', duration: 2, ease: EASE.out,
    scrollTrigger: { trigger: soon, start: 'top 85%', once: true } as ScrollTrigger.Vars,
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
