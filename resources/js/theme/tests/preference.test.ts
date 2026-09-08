import { describe, expect, it } from 'vitest';
import { parseThemePreference, resolveTheme, themeCookie } from '../preference';

describe('theme preference', () => {
  it('accepts only the three governed preferences', () => {
    expect(parseThemePreference('system')).toBe('system');
    expect(parseThemePreference('light')).toBe('light');
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('sepia')).toBeUndefined();
    expect(parseThemePreference(null)).toBeUndefined();
  });

  it('resolves system without overriding explicit choices', () => {
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('builds a durable same-site cookie and adds Secure only on HTTPS', () => {
    expect(themeCookie('dark', false)).toBe('fsg_theme=dark; Path=/; Max-Age=31536000; SameSite=Lax');
    expect(themeCookie('light', true)).toBe('fsg_theme=light; Path=/; Max-Age=31536000; SameSite=Lax; Secure');
  });
});
