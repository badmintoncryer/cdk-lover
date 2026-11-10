import { describe, expect, test } from 'vitest';
import { extractJson, fromModel, guessLang, splitSummary } from './ai';

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

describe('fromModel', () => {
  test('trusts the script over a model that labels Japanese as English', () => {
    const text = 'MCPからのテスト投稿です';
    const r = fromModel(text, { sourceLang: 'en', en: 'Test post from MCP', ja: text }, 'ja');
    expect(r).toEqual({ sourceLang: 'ja', en: 'Test post from MCP', ja: text });
  });

  test('keeps English text as written', () => {
    const r = fromModel('cdk synth is slow', { sourceLang: 'ja', en: 'x', ja: 'cdk synth が遅い' }, 'en');
    expect(r).toEqual({ sourceLang: 'en', en: 'cdk synth is slow', ja: 'cdk synth が遅い' });
  });

  test('keeps other languages the model detected', () => {
    const r = fromModel('CDK es genial', { sourceLang: 'es', en: 'CDK is great', ja: 'CDK は最高' }, 'en');
    expect(r).toEqual({ sourceLang: 'es', en: 'CDK is great', ja: 'CDK は最高' });
  });
});
