import { gsap, ScrollTrigger, root, waitFonts } from './env';
import { initTheme } from './theme';
import { initHeader, initLinks } from './nav';
import { initReveals, heroIn } from './reveal';
import { initOdometers } from './odometer';
import { initThread } from './thread';
import { initBoard } from './board';
import { initValues } from './values';
import { initFooter } from './footer';
import { runIntro } from './intro';

declare global {
  interface Window { __alfBooted?: boolean }
}
window.__alfBooted = true;

async function boot() {
  initTheme();
  const header = initHeader();
  initLinks(header?.closeMenu);

  // Lines are split by measured width, so wait for the real fonts first.
  await waitFonts();

  initOdometers();
  initReveals();
  initBoard();
  initValues();
  const thread = initThread();
  initFooter(thread);

  if (root.classList.contains('has-intro')) {
    await runIntro();
  } else {
    gsap.fromTo('[data-hero-art]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.8, ease: 'expo.out' });
    heroIn(0.1);
  }
  ScrollTrigger.refresh();
}

boot();
