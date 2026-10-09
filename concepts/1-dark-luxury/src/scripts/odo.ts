import gsap from 'gsap';

/**
 * Gold odometer. Each digit is a reel in a fixed-width (tabular) cell.
 * Reels spin and settle left-to-right with a small mechanical over-travel,
 * then a band of light sweeps across the settled figures.
 */
export type Odo = { el: HTMLElement; play: (delay?: number) => gsap.core.Timeline; sweep: () => void; done: boolean };

export function buildOdo(el: HTMLElement): Odo {
  const value = Number(el.dataset.odo);
  const text = value.toLocaleString('en-US');
  el.textContent = '';
  const sr = document.createElement('span');
  sr.className = 'sr';
  sr.textContent = text;
  el.appendChild(sr);

  const reels: { strip: HTMLElement; target: number; count: number }[] = [];
  let di = 0;
  [...text].forEach((ch, k) => {
    if (/\d/.test(ch)) {
      const d = Number(ch);
      const loops = di + 1; // the rightmost reels travel furthest, like a real counter
      const target = loops * 10 + d;
      const cell = document.createElement('span');
      cell.className = 'cell';
      cell.setAttribute('aria-hidden', 'true');
      const strip = document.createElement('span');
      strip.className = 'strip';
      strip.style.setProperty('--k', String(k));
      let html = '';
      for (let n = 0; n <= target + 1; n++) html += `<span style="--k:${k}">${n % 10}</span>`;
      strip.innerHTML = html;
      cell.appendChild(strip);
      el.appendChild(cell);
      reels.push({ strip, target, count: target + 2 });
      di++;
    } else {
      const s = document.createElement('span');
      s.className = 'sep';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--k', String(k));
      s.textContent = ch;
      el.appendChild(s);
    }
  });

  const odo: Odo = {
    el,
    done: false,
    sweep() {
      gsap.fromTo(el, { '--sw': '130%' }, { '--sw': '-260%', duration: 1.9, ease: 'power2.inOut' });
    },
    play(delay = 0) {
      const tl = gsap.timeline({ delay, onComplete: () => { odo.done = true; odo.sweep(); } });
      reels.forEach((r, i) => {
        const step = 100 / r.count;
        const end = -r.target * step;
        const over = end - step * 0.16; // over-travel by a hair, then the click back
        gsap.set(r.strip, { yPercent: 0 });
        tl.to(r.strip, { yPercent: over, duration: 1.5 + i * 0.22, ease: 'expo.inOut' }, i * 0.08)
          .to(r.strip, { yPercent: end, duration: 0.42, ease: 'back.out(2.4)' }, '>-0.02');
      });
      return tl;
    },
  };
  // settled state by default (no motion until played)
  reels.forEach((r) => gsap.set(r.strip, { yPercent: (-r.target * 100) / r.count }));
  return odo;
}

export function resetOdo(el: HTMLElement) {
  el.querySelectorAll<HTMLElement>('.strip').forEach((s) => gsap.set(s, { yPercent: 0 }));
}
