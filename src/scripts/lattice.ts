import { reduceMotion, root, $$, clamp } from './env';

/*
  The Al-Faisal lattice.
  Built only from the calligrapher's dot (نقطة) — the rhombus that punctuates the
  logo. A diamond trellis of hairlines, a dot at every crossing, and a smaller
  rhombus woven into every other cell, like a mashrabiya seen in raking light.
  It is drawn outward from an origin (the logo, a number, a title), fades with
  distance, and catches the light under the pointer.
*/

type Opts = {
  cell: number; // diagonal of one lattice cell, px
  reach: number; // fade radius as a fraction of the canvas diagonal
  strength: number; // overall alpha multiplier
  originSel?: string;
  ox: number;
  oy: number;
  manual: boolean;
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export class Lattice {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  o: Opts;
  w = 0;
  h = 0;
  origin = { x: 0, y: 0 };
  radius = 0; // current drawing radius
  maxR = 1;
  pointer: { x: number; y: number } | null = null;
  raf = 0;
  played = false;
  color = '173,131,45';
  narrowDim = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    const d = canvas.dataset;
    const [ox, oy] = (d.origin ?? '0.5,0.5').split(',').map(Number);
    this.o = {
      cell: Number(d.cell ?? 64),
      reach: Number(d.reach ?? 0.55),
      strength: Number(d.strength ?? 1),
      originSel: d.originEl,
      ox: isNaN(ox) ? 0.5 : ox,
      oy: isNaN(oy) ? 0.5 : oy,
      manual: d.trigger === 'manual',
    };
    this.measure();
    if (reduceMotion) this.radius = Number.POSITIVE_INFINITY;
  }

  readColor() {
    const c = getComputedStyle(this.canvas).getPropertyValue('--gold').trim() || '#ad832d';
    const m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      const n = parseInt(m[1], 16);
      this.color = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    }
  }

  measure() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const el = this.o.originSel ? document.querySelector(this.o.originSel) : null;
    if (el) {
      const e = el.getBoundingClientRect();
      this.origin = { x: e.left + e.width / 2 - r.left, y: e.top + e.height / 2 - r.top };
    } else {
      this.origin = { x: this.o.ox * this.w, y: this.o.oy * this.h };
    }
    // on narrow screens the lattice sits behind running text: keep it closer and fainter
    const narrow = window.innerWidth < 700;
    this.maxR = Math.hypot(this.w, this.h) * this.o.reach * (narrow ? 0.6 : 1);
    this.narrowDim = narrow ? 0.6 : 1;
    this.readColor();
  }

  draw() {
    const { ctx, w, h, origin, maxR } = this;
    const s = this.o.cell;
    const half = s / 2;
    const band = s * 2.2;
    const R = this.radius;
    const k = this.o.strength * this.narrowDim * (root.dataset.theme === 'dark' ? 0.85 : 1);
    const p = this.pointer;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 0.7;

    const fade = (x: number, y: number) => {
      const d = Math.hypot(x - origin.x, y - origin.y);
      let a = 1 - smooth(maxR * 0.35, maxR, d);
      if (p) {
        const dp = Math.hypot(x - p.x, y - p.y);
        if (dp < 180) a = Math.min(1, a + (1 - dp / 180) ** 2 * 0.9);
      }
      const grow = R === Number.POSITIVE_INFINITY ? 1 : clamp((R - d) / band);
      return { a, grow, d };
    };

    const cols = Math.ceil(w / s) + 2;
    const rows = Math.ceil(h / half) + 2;
    for (let j = -1; j < rows; j++) {
      for (let i = -1; i < cols; i++) {
        const x = i * s + (j & 1 ? half : 0);
        const y = j * half;
        const f = fade(x, y);
        if (f.a <= 0.01 || f.grow <= 0) continue;

        // two edges down-left and down-right, growing away from the origin
        for (const dx of [-half, half]) {
          const x2 = x + dx;
          const y2 = y + half;
          const g = fade((x + x2) / 2, (y + y2) / 2);
          if (g.grow <= 0 || g.a <= 0.01) continue;
          const towardsFirst = Math.hypot(x - origin.x, y - origin.y) <= Math.hypot(x2 - origin.x, y2 - origin.y);
          const ax = towardsFirst ? x : x2;
          const ay = towardsFirst ? y : y2;
          const bx = towardsFirst ? x2 : x;
          const by = towardsFirst ? y2 : y;
          const t = easeOut(g.grow);
          ctx.strokeStyle = `rgba(${this.color},${0.2 * g.a * k})`;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + (bx - ax) * t, ay + (by - ay) * t);
          ctx.stroke();
        }

        // the dot at every crossing
        const ds = 1.9 * easeOut(f.grow);
        if (ds > 0.2) {
          ctx.fillStyle = `rgba(${this.color},${0.6 * f.a * k})`;
          ctx.beginPath();
          ctx.moveTo(x, y - ds);
          ctx.lineTo(x + ds, y);
          ctx.lineTo(x, y + ds);
          ctx.lineTo(x - ds, y);
          ctx.closePath();
          ctx.fill();
        }

        // a smaller rhombus woven into every other cell
        if (((i + j) & 1) === 0) {
          const cx = x;
          const cy = y + half;
          const c = fade(cx, cy);
          const r = half * 0.36 * easeOut(c.grow);
          if (r > 0.5 && c.a > 0.01) {
            ctx.strokeStyle = `rgba(${this.color},${0.26 * c.a * k})`;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r, cy);
            ctx.lineTo(cx, cy + r);
            ctx.lineTo(cx - r, cy);
            ctx.closePath();
            ctx.stroke();
          }
        }
      }
    }
  }

  play(duration = 2400) {
    if (reduceMotion) {
      this.radius = Number.POSITIVE_INFINITY;
      this.draw();
      return;
    }
    cancelAnimationFrame(this.raf);
    const end = this.maxR + this.o.cell * 2.4;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = clamp((now - t0) / duration);
      this.radius = end * easeOut(t);
      this.draw();
      if (t < 1) this.raf = requestAnimationFrame(tick);
      else this.radius = Number.POSITIVE_INFINITY;
    };
    this.played = true;
    this.raf = requestAnimationFrame(tick);
  }

  reset() {
    cancelAnimationFrame(this.raf);
    this.radius = 0;
    this.draw();
  }

  redraw = () => {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.draw());
  };
}

