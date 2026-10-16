// Design tokens (CSS custom properties) generated from the creator's brand.
// Components only ever use these variables — never raw colours or fonts.

import type { CreatorConfig } from '../creators/schema';
import { mix } from './shared/color';

export function themeVars(brand: CreatorConfig['brand']): Record<string, string> {
  const c = brand.colors;
  const d = brand.fonts.display;
  const u = brand.fonts.ui;
  return {
    '--bg': c.bg,
    '--surface': c.surface,
    '--text': c.text,
    '--muted': c.muted,
    '--line': c.line,
    '--accent': c.accent,
    '--on-accent': c.accentContrast,
    '--accent-soft': mix(c.bg, c.accent, brand.base === 'dark' ? 0.18 : 0.1),
    '--surface-2': mix(c.surface, c.text, brand.base === 'dark' ? 0.06 : 0.035),
    '--scrim': brand.base === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(20,12,8,0.45)',
    '--font-display': `'${d.family}', ${d.fallback}`,
    '--font-ui': `'${u.family}', ${u.fallback}`,
    '--display-weight': String(d.weight),
    '--display-tracking': d.letterSpacing,
    '--display-transform': d.uppercase ? 'uppercase' : 'none',
    '--ui-tracking': u.letterSpacing,
    '--radius-card': `${brand.radius.card}px`,
    '--radius-btn': `${brand.radius.button}px`,
    'color-scheme': brand.base,
  };
}

export function themeCss(brand: CreatorConfig['brand']): string {
  const vars = Object.entries(themeVars(brand))
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
  return `:root{${vars}}`;
}
