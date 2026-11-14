import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './i18n';
import { isPhase, PHASE_INFO, PHASES, phaseState } from './phases';

describe('phases', () => {
  it('has text in both languages and a known category for every phase', () => {
    for (const p of PHASES) {
      const info = PHASE_INFO[p];
      for (const field of [info.name, info.title, info.prompt]) {
        expect(field.en.trim()).not.toBe('');
        expect(field.ja.trim()).not.toBe('');
      }
      expect([...CATEGORIES, undefined]).toContain(info.category);
    }
  });

  it('fits the 45-minute meetup', () => {
    expect(PHASES.reduce((n, p) => n + PHASE_INFO[p].minutes, 0)).toBeLessThanOrEqual(45);
  });

  it('ignores unknown or empty phases', () => {
    expect(isPhase('good')).toBe(true);
    expect(isPhase('nope')).toBe(false);
    expect(phaseState({ phase: null, phaseEndsAt: null })).toBeNull();
    expect(phaseState({ phase: 'nope', phaseEndsAt: null })).toBeNull();
  });

  it('passes the end time as an ISO string', () => {
    const end = new Date('2026-11-30T22:13:00Z');
    expect(phaseState({ phase: 'bad', phaseEndsAt: end })).toEqual({ phase: 'bad', endsAt: end.toISOString() });
  });
});
