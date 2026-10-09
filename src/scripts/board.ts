import { gsap, ScrollTrigger, reduceMotion, $, $$, clamp } from './env';

/*
  "ليست كل الملفات قضية" — the file's details start scattered and tangled, then,
  as the reader scrolls, they are read, connected and set in order on one line.
*/

// Scattered layout: [x, y] as fractions of the free area, and a tilt in degrees.
const SCATTER: [number, number, number][] = [
  [0.08, 0.06, -9],
  [0.7, 0.02, 7],
  [0.36, 0.3, 13],
  [0.86, 0.42, -11],
  [0.02, 0.6, 6],
  [0.6, 0.74, -6],
  [0.24, 0.94, 10],
];
// Order in which the tangle connects them — deliberately crossing.
const TANGLE = [0, 3, 1, 5, 2, 6, 4];

const easeIO = gsap.parseEase('power3.inOut');

export function initBoard() {
  const board = $('[data-board]');
  if (!board) return;
  const chips = $$('[data-chip]', board);
  const tangle = $<SVGPathElement>('.board__tangle', board)!;
  const spine = $<SVGPathElement>('.board__spine', board)!;
  const svg = $<SVGSVGElement>('.board__lines', board)!;

  let W = 0;
  let H = 0;
  let sizes: { w: number; h: number }[] = [];
  let progress = reduceMotion ? 1 : 0;

  const measure = () => {
    W = board.clientWidth;
    H = board.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    sizes = chips.map((c) => ({ w: c.offsetWidth, h: c.offsetHeight }));
  };

  const pos = (i: number, p: number) => {
    const { w, h } = sizes[i];
    const [fx, fy, rot] = SCATTER[i];
    const pad = 14;
    const sx = pad + fx * (W - w - pad * 2);
    const sy = pad + fy * (H - h - pad * 2);
    // Ordered: centred on one vertical line, evenly spaced.
    const step = (H - 2 * pad - h) / (chips.length - 1);
    const ox = W / 2 - w / 2;
    const oy = pad + i * step;
    // Stagger: each chip begins a touch after the one before it.
    const local = easeIO(clamp((p - i * 0.045) / (1 - 0.045 * (chips.length - 1))));
    return {
      x: sx + (ox - sx) * local,
      y: sy + (oy - sy) * local,
      r: rot * (1 - local),
      cx: sx + (ox - sx) * local + w / 2,
      cy: sy + (oy - sy) * local + h / 2,
    };
  };

  const render = () => {
    const ps = chips.map((_, i) => pos(i, progress));
    chips.forEach((c, i) => {
      c.style.transform = `translate(${ps[i].x}px, ${ps[i].y}px) rotate(${ps[i].r}deg)`;
    });
    tangle.setAttribute('d', 'M' + TANGLE.map((i) => `${ps[i].cx} ${ps[i].cy}`).join(' L'));
    tangle.style.opacity = String(0.6 * (1 - clamp(progress * 1.4)));
    const spineD = `M${W / 2} ${ps[0].cy} V${ps[chips.length - 1].cy}`;
    spine.setAttribute('d', spineD);
    const reveal = clamp((progress - 0.55) / 0.45);
    const len = Math.max(1, ps[chips.length - 1].cy - ps[0].cy);
    spine.style.strokeDasharray = `${len} ${len}`;
    spine.style.strokeDashoffset = String(len * (1 - reveal));
    board.classList.toggle('is-ordered', progress > 0.985);
  };

  measure();
  render();
  if (reduceMotion) return;

  ScrollTrigger.create({
    trigger: board,
    start: 'top 78%',
    end: 'bottom 52%',
    scrub: 0.9,
    onUpdate: (self) => {
      progress = self.progress;
      render();
    },
    onRefresh: () => {
      measure();
      render();
    },
  });
}