const instances = new Map<HTMLCanvasElement, Lattice>();
export const getLattice = (c: Element | null) => (c ? instances.get(c as HTMLCanvasElement) : undefined);

export function initLattices() {
  const canvases = $$<HTMLCanvasElement>('canvas[data-lattice]');
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        const l = instances.get(e.target as HTMLCanvasElement);
        if (l && e.isIntersecting && !l.played && !l.o.manual) l.play();
      }),
    { threshold: 0.15 },
  );

  canvases.forEach((c) => {
    const l = new Lattice(c);
    instances.set(c, l);
    l.draw();
    io.observe(c);

    // light catching the gold under the pointer (fine pointers only)
    const host = c.parentElement!;
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      host.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        l.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
        if (l.radius === Number.POSITIVE_INFINITY) l.redraw();
      });
      host.addEventListener('pointerleave', () => {
        l.pointer = null;
        if (l.radius === Number.POSITIVE_INFINITY) l.redraw();
      });
    }
  });

  let t = 0;
  const remeasure = () => {
    clearTimeout(t);
    t = window.setTimeout(() => instances.forEach((l) => (l.measure(), l.draw())), 150);
  };
  window.addEventListener('resize', remeasure);
  new MutationObserver(() => instances.forEach((l) => (l.readColor(), l.draw()))).observe(root, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return { remeasure };
}
