import { describe, expect, test } from 'vitest';
import type { OpinionView, SessionRow } from './data';
import { toCsv, toMarkdown } from './report';

const o = (p: Partial<OpinionView>): OpinionView => ({
  id: '1',
  category: 'good',
  body: 'L2 が便利',
  sourceLang: 'ja',
  bodyEn: 'L2 is handy',
  bodyJa: 'L2 が便利',
  votes: 0,
  votedByMe: false,
  mine: false,
  createdAt: '2026-11-30T00:00:00.000Z',
  ...p,
});

describe('report', () => {
  test('csv escapes quotes, commas and newlines', () => {
    const csv = toCsv([o({ body: 'a,"b"\nc' })]);
    expect(csv).toContain('"a,""b""\nc"');
  });

  test('csv neutralizes cells Excel would run as formulas', () => {
    const csv = toCsv([o({ body: '=HYPERLINK("https://evil.example","x")', bodyEn: '+1', bodyJa: '@SUM(A1)' })]);
    expect(csv).toContain(`"'=HYPERLINK(""https://evil.example"",""x"")"`);
    expect(csv).toContain(",'+1,'@SUM(A1),");
    expect(toCsv([o({ body: 'plain' })])).toContain(',plain,');
  });

  test('markdown sorts by votes within a category', () => {
    const session = { title: 'Nov 30', summaryEn: null, summaryJa: null } as SessionRow;
    const md = toMarkdown(session, [o({ id: '1', bodyEn: 'low', votes: 1 }), o({ id: '2', bodyEn: 'high', votes: 5 })]);
    expect(md.indexOf('high')).toBeLessThan(md.indexOf('low'));
    expect(md).toContain('_(original: L2 が便利)_');
  });
});
