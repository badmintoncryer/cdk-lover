import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './i18n';
import { currentPhase, isPhase, PHASE_INFO, PHASES, phaseState, schedule } from './phases';

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

  it('moves on by the clock after Start', () => {
    const start = Date.parse('2026-11-30T22:00:00Z');
    const min = 60_000;
    const started = { phase: 'welcome' as const, endsAt: new Date(start + 5 * min).toISOString() };
    expect(currentPhase(started, start + min)).toEqual(started);
    expect(currentPhase(started, start + 6 * min)).toEqual({
      phase: 'good',
      endsAt: new Date(start + 13 * min).toISOString(),
    });
    expect(currentPhase(started, start + 30 * min)?.phase).toBe('share');
    expect(currentPhase(started, start + 5 * 60 * min)).toEqual({ phase: 'done', endsAt: null });
    expect(currentPhase(null, start)).toBeNull();
  });

  it('plans the start time of every remaining part', () => {
    const start = Date.parse('2026-11-30T22:00:00Z');
    const plan = schedule({ phase: 'welcome', endsAt: new Date(start + 5 * 60_000).toISOString() });
    expect(plan.map((p) => p.phase)).toEqual([...PHASES]);
    expect(plan[0].startsAt).toBe(new Date(start).toISOString());
    expect(plan.at(-1)?.startsAt).toBe(new Date(start + 44 * 60_000).toISOString());
  });
});
