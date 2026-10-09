import { gsap, ScrollTrigger, reduceMotion, $ } from './env';

/* Outro: when the thread arrives, the footer logo is signed — rule, name, tagline. */

export function initFooter(thread: { onEnd: (fn: () => void) => void } | null) {
  const logo = $('.ftr__logo');
  if (!logo || reduceMotion) return;
  const rule = logo.querySelector('.lg-rule-g');
  const word = logo.querySelector('.lg-word-g');
  const tag = logo.querySelector('.lg-tag-g');
  const markParts = logo.querySelectorAll('.lg-pen-g, .lg-callig-g, .lg-scale-g');

  gsap.set(rule, { scaleX: 0, svgOrigin: '1027 1081' });
  gsap.set([word, tag], { opacity: 0, y: 24 });
  gsap.set(markParts, { opacity: 0.25 });

  let played = false;
  const play = () => {
    if (played) return;
    played = true;
    gsap
      .timeline()
      .to(markParts, { opacity: 1, duration: 1.2, ease: 'power2.out' }, 0)
      .to(rule, { scaleX: 1, duration: 1.3, ease: 'expo.inOut' }, 0.05)
      .to(word, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, 0.45)
      .to(tag, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, 0.6);
  };
  thread?.onEnd(play);
  // Fallback for very tall screens or when the thread is unavailable.
  ScrollTrigger.create({ trigger: logo, start: 'bottom 98%', once: true, onEnter: () => gsap.delayedCall(0.6, play) });
}
