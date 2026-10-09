/* Al-Faisal — Concept 3 · motion & interaction.
   One vocabulary everywhere: rise (line masks), wipe (in the reading direction), reel (numbers),
   write (calligraphy), grow (colour fields out of the pillar column). Eases: expo.out / power4.inOut. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const html = document.documentElement;
const MOTION = html.classList.contains('motion');
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll(s)) as T[];
const isDesk = () => window.matchMedia('(min-width: 1024px)').matches;
const EO = 'expo.out';
const EIO = 'power4.inOut';

/* ---------- geometry: the real viewport width drives the grid maths ---------- */
function setVw() { document.body.style.setProperty('--vw', `${html.clientWidth}px`); }
setVw();

/* ---------- smooth scroll ---------- */
let lenis: Lenis | null = null;
if (MOTION) {
  lenis = new Lenis({ lerp: 0.13, wheelMultiplier: 1, touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  (window as any).__lenis = lenis;
}

/* =========================================================================
   Reels
   ========================================================================= */
type Reel = { el: HTMLElement; strip: HTMLElement; p: number };
type ReelNum = { root: HTMLElement; reels: Reel[]; seps: HTMLElement[]; value: number };
const reelCache = new WeakMap<HTMLElement, ReelNum>();
function reelNum(root: HTMLElement): ReelNum {
  let r = reelCache.get(root);
  if (r) return r;
  r = {
    root,
    value: Number(root.dataset.value),
    reels: $$<HTMLElement>('.rl', root).map((el) => ({ el, strip: $('.rl-s', el)!, p: Number(el.dataset.p) })),
    seps: $$<HTMLElement>('[data-sep]', root),
  };
  reelCache.set(root, r);
  return r;
}
/* Odometer: each place turns only while the places below it roll over. */
function setReels(n: ReelNum, v: number) {
  for (const r of n.reels) {
    const unit = 10 ** r.p;
    let pos: number;
    if (r.p === 0) pos = v % 10;
    else pos = (Math.floor(v / unit) % 10) + Math.max(0, (v % unit) - (unit - 1));
    r.strip.style.transform = `translate3d(0, ${-pos}em, 0)`;
    r.el.style.opacity = r.p === 0 || v >= unit - 0.5 ? '1' : '.16';
  }
  for (const s of n.seps) s.style.opacity = v >= 999.5 ? '1' : '.16';
}
function spin(root: HTMLElement, opts: { duration?: number; delay?: number; ease?: string; onUpdate?: (v: number) => void; onComplete?: () => void } = {}) {
  const n = reelNum(root);
  const o = { v: 0 };
  return gsap.to(o, {
    v: n.value,
    duration: opts.duration ?? 1.6,
    delay: opts.delay ?? 0,
    ease: opts.ease ?? 'power4.out',
    onUpdate: () => { setReels(n, o.v); opts.onUpdate?.(o.v); },
    onComplete: () => { setReels(n, n.value); opts.onComplete?.(); },
  });
}

/* =========================================================================
   Calligraphy writing (stroke mask)
   ========================================================================= */
function prepWrite(svg: SVGSVGElement) {
  const maskId = svg.dataset.write!;
  const cal = $<SVGUseElement>('.mk-cal', svg)!;
  const paths = $$<SVGPathElement>(`#${maskId} path`, svg);
  for (const p of paths) {
    const L = Number(p.dataset.l) + Number(p.getAttribute('stroke-width')) + 4;
    p.style.strokeDasharray = `${L} ${L + 10}`;
    p.style.strokeDashoffset = `${L}`;
    p.style.opacity = '0';
    (p as any)._L = L;
  }
  cal.setAttribute('mask', `url(#${maskId})`);
  const parts = $$<SVGUseElement>('.mk-pen, .mk-scale, .mk-band', svg);
  gsap.set(parts, { opacity: 0 });
  return { cal, paths, parts };
}
function writeTl(svg: SVGSVGElement, total = 1.8) {
  const { cal, paths, parts } = prepWrite(svg);
  const sum = paths.reduce((a, p) => a + Number(p.dataset.l), 0);
  const tl = gsap.timeline();
  const pen = parts.find((p) => p.classList.contains('mk-pen'));
  const scale = parts.find((p) => p.classList.contains('mk-scale'));
  const band = parts.find((p) => p.classList.contains('mk-band'));
  if (pen) tl.fromTo(pen, { opacity: 0, y: -60 }, { opacity: 1, y: 0, duration: 0.9, ease: EO }, 0);
  let t = 0.15;
  for (const p of paths) {
    const d = Math.max(0.035, (Number(p.dataset.l) / sum) * total);
    tl.set(p, { opacity: 1 }, t);
    tl.to(p, { strokeDashoffset: 0, duration: d, ease: 'power1.inOut' }, t);
    t += d * 0.9;
  }
  if (scale) tl.fromTo(scale, { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.8, ease: EO }, t - 0.5);
  if (band) tl.fromTo(band, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'none' }, t - 0.6);
  tl.add(() => cal.removeAttribute('mask'));
  return tl;
}

/* =========================================================================
   Reveals: lines rise, text blocks wipe in the reading direction
   ========================================================================= */
const manual = (el: Element) => !!el.closest('.hero, .vs, .intro, .shutter');
function initReveals() {
  const groups = new Set<HTMLElement>();
  $$('.ln').forEach((ln) => { if (!manual(ln)) groups.add(ln.parentElement as HTMLElement); });
  groups.forEach((g) => $$('.ln', g).forEach((ln, k) => ln.style.setProperty('--k', String(k))));
  const items: HTMLElement[] = [...groups];
  const sib = new Map<Element, number>();
  $$('.rv, .lg-row, .pt, .numbers-rule').forEach((el) => {
    if (manual(el)) return;
    const parent = el.parentElement!;
    const k = sib.get(parent) ?? 0;
    sib.set(parent, k + 1);
    el.style.setProperty('--k', String(k));
    items.push(el);
  });
  if (!MOTION) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      el.classList.add('is-in');
      el.dispatchEvent(new CustomEvent('reveal'));
      io.unobserve(el);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
  items.forEach((el) => io.observe(el));
}

/* =========================================================================
   Hero entrance (after the intro, or on its own)
   ========================================================================= */
function heroIn(delay = 0) {
  const hero = $('.hero')!;
  const lines = $$('.hero .ln');
  lines.forEach((ln, k) => ln.style.setProperty('--k', String(k)));
  const rvs = $$('.hero .rv');
  rvs.forEach((el, k) => el.style.setProperty('--k', String(k + 2)));
  gsap.delayedCall(delay, () => {
    lines.forEach((l) => l.classList.add('is-in'));
    rvs.forEach((l) => l.classList.add('is-in'));
    hero.classList.add('is-in');
  });
  gsap.fromTo('.hd-in > *', { yPercent: -140 }, { yPercent: 0, duration: 1, ease: EO, stagger: 0.07, delay: delay + 0.1 });
}

/* =========================================================================
   Intro
   ========================================================================= */
function runIntro() {
  const intro = $('.intro')!;
  const mark = $<SVGSVGElement>('#intro-mark')!;
  const count = $('.intro-num')!;
  lenis?.stop();
  const tl = gsap.timeline();
  const write = writeTl(mark, 1.75);
  mark.classList.add('is-ready');
  setReels(reelNum(count), 0);
  tl.add(write, 0.15);
  tl.add(spin(count, { duration: 2.0, ease: 'power2.inOut' }), 0.1);
  tl.addLabel('contract', '>+0.15');

  const finish = () => {
    html.classList.remove('play-intro');
    gsap.set(intro, { clearProps: 'all' });
    lenis?.start();
    ScrollTrigger.refresh();
    try { sessionStorage.setItem('af3-intro', '1'); } catch (e) { /* private mode */ }
  };

  tl.add(() => {
    const pillar = $('.hero-pillar')!.getBoundingClientRect();
    const target = $('#hero-mark')!.getBoundingClientRect();
    const from = mark.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const clip = `inset(${Math.max(0, pillar.top)}px ${vw - pillar.right}px ${Math.max(0, vh - pillar.bottom)}px ${pillar.left}px)`;
    const sub = gsap.timeline({ onComplete: finish });
    sub.to('.intro-meta, .intro-skip', { opacity: 0, duration: 0.3, ease: 'none' }, 0);
    sub.fromTo(intro, { clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: clip, duration: 1.05, ease: EIO }, 0);
    sub.to(mark, {
      x: target.left - from.left, y: target.top - from.top, scale: target.width / from.width,
      duration: 1.05, ease: EIO,
    }, 0);
    heroIn(0.55);
  }, 'contract');

  const skip = () => {
    if (tl.progress() < 1 && tl.time() < (tl.labels.contract ?? 0)) {
      tl.seek('contract');
      $$<SVGPathElement>('#intro-mark mask path').forEach((p) => { p.style.opacity = '1'; p.style.strokeDashoffset = '0'; });
      $<SVGUseElement>('#intro-mark .mk-cal')?.removeAttribute('mask');
      gsap.set('#intro-mark .mk-pen, #intro-mark .mk-scale, #intro-mark .mk-band', { opacity: 1, y: 0 });
      setReels(reelNum(count), 100);
    }
  };
  intro.addEventListener('click', skip);
  window.addEventListener('keydown', skip, { once: true });
  window.addEventListener('wheel', skip, { once: true, passive: true });
  window.addEventListener('touchstart', skip, { once: true, passive: true });
}

/* =========================================================================
   Header: solid bar, tone of the scene beneath, active section
   ========================================================================= */
const header = $('.hd')!;
const navLinks = $$<HTMLAnchorElement>('.hd-nav a');
const ind = $('.hd-ind');
const navMap: Record<string, string> = { top: 'top', numbers: 'top', about: 'about', expertise: 'expertise', method: 'method', team: 'team', values: 'team', contact: 'contact', end: 'contact' };
let lastActive = '';
function updateHeader() {
  const y = window.scrollY;
  header.classList.toggle('is-solid', y > 24);
  header.classList.toggle('at-top', y <= 24);
  const probe = header.offsetHeight / 2;
  let tone = 'light';
  for (const el of $$('[data-tone].sc, .statement, .ft, .menu-open .menu')) {
    const r = el.getBoundingClientRect();
    if (r.top <= probe && r.bottom > probe) {
      tone = el.dataset.tone ?? 'dark';
      // a field that has not grown yet still shows paper under the header
      const f = el.classList.contains('field-grow') ? $('.field', el) : null;
      if (f && Number(getComputedStyle(f).getPropertyValue('--open')) < 0.6) tone = 'light';
    }
  }
  if (html.classList.contains('menu-open')) tone = 'dark';
  header.dataset.tone = tone;

  const line = window.innerHeight * 0.4;
  let cur = 'top';
  for (const s of $$('main > section, .ft')) {
    const r = s.getBoundingClientRect();
    if (r.top <= line && r.bottom > line) cur = s.id;
  }
  const id = navMap[cur] ?? '';
  if (id !== lastActive) {
    lastActive = id;
    const a = navLinks.find((l) => l.dataset.go === id);
    navLinks.forEach((l) => l.toggleAttribute('aria-current', l === a));
    if (ind && a) {
      ind.style.opacity = '1';
      ind.style.width = `${a.offsetWidth}px`;
      ind.style.transform = `translateX(${a.offsetLeft}px)`;
    }
  }
}

/* =========================================================================
   Section transition: the shutter (twelve column slats)
   ========================================================================= */
let busy = false;
function go(id: string) {
  const target = id === 'top' ? document.body : document.getElementById(id);
  if (!target || busy) return;
  closeMenu();
  const jump = () => {
    if (lenis) lenis.scrollTo(id === 'top' ? 0 : (target as HTMLElement), { immediate: true, force: true });
    else if (id === 'top') window.scrollTo(0, 0);
    else target.scrollIntoView();
    ScrollTrigger.update();
    updateHeader();
  };
  if (!MOTION) { jump(); if (id === 'team') flashTeam(); return; }
  busy = true;
  const sec = id === 'top' ? $('.hero')! : (target as HTMLElement);
  const sh = $('.shutter')!;
  $('.shutter-i', sh)!.textContent = sec.dataset.i ?? '';
  $('.shutter-t', sh)!.textContent = sec.dataset.name ?? '';
  const slats = $$('i', sh);
  const lab = $$('.shutter-label > *', sh);
  sh.classList.add('is-on');
  const tl = gsap.timeline({ onComplete: () => { sh.classList.remove('is-on'); busy = false; if (id === 'team') flashTeam(); } });
  tl.fromTo(slats, { scaleX: 0, transformOrigin: '100% 50%' }, { scaleX: 1, duration: 0.5, ease: EIO, stagger: 0.028 });
  tl.fromTo(lab, { yPercent: 120 }, { yPercent: 0, duration: 0.55, ease: EO, stagger: 0.05 }, 0.38);
  tl.add(jump, 0.82);
  tl.to(lab, { yPercent: -120, duration: 0.4, ease: 'power3.in', stagger: 0.04 }, 0.95);
  tl.to(slats, { scaleX: 0, transformOrigin: '0% 50%', duration: 0.5, ease: EIO, stagger: 0.028 }, 1.12);
}
function flashTeam() {
  const t = $('.team')!;
  t.classList.remove('flash');
  void t.offsetWidth;
  t.classList.add('flash');
}

/* ---------- mobile menu ---------- */
const burger = $<HTMLButtonElement>('.hd-burger')!;
const menu = $('.menu')!;
function setMenu(open: boolean) {
  html.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
  menu.setAttribute('aria-hidden', String(!open));
  $$('a', menu).forEach((a) => (a.tabIndex = open ? 0 : -1));
  if (open) lenis?.stop(); else lenis?.start();
  updateHeader();
}
function closeMenu() { if (html.classList.contains('menu-open')) setMenu(false); }
burger.addEventListener('click', () => setMenu(!html.classList.contains('menu-open')));
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-go]');
  if (!a) return;
  e.preventDefault();
  go(a.dataset.go!);
  history.replaceState(null, '', a.dataset.go === 'top' ? location.pathname : `#${a.dataset.go}`);
});

