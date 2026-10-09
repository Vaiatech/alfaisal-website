import gsap from 'gsap';

export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll(s)) as T[];
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The house easings — one motion vocabulary for the whole site. */
export const EASE = {
  out: 'expo.out',
  io: 'power3.inOut',
  soft: 'power2.out',
};

/**
 * Split Arabic text into WORDS only (never letters — that breaks joining).
 * Each word gets a masking wrapper `.w` and an inner `.wi` that moves.
 */
export function splitWords(el: HTMLElement): HTMLElement[] {
  if (el.dataset.splitDone) return $$('.wi', el);
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const text = n.textContent || '';
        if (!text.trim()) return;
        const frag = document.createDocumentFragment();
        text.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
          } else {
            const w = document.createElement('span');
            w.className = 'w';
            const i = document.createElement('span');
            i.className = 'wi';
            i.textContent = part;
            w.appendChild(i);
            frag.appendChild(w);
          }
        });
        n.parentNode!.replaceChild(frag, n);
      } else if (n.nodeType === 1 && !(n as HTMLElement).classList.contains('w')) {
        walk(n);
      }
    });
  };
  walk(el);
  el.dataset.splitDone = '1';
  return $$('.wi', el);
}

/** Heading entrance: words rise out of their masks. */
export function riseWords(words: HTMLElement[], opts: gsap.TweenVars = {}) {
  return gsap.fromTo(
    words,
    { yPercent: 118 },
    { yPercent: 0, duration: 1.25, ease: EASE.out, stagger: 0.065, ...opts },
  );
}

/** Paragraph entrance: the house wipe — light passes right → left. */
export function wipeIn(el: HTMLElement, opts: gsap.TweenVars = {}) {
  el.classList.add('wiping');
  return gsap.fromTo(
    el,
    { '--wp': 0 },
    {
      '--wp': 1,
      duration: 1.6,
      ease: EASE.soft,
      ...opts,
      onComplete: () => el.classList.remove('wiping'),
    },
  );
}
