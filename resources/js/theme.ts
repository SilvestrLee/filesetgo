import {
  oppositeTheme,
  parseThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  themeCookie,
  type ThemePreference,
} from './theme/preference';

const root = document.documentElement;
const systemPreference = window.matchMedia('(prefers-color-scheme: dark)');
const mobileFooter = window.matchMedia('(max-width: 767px)');
const compactHeaderThreshold = 72;
const openHeaderThreshold = 24;

function storedPreference(): ThemePreference | undefined {
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return undefined;
  }
}

function updateControls(preference: ThemePreference): void {
  const resolved = resolveTheme(preference, systemPreference.matches);
  const next = oppositeTheme(resolved);

  root.dataset.themeResolved = resolved;

  document.querySelectorAll<HTMLElement>('[data-theme-current]').forEach((label) => {
    label.textContent = preference === 'system' ? `System (${resolved})` : preference[0].toUpperCase() + preference.slice(1);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
    const label = `Switch to ${next} theme`;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(resolved === 'dark'));
    button.title = label;
  });
}

function applyPreference(preference: ThemePreference, persist: boolean): void {
  root.dataset.theme = preference;
  updateControls(preference);

  if (!persist) {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // The cookie remains the durable preference when storage is unavailable.
  }

  document.cookie = themeCookie(preference, window.location.protocol === 'https:');
}

const serverPreference = parseThemePreference(root.dataset.theme) ?? 'system';
applyPreference(storedPreference() ?? serverPreference, false);

document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const preference = parseThemePreference(root.dataset.theme) ?? 'system';
    const resolved = resolveTheme(preference, systemPreference.matches);
    applyPreference(oppositeTheme(resolved), true);
  });
});

systemPreference.addEventListener('change', () => {
  const preference = parseThemePreference(root.dataset.theme) ?? 'system';

  if (preference === 'system') {
    updateControls(preference);
  }
});

function syncFooterDisclosure(isMobile: boolean): void {
  document.querySelectorAll<HTMLDetailsElement>('.fsg-footer__tasks').forEach((details) => {
    details.open = !isMobile;
  });
}

syncFooterDisclosure(mobileFooter.matches);
mobileFooter.addEventListener('change', (event) => syncFooterDisclosure(event.matches));

function initializeHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-site-header]');

  if (header === null) {
    return;
  }

  let compact = window.scrollY >= compactHeaderThreshold;
  let frameRequested = false;

  const renderHeaderState = (): void => {
    const scrollPosition = window.scrollY;

    if (!compact && scrollPosition >= compactHeaderThreshold) {
      compact = true;
    } else if (compact && scrollPosition <= openHeaderThreshold) {
      compact = false;
    }

    header.classList.toggle('is-compact', compact);
    header.dataset.headerState = compact ? 'scrolled' : 'top';
    frameRequested = false;
  };

  const requestHeaderState = (): void => {
    if (frameRequested) {
      return;
    }

    frameRequested = true;
    window.requestAnimationFrame(renderHeaderState);
  };

  renderHeaderState();
  window.addEventListener('scroll', requestHeaderState, { passive: true });
}

