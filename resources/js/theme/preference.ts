export const THEME_STORAGE_KEY = 'filesetgo-theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export function parseThemePreference(value: unknown): ThemePreference | undefined {
  return value === 'system' || value === 'light' || value === 'dark' ? value : undefined;
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }

  return preference;
}

export function themeCookie(preference: ThemePreference, isSecure: boolean): string {
  const secure = isSecure ? '; Secure' : '';

  return `fsg_theme=${preference}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}
