import type { GroupRow, OpinionView, SessionRow } from './data';
import { CATEGORIES } from './i18n';

const LABEL: Record<string, string> = { good: 'What people love', bad: 'Pain points', wish: 'Wishes', other: 'Other' };

/** Cells starting with these are run as formulas by Excel / Sheets (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(v: string | number): string {
  const raw = String(v);
  const s = typeof v === 'string' && FORMULA_START.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(opinions: OpinionView[]): string {
  const header = ['category', 'group', 'votes', 'source_lang', 'original', 'english', 'japanese', 'created_at'];
  const rows = opinions.map((o) => [
    o.category,
    o.groupName,
    o.votes,
    o.sourceLang,
    o.body,
    o.bodyEn,
    o.bodyJa,
    o.createdAt,
  ]);
  // BOM so Excel opens UTF-8 Japanese correctly.
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function toMarkdown(session: SessionRow, groups: GroupRow[], opinions: OpinionView[]): string {
  const out: string[] = [];
  out.push(`# CDK Lovers feedback report — ${session.title}`, '');
  out.push(
    `- Notes: ${opinions.length}`,
    `- Groups: ${groups.map((g) => `${g.name} (${g.language})`).join(', ') || '-'}`,
    '',
  );
  if (session.summaryEn) out.push('## AI summary (English)', '', session.summaryEn, '');
  if (session.summaryJa) out.push('## AI まとめ（日本語）', '', session.summaryJa, '');
  out.push('## All notes (sorted by +1)', '');
  for (const c of CATEGORIES) {
    const items = opinions.filter((o) => o.category === c).sort((a, b) => b.votes - a.votes);
    if (items.length === 0) continue;
    out.push(`### ${LABEL[c]} (${items.length})`, '');
    for (const o of items) {
      const original = o.sourceLang === 'en' ? '' : ` _(original: ${o.body.replace(/\s+/g, ' ')})_`;
      out.push(`- **+${o.votes}** [${o.groupName}] ${o.bodyEn.replace(/\s+/g, ' ')}${original}`);
    }
    out.push('');
  }
  return out.join('\n');
}