/* =========================================================================
   02 · Numbers: field growth, odometer, 6,750-mark matrix, ledger
   ========================================================================= */
function initMatrix() {
  const host = $('.matrix');
  if (!host) return null;
  const cv = $<HTMLCanvasElement>('canvas', host)!;
  const ctx = cv.getContext('2d')!;
  const cols = Number(host.dataset.cols), rows = Number(host.dataset.rows);
  const total = cols * rows;
  let lit = MOTION ? 0 : total;
  let mx = -1e4, my = -1e4;
  let w = 0, h = 0, dpr = 1;
  const resize = () => {
    const r = host.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = r.width; h = r.height;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    draw();
  };
  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    const s = Math.min(cw, ch) * 0.45;
    const edge = Math.max(0, lit - cols);
    const groups: [string, number[]][] = [['rgba(226,190,118,.3)', []], ['#C9A055', []], ['#F0D9A6', []], ['#F4F0E9', []]];
    for (let i = 0; i < total; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const x = w - (c + 0.5) * cw; // reading direction: right to left
      const y = (r + 0.5) * ch;
      let g = i < lit ? (i >= edge && lit < total ? 2 : 1) : 0;
      if (g === 1 && mx > -1e3) {
        const d = Math.hypot(x - mx, y - my);
        if (d < 46) g = d < 22 ? 3 : 2;
      }
      groups[g][1].push(x, y);
    }
    for (const [color, pts] of groups) {
      if (!pts.length) continue;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i], y = pts[i + 1];
        ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath();
      }
      ctx.fill();
    }
  };
  let raf = 0;
  const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; queue(); });
  host.addEventListener('pointerleave', () => { mx = my = -1e4; queue(); });
  new ResizeObserver(resize).observe(host);
  resize();
  return { set(v: number) { lit = Math.round(v); queue(); }, total };
}