function initializeTaskNavigation(): void {
  const disclosures = Array.from(document.querySelectorAll<HTMLDetailsElement>('[data-task-navigation]'));
  const mobileNavigation = window.matchMedia('(max-width: 767px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (disclosures.length === 0) {
    return;
  }

  let closeTimer: number | undefined;
  let lockedScrollPosition = 0;

  const setExpandedState = (details: HTMLDetailsElement): void => {
    const trigger = details.querySelector<HTMLElement>('summary');
    trigger?.setAttribute('aria-expanded', String(details.open));
  };

  const setPageInert = (inert: boolean): void => {
    document.querySelectorAll<HTMLElement>('main, .fsg-footer').forEach((element) => {
      element.inert = inert;
    });
  };

  const lockPage = (): void => {
    if (document.body.classList.contains('fsg-nav-is-open')) {
      return;
    }

    lockedScrollPosition = window.scrollY;
    document.body.style.top = `-${lockedScrollPosition}px`;
    document.documentElement.classList.add('fsg-nav-is-open');
    document.body.classList.add('fsg-nav-is-open');
    setPageInert(true);
  };

  const unlockPage = (): void => {
    const wasLocked = document.body.classList.contains('fsg-nav-is-open');
    document.documentElement.classList.remove('fsg-nav-is-open');
    document.body.classList.remove('fsg-nav-is-open');
    document.body.style.removeProperty('top');
    setPageInert(false);

    if (wasLocked) {
      const previousScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, lockedScrollPosition);
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    }
  };

  const configureMobileSemantics = (details: HTMLDetailsElement, enabled: boolean): void => {
    const menu = details.querySelector<HTMLElement>('.fsg-task-menu');

    if (enabled) {
      menu?.setAttribute('role', 'dialog');
      menu?.setAttribute('aria-modal', 'true');
      return;
    }

    menu?.removeAttribute('role');
    menu?.removeAttribute('aria-modal');
  };

  const finishClose = (details: HTMLDetailsElement, restoreFocus: boolean): void => {
    details.open = false;
    details.removeAttribute('data-closing');
    setExpandedState(details);
    configureMobileSemantics(details, false);
    unlockPage();

    if (restoreFocus) {
      details.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
    }
  };

  const closeDisclosure = (details: HTMLDetailsElement, restoreFocus = false): void => {
    if (!details.open || details.dataset.closing === 'true') {
      return;
    }

    if (!mobileNavigation.matches || reducedMotion.matches) {
      finishClose(details, restoreFocus);
      return;
    }

    details.dataset.closing = 'true';
    closeTimer = window.setTimeout(() => finishClose(details, restoreFocus), 340);
  };

  const openDisclosure = (details: HTMLDetailsElement): void => {
    if (closeTimer !== undefined) {
      window.clearTimeout(closeTimer);
      closeTimer = undefined;
    }

    disclosures.forEach((candidate) => {
      if (candidate !== details && candidate.open) {
        finishClose(candidate, false);
      }
    });

    details.removeAttribute('data-closing');
    details.open = true;
    setExpandedState(details);

    if (mobileNavigation.matches) {
      configureMobileSemantics(details, true);
      lockPage();
    }
  };

  disclosures.forEach((details) => {
    setExpandedState(details);
    details.querySelector<HTMLElement>('summary')?.addEventListener('click', (event) => {
      event.preventDefault();

      if (details.open) {
        closeDisclosure(details, true);
      } else {
        openDisclosure(details);
      }
    });
  });

  document.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    disclosures.forEach((details) => {
      if (details.open && !details.contains(target)) {
        closeDisclosure(details, false);
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    const openDisclosure = disclosures.find((details) => details.open && details.dataset.closing !== 'true');

    if (openDisclosure === undefined) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeDisclosure(openDisclosure, true);
      return;
    }

    if (event.key !== 'Tab' || !mobileNavigation.matches) {
      return;
    }

    const trigger = openDisclosure.querySelector<HTMLElement>('summary');
    const menuLinks = Array.from(openDisclosure.querySelectorAll<HTMLElement>('.fsg-task-menu a'));
    const themeToggle = document.querySelector<HTMLElement>('[data-theme-toggle]');
    const focusable = [trigger, ...menuLinks, themeToggle].filter((element): element is HTMLElement => element !== null);
    const first = focusable[0];
    const last = focusable.at(-1);

    if (first === undefined || last === undefined) {
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  mobileNavigation.addEventListener('change', (event) => {
    disclosures.forEach((details) => {
      configureMobileSemantics(details, event.matches && details.open);
    });

    if (event.matches && disclosures.some((details) => details.open)) {
      lockPage();
    } else {
      unlockPage();
    }
  });
}

initializeHeader();
initializeTaskNavigation();
