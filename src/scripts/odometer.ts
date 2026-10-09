import { gsap, ScrollTrigger, reduceMotion, $$ } from './env';

/*
  Mechanical counter. Each digit is a column holding two full 0–9 cycles plus the
  target; columns roll into place right-to-left with a slight cascade, like the
  numbering wheel of a court stamp.
*/
const CYCLES = 2;

function build(el: HTMLElement) {
  const text = Number(el.dataset.odo).toLocaleString('en-US');
  el.textContent = '';
  el.classList.add('odo--live');
  const strips: { strip: HTMLElement; target: number; total: number }[] = [];
  for (const ch of text) {
    if (!/\d/.test(ch)) {
      const s = document.createElement('span');
      s.className = 'odo__sep';
      s.textContent = ch;
      el.appendChild(s);
      continue;
    }
    const d = Number(ch);
    const col = document.createElement('span');
    col.className = 'odo__col';
    col.dataset.d = ch;
    const strip = document.createElement('span');
    strip.className = 'odo__strip';
    const total = CYCLES * 10 + d + 1;
    let html = '';
    for (let i = 0; i < total; i++) html += `<span>${i % 10}</span>`;
    strip.innerHTML = html;
    col.appendChild(strip);
    el.appendChild(col);
    strips.push({ strip, target: CYCLES * 10 + d, total });
  }
  return strips;
}

function roll(strips: ReturnType<typeof build>, delay = 0, duration = 2.4) {
  const n = strips.length;
  strips.forEach(({ strip, target, total }, i) => {
    // Lower places (to the right) travel a full extra turn.
    const fromEnd = n - 1 - i;
    gsap.to(strip, {
      yPercent: (-100 * target) / total,
      duration: duration + fromEnd * 0.14,
      delay: delay + i * 0.05,
      ease: 'power4.out',
    });
  });
}

export function initOdometers() {
  const all = $$('.odo[data-odo]');
  if (reduceMotion) return;

  all.forEach((el) => {
    const strips = build(el);
    const item = el.closest('[data-ledger-item]');
    if (item) {
      item.addEventListener('ledger:enter', (e) => roll(strips, (e as CustomEvent).detail.delay + 0.1, 2.1), {
        once: true,
      });
    } else {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => roll(strips, 0.15, 2.8),
      });
    }
  });
}
