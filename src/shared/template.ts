// Fills {{placeholders}} in creator copy. Unknown placeholders are left empty
// rather than shown raw, so a missing value never leaks "{{x}}" to a member.

export type TemplateVars = Record<string, string | number | null | undefined>;

export function fill(template: string, vars: TemplateVars = {}): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === null || v === undefined ? '' : String(v);
  });
}

/** Lists the placeholder names used in a template (for config checks). */
export function placeholders(template: string): string[] {
  return [...template.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]);
}