function initNumbers() {
  const matrix = initMatrix();
  const big = $('.big-num');
  if (!MOTION || !big) return;
  setReels(reelNum(big), 0);
  $$('.lg-num').forEach((n) => setReels(reelNum(n), 0));
  ScrollTrigger.create({
    trigger: '.numbers', start: 'top 75%', once: true,
    onEnter: () => {
      spin(big, { duration: 2.6, ease: 'power3.out', onUpdate: (v) => matrix?.set(v), onComplete: () => {
        matrix?.set(matrix.total);
        gsap.fromTo('.numbers-big', { scale: 1.015 }, { scale: 1, duration: 0.5, ease: EO, transformOrigin: '100% 100%' });
      } });
    },
  });
  $$('.lg-row').forEach((row, k) => {
    row.addEventListener('reveal', () => spin($('.lg-num', row)!, { duration: 1.5, delay: (k % 9) * 0.07 }));
  });
}

/* ---------- colour fields growing out of the pillar column ---------- */
function initFields() {
  if (!MOTION) return;
  $$('.field-grow').forEach((sec) => {
    const f = $('.field', sec)!;
    gsap.fromTo(f, { '--open': 0 }, {
      '--open': 1, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 55%', scrub: 0.3 },
    });
  });
}

/* =========================================================================
   03 · About: the bus diagram
   ========================================================================= */
