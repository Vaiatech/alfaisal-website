import { gsap, ScrollTrigger, reduceMotion, $, $$, clamp, scrollY } from './env';

/*
  The gold thread.
  It leaves the pen nib in the hero, runs down the rail on the right, passes every
  section's node (and the five method steps), and ends where the footer logo's gold
  rule begins — so the page is "written" by the same pen as the logo.

  Drawing is driven by a virtual axis: each segment owns a stretch of scroll. Flat
  segments (the method steps) get their own stretch, and the swoop after them pays
  that time back so the pen-head keeps pace with the reader.
*/

type Pt = { x: number; y: number };
type Seg = {
  ink: SVGPathElement;
  len: number;
  v0: number;
  v1: number;
  node: Element | null;
  done: boolean;
};

const HEAD = 0.64; // pen-head sits at 64% of the viewport height

export function initThread() {
  const svg = $<SVGSVGElement>('[data-thread]');
  const page = $('[data-page]');
  const startDesktop = $('[data-thread-start]');
  const startMobile = $('[data-thread-start-m]');
  const narrow = window.matchMedia('(max-width: 900px)');
  const start = startDesktop;
  const end = $('[data-thread-end]');
  if (!svg || !page || !start || !end) return null;

  const track = svg.querySelector('.thread__track')!;
  const inkG = svg.querySelector('.thread__ink')!;
  const tip = svg.querySelector<SVGRectElement>('.thread__tip')!;
  const listeners = new Set<() => void>();
  let segs: Seg[] = [];
  let finished = false;
  let vh = innerHeight;

  const point = (el: Element): Pt => {
    const r = el.getBoundingClientRect();
    const p = page.getBoundingClientRect();
    return { x: r.left + r.width / 2 - p.left, y: r.top + r.height / 2 - p.top };
  };

  const pathFor = (a: Pt, b: Pt) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) < 1.5) return `M${a.x} ${a.y}V${b.y}`;
    if (Math.abs(dy) < 3) return `M${a.x} ${a.y}H${b.x}`;
    const k = Math.min(Math.abs(dy) * 0.55, 460);
    return `M${a.x} ${a.y}C${a.x} ${a.y + k} ${b.x} ${b.y - k} ${b.x} ${b.y}`;
  };

  const build = () => {
    vh = innerHeight;
    const w = page.offsetWidth;
    const h = page.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    track.replaceChildren();
    inkG.replaceChildren();

    const nodes = $$('[data-thread-node]').filter((n) => (n as HTMLElement).offsetParent !== null);
    // On phones the mark sits above the copy, so the thread begins under the hero instead.
    const from = narrow.matches && startMobile ? startMobile : start;
    const anchors: { pt: Pt; node: Element | null }[] = [
      { pt: point(from), node: null },
      ...nodes.map((n) => ({ pt: point(n), node: n })),
      { pt: point(end), node: null },
    ];

    segs = [];
    // a short drop of ink leaves the nib on load; the rest follows the reader
    let v = anchors[0].pt.y - vh * HEAD - 70;
    let debt = 0;
    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1].pt;
      const b = anchors[i].pt;
      const d = pathFor(a, b);
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      t.setAttribute('d', d);
      track.appendChild(t);
      const ink = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      ink.setAttribute('d', d);
      inkG.appendChild(ink);
      const len = ink.getTotalLength();
      ink.style.strokeDasharray = `${len} ${len + 2}`;
      ink.style.strokeDashoffset = `${len}`;

      const dy = b.y - a.y;
      let span: number;
      if (Math.abs(dy) < 3) {
        span = vh * 0.13;
        debt += span;
      } else {
        const pay = Math.min(debt, Math.max(0, dy) * 0.6);
        debt -= pay;
        span = Math.max(dy - pay, vh * 0.06);
      }
      const v0 = v;
      const v1 = i === 1 ? b.y : v0 + span;
      segs.push({ ink, len, v0, v1, node: anchors[i].node, done: false });
      v = v1;
    }
    finished = false;
    update(true);
  };

  // Near the end of the page the head speeds up so the line always reaches the footer.
  const headV = () => {
    const y = scrollY();
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    let head = y + vh * HEAD;
    const rampStart = max - vh * 0.7;
    if (y > rampStart) head += ((y - rampStart) / (vh * 0.7)) * (vh * (1 - HEAD) + 80);
    return head;
  };

  let lastHV = Number.NaN;
  const update = (force = false) => {
    if (!segs.length) return;
    const hv = reduceMotion ? Number.POSITIVE_INFINITY : headV();
    if (!force && hv === lastHV) return;
    lastHV = hv;
    let tipAt: { seg: Seg; p: number } | null = null;
    for (const s of segs) {
      const p = clamp((hv - s.v0) / (s.v1 - s.v0));
      s.ink.style.strokeDashoffset = `${s.len * (1 - p)}`;
      const done = p >= 0.999;
      if (done !== s.done) {
        s.done = done;
        if (s.node) {
          s.node.classList.toggle('is-on', done);
          s.node.closest('[data-step]')?.classList.toggle('is-on', done);
        }
      }
      if (p > 0 && p < 0.999) tipAt = { seg: s, p };
    }
    if (tipAt) {
      const pt = tipAt.seg.ink.getPointAtLength(tipAt.seg.len * tipAt.p);
      tip.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(45)`);
      tip.style.opacity = '1';
    } else {
      tip.style.opacity = '0';
    }
    const last = segs[segs.length - 1];
    if (last.done && !finished) {
      finished = true;
      listeners.forEach((fn) => fn());
    }
  };

  build();
  gsap.ticker.add(() => update());

  let t = 0;
  const rebuild = () => {
    clearTimeout(t);
    t = window.setTimeout(build, 120);
  };
  window.addEventListener('resize', rebuild);
  ScrollTrigger.addEventListener('refresh', rebuild);
  new ResizeObserver(rebuild).observe(page);

  return {
    rebuild: build,
    onEnd: (fn: () => void) => {
      listeners.add(fn);
      if (finished) fn();
    },
  };
}
