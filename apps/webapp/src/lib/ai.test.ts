import { describe, expect, test } from 'vitest';
import { extractJson, guessLang, splitSummary } from './ai';

describe('ai helpers', () => {
  test('guessLang detects Japanese', () => {
    expect(guessLang('L2 コンストラクトが便利')).toBe('ja');
    expect(guessLang('cdk synth is slow')).toBe('en');
  });

  test('extractJson tolerates code fences', () => {
    expect(extractJson('```json\n{"en":"a","ja":"b"}\n```')).toEqual({ en: 'a', ja: 'b' });
  });

  test('extractJson throws without JSON', () => {
    expect(() => extractJson('sorry')).toThrow('no JSON object');
  });

  test('splitSummary splits sections', () => {
    expect(splitSummary('===EN===\n## Hi\n===JA===\n## やあ')).toEqual({ en: '## Hi', ja: '## やあ' });
    expect(() => splitSummary('## Hi')).toThrow('missing');
  });
});
