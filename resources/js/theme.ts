import {
  parseThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  themeCookie,
  type ThemePreference,
} from './theme/preference';

const root = document.documentElement;
const systemPreference = window.matchMedia('(prefers-color-scheme: dark)');

function storedPreference(): ThemePreference | undefined {
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return undefined;
  }
}

function updateControls(preference: ThemePreference): void {
  const resolved = resolveTheme(preference, systemPreference.matches);

  document.querySelectorAll<HTMLElement>('[data-theme-current]').forEach((label) => {
    label.textContent = preference === 'system' ? `System (${resolved})` : preference[0].toUpperCase() + preference.slice(1);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach((button) => {
    const selected = button.dataset.themeChoice === preference;
    button.setAttribute('aria-pressed', String(selected));
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

document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach((button) => {
  button.addEventListener('click', () => {
    const preference = parseThemePreference(button.dataset.themeChoice);

    if (preference === undefined) {
      return;
    }

    applyPreference(preference, true);
    button.closest('details')?.removeAttribute('open');
  });
});

systemPreference.addEventListener('change', () => {
  const preference = parseThemePreference(root.dataset.theme) ?? 'system';
  updateControls(preference);
});
