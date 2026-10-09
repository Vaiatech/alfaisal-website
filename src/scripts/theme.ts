import { root, reduceMotion } from './env';

const COLORS = { light: '#f8f5ef', dark: '#13100e' } as const;

export function initTheme() {
  const meta = document.querySelector<HTMLMetaElement>('[data-theme-color]');
  const current = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');

  const apply = (t: 'light' | 'dark') => {
    root.dataset.theme = t;
    meta?.setAttribute('content', COLORS[t]);
    try { localStorage.setItem('alf-theme', t); } catch {}
    document.querySelectorAll('[data-theme-toggle]').forEach((b) =>
      b.setAttribute('aria-pressed', String(t === 'dark')),
    );
  };
  apply(current());

  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      if (!doc.startViewTransition || reduceMotion) return apply(next);
      // Ink spreading from the button: circular reveal of the new theme.
      const r = btn.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.style.setProperty('--vt-x', `${x}px`);
      root.style.setProperty('--vt-y', `${y}px`);
      root.style.setProperty('--vt-r', `${radius}px`);
      root.classList.add('theme-switching');
      const vt = doc.startViewTransition(() => apply(next)) as { finished?: Promise<void> };
      vt.finished?.finally(() => root.classList.remove('theme-switching'));
    });
  });
}
