import { describe, expect, it } from 'vitest';
import { creatorInputs, loadCreator } from '../creators';
import { validateCreator } from '../creators/schema';

const clone = <T>(x: T): T => structuredClone(x);

describe('creator configs', () => {
  it.each(Object.keys(creatorInputs))('%s validates (incl. WCAG AA contrast and exercise references)', (slug) => {
    expect(() => loadCreator(slug)).not.toThrow();
  });

  it('two creators really differ (theme, base, programs) — no code change needed', () => {
    const a = loadCreator('ayria').creator;
    const b = loadCreator('nova').creator;
    expect(a.brand.base).not.toBe(b.brand.base);
    expect(a.brand.colors.accent).not.toBe(b.brand.colors.accent);
    expect(a.brand.fonts.display.family).not.toBe(b.brand.fonts.display.family);
    expect(b.programs.every((p) => p.location === 'home')).toBe(true);
  });
});

describe('validation errors are clear', () => {
  it('missing mandatory field', () => {
    const bad = clone(creatorInputs.ayria) as Record<string, any>;
    delete bad.identity.supportEmail;
    expect(() => validateCreator(bad, 'ayria')).toThrow(/identity\.supportEmail/);
  });

  it('bad colour and low contrast', () => {
    const bad = clone(creatorInputs.ayria) as Record<string, any>;
    bad.brand.colors.muted = '#D0C8C0';
    expect(() => validateCreator(bad, 'ayria')).toThrow(/WCAG AA/);
    bad.brand.colors.accent = 'red';
    expect(() => validateCreator(bad, 'ayria')).toThrow(/brand\.colors\.accent/);
  });

  it('missing mandatory quiz question', () => {
    const bad = clone(creatorInputs.ayria) as Record<string, any>;
    bad.quiz.questions = bad.quiz.questions.filter((q: { id: string }) => q.id !== 'location');
    bad.quiz.rules = bad.quiz.rules.filter((r: { when: object }) => !('location' in r.when));
    expect(() => validateCreator(bad, 'ayria')).toThrow(/Missing mandatory question "location"/);
  });

  it('rule pointing to an unknown program', () => {
    const bad = clone(creatorInputs.ayria) as Record<string, any>;
    bad.quiz.rules[0].program = 'nope';
    expect(() => validateCreator(bad, 'ayria')).toThrow(/Unknown program "nope"/);
  });

  it('unknown creator slug', () => {
    expect(() => loadCreator('nobody')).toThrow(/Unknown CREATOR_SLUG/);
  });
});
