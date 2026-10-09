import { gsap, ScrollTrigger, reduceMotion, $, $$ } from './env';

/* Values: one at a time on wide screens, advancing on a quiet gold timer. */

const DWELL = 5.2;

export function initValues() {
  const root = $('[data-values]');
  if (!root) return;
  const items = $$('[data-value]', root);
  const buttons = items.map((li) => li.querySelector<HTMLButtonElement>('.value__btn')!);
  const timers = items.map((li) => li.querySelector<HTMLElement>('.value__timer')!);
  const desc = $('[data-values-desc]', root)!;
  const name = $('[data-values-name]', root)!;
  const index = $('[data-values-index]', root)!;
  const wide = window.matchMedia('(min-width: 901px)');

  let current = 0;
  let timer: gsap.core.Tween | null = null;
  let inView = false;
  let hovering = false;

  const show = (i: number, animate = true) => {
    current = i;
    buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    const text = items[i].querySelector('.value__desc')!.textContent ?? '';
    const title = items[i].querySelector('.value__name')!.textContent ?? '';
    const swap = () => {
      desc.textContent = text;
      name.textContent = title;
      index.textContent = String(i + 1).padStart(2, '0');
    };
    if (!animate || reduceMotion) return swap();
    gsap
      .timeline()
      .to([desc, name], { opacity: 0, y: -10, duration: 0.3, ease: 'power2.in' })
      .add(swap)
      .fromTo([desc, name], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06 });
  };

  const run = () => {
    timer?.kill();
    timers.forEach((t) => gsap.set(t, { scaleX: 0 }));
    if (reduceMotion || !wide.matches || !inView || hovering) return;
    timer = gsap.fromTo(
      timers[current],
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: DWELL,
        ease: 'none',
        onComplete: () => {
          show((current + 1) % items.length);
          run();
        },
      },
    );
  };

  buttons.forEach((b, i) =>
    b.addEventListener('click', () => {
      if (i !== current) show(i);
      run();
    }),
  );
  root.addEventListener('pointerenter', () => {
    hovering = true;
    timer?.pause();
  });
  root.addEventListener('pointerleave', () => {
    hovering = false;
    if (timer) timer.resume();
    else run();
  });
  root.addEventListener('focusin', () => timer?.pause());
  root.addEventListener('focusout', () => !hovering && timer?.resume());

  ScrollTrigger.create({
    trigger: root,
    start: 'top 70%',
    end: 'bottom 20%',
    onToggle: (self) => {
      inView = self.isActive;
      if (inView) run();
      else timer?.pause();
    },
  });
  wide.addEventListener('change', run);
  show(0, false);
}
