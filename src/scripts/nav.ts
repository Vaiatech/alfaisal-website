import { gsap, ScrollTrigger, root, reduceMotion, lenis, $, $$, scrollY, EASE } from './env';

/* ── header: scrolled state, scroll-spy indicator, mobile menu ───────── */

export function initHeader() {
  const header = $('[data-header]');
  if (!header) return;

  let scrolled = false;
  const onScroll = () => {
    const s = scrollY() > 40;
    if (s !== scrolled) {
      scrolled = s;
      root.classList.toggle('is-scrolled', s);
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Scroll-spy: a single gold hairline slides under the active link.
  const indicator = $('.hdr__indicator', header);
  const links = $$<HTMLAnchorElement>('.hdr__link', header);
  const list = $('.hdr__list', header);
  let active: HTMLAnchorElement | null = null;

  const place = () => {
    if (!indicator || !list) return;
    if (!active) {
      indicator.style.opacity = '0';
      return;
    }
    const lr = list.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    indicator.style.opacity = '1';
    indicator.style.width = `${r.width}px`;
    indicator.style.transform = `translateX(${r.left - lr.left}px)`;
  };
  const setActive = (a: HTMLAnchorElement | null) => {
    if (a === active) return;
    active?.classList.remove('is-active');
    active = a;
    active?.classList.add('is-active');
    place();
  };

  links.forEach((link) => {
    const id = link.getAttribute('href')?.slice(1);
    if (!id || link.hasAttribute('data-soon')) return;
    const section = id === 'top' ? $('#top') : document.getElementById(id);
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: (self) => {
        if (self.isActive) setActive(link);
        else if (active === link) setActive(null);
      },
    });
  });
  window.addEventListener('resize', place);

  // Mobile menu
  const toggle = $<HTMLButtonElement>('[data-menu-toggle]');
  const menu = $('[data-menu]');
  const menuLinks = menu ? $$<HTMLAnchorElement>('a', menu) : [];
  const setMenu = (open: boolean) => {
    root.classList.toggle('menu-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    toggle?.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
    menu?.setAttribute('aria-hidden', String(!open));
    menuLinks.forEach((a) => (a.tabIndex = open ? 0 : -1));
    if (open) {
      lenis?.stop();
      setTimeout(() => menuLinks[0]?.focus({ preventScroll: true }), 350);
    } else {
      lenis?.start();
    }
  };
  toggle?.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) {
      setMenu(false);
      toggle?.focus();
    }
  });
  window.matchMedia('(min-width: 1025px)').addEventListener('change', (m) => m.matches && setMenu(false));

  return { closeMenu: () => setMenu(false) };
}

/* ── curtain: the site's page/section transition ─────────────────────── */

const curtain = () => $('[data-curtain]');

function curtainIn(title: string) {
  const el = curtain()!;
  const edge = $('.curtain__edge', el)!;
  const label = $('[data-curtain-title]', el)!;
  label.textContent = title;
  const tl = gsap.timeline();
  tl.set(el, { visibility: 'visible', clipPath: 'inset(0% 0% 0% 100%)' })
    .set(edge, { left: '100%', opacity: 1 })
    .set(label, { opacity: 0, y: 14 })
    .to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.62, ease: EASE.inOut }, 0)
    .to(edge, { left: '0%', duration: 0.62, ease: EASE.inOut }, 0)
    .to(edge, { opacity: 0, duration: 0.2 }, 0.55)
    .to(label, { opacity: 1, y: 0, duration: 0.5, ease: EASE.soft }, 0.32);
  return tl;
}

function curtainOut() {
  const el = curtain()!;
  const edge = $('.curtain__edge', el)!;
  const label = $('[data-curtain-title]', el)!;
  const tl = gsap.timeline();
  tl.to(label, { opacity: 0, y: -10, duration: 0.3, ease: 'power2.in' }, 0)
    .set(edge, { left: '100%', opacity: 1 }, 0.15)
    .to(el, { clipPath: 'inset(0% 100% 0% 0%)', duration: 0.7, ease: EASE.inOut }, 0.15)
    .to(edge, { left: '0%', duration: 0.7, ease: EASE.inOut }, 0.15)
    .set(el, { visibility: 'hidden' })
    .set(edge, { opacity: 0 });
  return tl;
}

/* ── toast ───────────────────────────────────────────────────────────── */

let toastTimer = 0;
export function toast(msg: string) {
  const el = $('[data-toast]');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-on'), 2800);
}

/* ── links: in-page jumps, "coming soon", consultation outro, back-to-top ── */

function sectionTitle(target: HTMLElement, link: HTMLElement) {
  if (target.id === 'top') return 'الرئيسية';
  const text = link.textContent?.trim();
  return text && text.length < 24 ? text : target.querySelector('h2')?.textContent?.trim() ?? '';
}

function jumpTo(target: HTMLElement) {
  const header = $('[data-header]');
  const offset = target.id === 'top' ? 0 : -((header?.offsetHeight ?? 70) + 8);
  const y = target.id === 'top' ? 0 : target.getBoundingClientRect().top + scrollY() + offset;
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
  ScrollTrigger.update();
  const focusEl = (target.querySelector('h1, h2') as HTMLElement | null) ?? target;
  focusEl.setAttribute('tabindex', '-1');
  focusEl.focus({ preventScroll: true });
}

export function initLinks(closeMenu?: () => void) {
  let busy = false;

  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-nav], a[data-external], [data-to-top]');
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    if (a.hasAttribute('data-to-top')) {
      e.preventDefault();
      if (lenis) lenis.scrollTo(0, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else window.scrollTo({ top: 0 });
      return;
    }

    // Leaving for the consultation platform: close the page with the curtain.
    if (a.hasAttribute('data-external')) {
      if (reduceMotion || a.target === '_blank') return;
      e.preventDefault();
      if (busy) return;
      busy = true;
      closeMenu?.();
      curtainIn('منصة الاستشارات').eventCallback('onComplete', () => {
        window.location.href = a.href;
      });
      return;
    }

    const href = a.getAttribute('href') ?? '';
    if (!href.startsWith('#')) return;
    e.preventDefault();

    if (a.hasAttribute('data-soon')) {
      closeMenu?.();
      toast('صفحة الفريق قيد الإعداد — قريبًا');
      return;
    }

    const target = document.getElementById(href.slice(1));
    if (!target || busy) return;
    const wasOpen = root.classList.contains('menu-open');
    closeMenu?.();

    if (reduceMotion) {
      jumpTo(target);
      return;
    }
    busy = true;
    const go = () => {
      curtainIn(sectionTitle(target, a)).eventCallback('onComplete', () => {
        jumpTo(target);
        history.replaceState(null, '', href === '#top' ? location.pathname : href);
        gsap.delayedCall(0.18, () => curtainOut().eventCallback('onComplete', () => (busy = false)));
      });
    };
    if (wasOpen) gsap.delayedCall(0.35, go);
    else go();
  });

  // Returning with the back button after the consultation outro: lift the curtain.
  window.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) {
      busy = false;
      const el = curtain();
      if (el && el.style.visibility === 'visible') curtainOut();
    }
  });
}
