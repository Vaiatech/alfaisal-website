import { ScrollTrigger, $, $$ } from './env';
import { getLattice } from './lattice';

/* Practice areas: the panel under the pointer (or keyboard focus) opens. */
export function initPanels() {
  const host = $('[data-panels]');
  if (!host) return;
  const panels = $$('[data-panel]', host);
  const wide = window.matchMedia('(min-width: 1025px)');
  let open = panels.find((p) => p.classList.contains('is-open')) ?? panels[0];

  const lattice = (p: Element) => getLattice(p.querySelector('canvas[data-lattice]'));

  const setOpen = (p: HTMLElement) => {
    if (p === open || !wide.matches) return;
    open?.classList.remove('is-open');
    lattice(open)?.reset();
    open = p;
    p.classList.add('is-open');
    // let the panel widen before the lattice measures and grows
    setTimeout(() => {
      const l = lattice(p);
      if (l) {
        l.measure();
        l.play(1800);
      }
    }, 380);
  };

  panels.forEach((p) => {
    p.addEventListener('pointerenter', () => setOpen(p));
    p.addEventListener('focus', () => setOpen(p));
  });

  ScrollTrigger.create({
    trigger: host,
    start: 'top 75%',
    once: true,
    onEnter: () => {
      const l = lattice(open);
      if (l && wide.matches) {
        l.measure();
        l.play(2000);
      }
    },
  });
}