function initBoard() {
  const board = $('[data-board]');
  if (!board) return;
  const svg = $<SVGSVGElement>('.board-svg', board)!;
  const words = $$('[data-bw]', board);
  const hub = $('[data-hub]', board)!;
  const NS = 'http://www.w3.org/2000/svg';
  let spine: SVGPathElement, spineLen = 1;
  let stubs: { path: SVGPathElement; len: number; node: SVGRectElement; f: number; word: HTMLElement }[] = [];
  let progress = MOTION ? 0 : 1;

  const build = () => {
    svg.innerHTML = '';
    const b = board.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
    const h = hub.getBoundingClientRect();
    const horizontal = isDesk();
    const mk = (d: string, cls: string) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('class', cls); svg.appendChild(p); return p; };
    let sx0: number, sy0: number, sx1: number, sy1: number;
    if (horizontal) {
      const n = $('.hub-node', hub)!.getBoundingClientRect();
      const y = n.top + n.height / 2 - b.top;
      sx0 = b.width + 2; sy0 = y; sx1 = h.right - b.left; sy1 = y;
    } else {
      const x = b.width - 6;
      sx0 = x; sy0 = 0; sx1 = x; sy1 = h.top - b.top;
    }
    spine = mk(`M${sx0} ${sy0} L${sx1} ${sy1}`, 'b-spine');
    spineLen = Math.hypot(sx1 - sx0, sy1 - sy0);
    stubs = words.map((word) => {
      const r = word.getBoundingClientRect();
      let d: string, f: number, jx: number, jy: number;
      if (horizontal) {
        jx = r.left + r.width * 0.5 - b.left;
        const above = r.bottom - b.top < sy0;
        const ey = above ? r.bottom - b.top : r.top - b.top;
        jy = sy0;
        d = `M${jx} ${sy0} L${jx} ${ey}`;
        f = (sx0 - jx) / spineLen;
      } else {
        jy = r.top + Math.min(r.height / 2, 36) - b.top;
        jx = sx0;
        d = `M${sx0} ${jy} L${r.right - b.left} ${jy}`;
        f = jy / spineLen;
      }
      const path = mk(d, 'b-stub');
      const len = path.getTotalLength();
      const node = document.createElementNS(NS, 'rect');
      node.setAttribute('x', String(jx - 5)); node.setAttribute('y', String(jy - 5));
      node.setAttribute('width', '10'); node.setAttribute('height', '10');
      node.setAttribute('class', 'b-node');
      node.style.transformOrigin = `${jx}px ${jy}px`;
      svg.appendChild(node);
      path.style.strokeDasharray = `${len}`;
      return { path, len, node, f, word };
    });
    spine.style.strokeDasharray = `${spineLen}`;
    apply();
  };
  const apply = () => {
    spine.style.strokeDashoffset = `${spineLen * (1 - progress)}`;
    for (const s of stubs) {
      const on = progress >= s.f - 0.002;
      s.path.style.strokeDashoffset = on ? '0' : `${s.len}`;
      s.node.classList.toggle('on', on);
      s.word.classList.toggle('on', on);
    }
    hub.classList.toggle('on', progress >= 0.985);
  };
  build();
  new ResizeObserver(() => build()).observe(board);
  if (MOTION) {
    ScrollTrigger.create({
      trigger: board, start: 'top 78%', end: () => (isDesk() ? 'bottom 72%' : 'bottom 85%'), scrub: true,
      onUpdate: (st) => { progress = st.progress; apply(); },
    });
  }
}

