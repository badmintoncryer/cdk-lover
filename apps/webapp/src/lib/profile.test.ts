import { describe, expect, test } from 'vitest';
import { normalizeProfileUrl } from './profile';

describe('normalizeProfileUrl', () => {
  test('handles and URLs', () => {
    expect(normalizeProfileUrl('x', '@badmintoncryer')).toBe('https://x.com/badmintoncryer');
    expect(normalizeProfileUrl('github', 'badmintoncryer')).toBe('https://github.com/badmintoncryer');
    expect(normalizeProfileUrl('linkedin', 'linkedin.com/in/foo')).toBe('https://linkedin.com/in/foo');
    expect(normalizeProfileUrl('x', 'http://twitter.com/foo')).toBe('https://twitter.com/foo');
  });

  test('empty is null', () => {
    expect(normalizeProfileUrl('x', '  ')).toBeNull();
  });

  test('rejects other sites and scripts', () => {
    expect(() => normalizeProfileUrl('github', 'https://evil.example.com/x')).toThrow('not a github URL');
    expect(() => normalizeProfileUrl('x', 'javascript:alert(1)')).toThrow('invalid x handle');
  });
});
