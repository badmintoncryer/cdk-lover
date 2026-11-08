import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({});

export type Translation = { sourceLang: string; en: string; ja: string };

const JAPANESE = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;

export function guessLang(text: string): 'ja' | 'en' {
  return JAPANESE.test(text) ? 'ja' : 'en';
}

/** Pulls the first JSON object out of a model reply (models sometimes wrap it in prose or fences). */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no JSON object in model output');
  return JSON.parse(text.slice(start, end + 1));
}

async function converse(modelId: string, system: string, user: string, maxTokens: number): Promise<string> {
  const res = await client.send(
    new ConverseCommand({
      modelId,
      system: [{ text: system }],
      messages: [{ role: 'user', content: [{ text: user }] }],
      inferenceConfig: { maxTokens, temperature: 0.2 },
    }),
  );
  const out = res.output?.message?.content?.map((c) => c.text ?? '').join('') ?? '';
  if (!out) throw new Error('empty model output');
  return out;
}

const TRANSLATE_SYSTEM = `You translate short feedback notes about AWS CDK between Japanese and English.
Rules:
- Keep code, construct names, CLI commands, API names and product names (CDK, CloudFormation, L1/L2/L3, cdk synth, etc.) unchanged.
- Keep the tone; do not add or remove content.
- If the note is in neither language, still provide both translations.
Reply with JSON only, no prose: {"sourceLang":"<ISO 639-1 code of the note>","en":"<English>","ja":"<Japanese>"}`;

/** The post shown as written in both languages (no model call). */
export function untranslated(text: string): Translation {
  return { sourceLang: guessLang(text), en: text, ja: text };
}

/**
 * Translates a post into both languages. Never throws: on any model error the original text is
 * shown in both languages so a post is never lost because of the AI.
 */
export async function translate(text: string): Promise<Translation> {
  const fallback = untranslated(text);
  const fallbackLang = fallback.sourceLang;
  const modelId = process.env.TRANSLATE_MODEL_ID;
  if (!modelId) return fallback;
  try {
    // 400 chars of input needs far fewer output tokens; a low cap bounds "repeat this" prompt abuse.
    const out = await converse(modelId, TRANSLATE_SYSTEM, text, 800);
    const parsed = extractJson(out) as Partial<Translation>;
    const sourceLang = typeof parsed.sourceLang === 'string' ? parsed.sourceLang.slice(0, 8) : fallbackLang;
    return {
      sourceLang,
      // Keep the author's exact words for their own language.
      en: sourceLang === 'en' ? text : (parsed.en?.trim() ?? text),
      ja: sourceLang === 'ja' ? text : (parsed.ja?.trim() ?? text),
    };
  } catch (e) {
    console.error(JSON.stringify({ msg: 'translate failed', error: String(e) }));
    return fallback;
  }
}

export type SummaryInput = { category: string; group: string; text: string; votes: number };

const SUMMARY_SYSTEM = `You are helping the host of "CDK Lovers", a community session at AWS re:Invent where attendees discuss AWS CDK in small groups and then give feedback directly to the AWS CDK team.
Summarize all sticky notes for the CDK team. Group similar points into themes, highlight what got the most +1 votes, and keep concrete requests (feature names, pain points) specific.
Structure, in Markdown:
## Highlights (3-5 bullets)
## What people love
## Pain points
## Requests for the CDK team
Output the English summary after a line "===EN===", then the same content in natural Japanese after a line "===JA===". Nothing else.`;

/** Splits "===EN=== ... ===JA=== ..." (Markdown is not safe to embed in JSON from a model). */
export function splitSummary(text: string): { en: string; ja: string } {
  const m = text.match(/===EN===([\s\S]*?)===JA===([\s\S]*)/);
  if (!m) throw new Error('summary is missing ===EN=== / ===JA=== sections');
  const en = m[1].trim();
  const ja = m[2].trim();
  if (!en || !ja) throw new Error('summary section is empty');
  return { en, ja };
}

export async function summarize(items: SummaryInput[]): Promise<{ en: string; ja: string }> {
  const modelId = process.env.SUMMARY_MODEL_ID;
  if (!modelId) throw new Error('SUMMARY_MODEL_ID is not set');
  const lines = items
    .map((o) => `- [${o.category}] (+${o.votes}, ${o.group}) ${o.text.replace(/\s+/g, ' ')}`)
    .join('\n');
  const out = await converse(modelId, SUMMARY_SYSTEM, `Sticky notes (${items.length}):\n${lines}`, 4000);
  return splitSummary(out);
}