/* =========================================================================
   05 · Method: the procedural rail
   ========================================================================= */
function initRail() {
  const rail = $('[data-rail]');
  if (!rail || !MOTION) return;
  const steps = $$('[data-st]', rail);
  const track = $('.rail-track', rail)!;
  const mstep = $('[data-mstep]');
  const fr = () => {
    const r = track.getBoundingClientRect();
    return steps.map((s) => {
      const n = $('.st-node', s)!.getBoundingClientRect();
      return isDesk() ? (r.right - (n.left + n.width / 2)) / r.width : (n.top + n.height / 2 - r.top) / r.height;
    });
  };
  let fracs = fr();
  ScrollTrigger.addEventListener('refreshInit', () => { fracs = fr(); });
  ScrollTrigger.create({
    trigger: rail, start: 'top 82%', end: () => (isDesk() ? 'top 30%' : 'bottom 60%'), scrub: true,
    onUpdate: (st) => {
      const p = st.progress;
      rail.style.setProperty('--p', String(p));
      let cur = -1;
      steps.forEach((s, i) => { const on = p >= fracs[i] - 0.004; s.classList.toggle('on', on); if (on) cur = i; });
      steps.forEach((s, i) => s.classList.toggle('cur', i === cur && p < 0.999));
      mstep?.style.setProperty('--d', String(Math.max(1, cur + 1)));
    },
  });
  rail.style.setProperty('--p', '0');
}

/* =========================================================================
   07 · Values: the selector
   ========================================================================= */
function initValues() {
  const sec = $('.values');
  if (!sec || !MOTION) return;
  const items = $$('[data-vl]', sec);
  const stage = $$('[data-vs]', sec);
  const unit = $('[data-vunit]', sec)!;
  let cur = -1;
  const set = (i: number) => {
    if (i === cur) return;
    stage.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('off', k < i); });
    items.forEach((it, k) => it.classList.toggle('on', k === i));
    unit.style.setProperty('--d', String(i + 1));
    cur = i;
  };
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1180px)', () => {
    set(0);
    const st = ScrollTrigger.create({
      trigger: sec, start: 'top top', end: 'bottom bottom',
      onUpdate: (s) => {
        const x = s.progress * items.length;
        const i = Math.min(items.length - 1, Math.floor(x));
        set(i);
        items.forEach((it, k) => it.style.setProperty('--vp', String(k < i ? 1 : k === i ? Math.min(1, x - i) : 0)));
      },
    });
    const clicks = items.map((it, k) => {
      const btn = $('button', it)!;
      const h = () => {
        const top = sec.getBoundingClientRect().top + window.scrollY;
        const span = sec.offsetHeight - window.innerHeight;
        const y = top + span * ((k + 0.5) / items.length);
        lenis ? lenis.scrollTo(y, { duration: 0.9 }) : window.scrollTo(0, y);
      };
      btn.addEventListener('click', h);
      return () => btn.removeEventListener('click', h);
    });
    return () => { st.kill(); clicks.forEach((c) => c()); };
  });
}

/* =========================================================================
   Outro: the signature
   ========================================================================= */
function initOutro() {
  const svg = $<SVGSVGElement>('#outro-mark');
  if (!svg || !MOTION) return;
  prepWrite(svg);
  const words = $$('.ft-tag > *');
  gsap.set(words, { yPercent: 120, opacity: 0 });
  ScrollTrigger.create({
    trigger: '.ft', start: 'top 80%', once: true,
    onEnter: () => {
      const tl = writeTl(svg, 2.6);
      tl.to(words, { yPercent: 0, opacity: 1, duration: 0.8, ease: EO, stagger: 0.08 }, '-=0.6');
    },
  });
}

/* ---------- relief parallax ---------- */
function initRelief() {
  if (!MOTION) return;
  gsap.fromTo('.relief-mark', { yPercent: 4 }, { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.expertise', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.ft-mark', { yPercent: 6 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.ft', start: 'top bottom', end: 'bottom bottom', scrub: true } });
}

/* =========================================================================
   Boot
   ========================================================================= */
function boot() {
  initReveals();
  initNumbers();
  initFields();
  initBoard();
  initRail();
  initValues();
  initOutro();
  initRelief();
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
  let rt = 0;
  window.addEventListener('resize', () => {
    setVw();
    clearTimeout(rt);
    rt = window.setTimeout(() => { ScrollTrigger.refresh(); lastActive = ''; updateHeader(); }, 150);
  });
  html.classList.add('ready');
  if (!MOTION) return;
  if (html.classList.contains('play-intro')) runIntro();
  else heroIn(0.05);
  // jump to a hash on load without the shutter
  if (location.hash.length > 1) {
    const t = document.getElementById(location.hash.slice(1));
    if (t) requestAnimationFrame(() => lenis?.scrollTo(t, { immediate: true, force: true }));
  }
}

document.fonts.ready.then(() => { setVw(); boot(); ScrollTrigger.refresh(); });
window.addEventListener('load', () => ScrollTrigger.refresh());
