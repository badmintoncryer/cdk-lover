import type { Category, Lang } from './i18n';

/**
 * The parts of the 45-minute meetup. There is no projector, so every attendee's board shows what to
 * do now. The organizer presses Start once; after that the parts advance by the clock using their
 * planned minutes, so running the room never depends on someone tapping the admin page. "Next"
 * cuts the current part short when a discussion dries up. Latecomers catch up from the same banner.
 */
export const PHASES = ['welcome', 'good', 'bad', 'wish', 'share', 'qa', 'done'] as const;
export type Phase = (typeof PHASES)[number];

type Text = Record<Lang, string>;

export type PhaseInfo = {
  /** Short name on the admin buttons and the banner's step label. */
  name: Text;
  title: Text;
  prompt: Text;
  /** Category preselected in the composer while this phase is on. */
  category?: Category;
  /** Default length; the banner counts down from when the organizer switched to it. */
  minutes: number;
};

export const PHASE_INFO: Record<Phase, PhaseInfo> = {
  welcome: {
    name: { en: 'Welcome', ja: 'はじめに' },
    title: { en: 'Welcome to CDK Lovers!', ja: 'CDK Lovers へようこそ！' },
    prompt: {
      en: 'Join with the passphrase, then say hi to your table: your name and what you build with CDK.',
      ja: 'パスフレーズで参加したら、テーブルで自己紹介（名前と CDK で作っているもの）をどうぞ。',
    },
    minutes: 5,
  },
  good: {
    name: { en: 'Love', ja: '好き' },
    title: { en: 'Round 1: What do you love about CDK?', ja: 'ラウンド 1: CDK の好きなところは？' },
    prompt: {
      en: 'A construct, a pattern, a testing trick. Talk at your table and post each one as a note.',
      ja: '便利な Construct、設計パターン、テストの工夫など。テーブルで話しながら、1 つずつ付箋に書いてください。',
    },
    category: 'good',
    minutes: 8,
  },
  bad: {
    name: { en: 'Pain', ja: 'つらみ' },
    title: { en: 'Round 2: What hurts in real projects?', ja: 'ラウンド 2: 実プロジェクトでつらいところは？' },
    prompt: {
      en: 'War stories, failure modes, workarounds. Be specific: the CDK team reads every note.',
      ja: 'ハマった話、壊れ方、回避策など。CDK チームが全部読むので具体的に。',
    },
    category: 'bad',
    minutes: 8,
  },
  wish: {
    name: { en: 'Wish', ja: '要望' },
    title: { en: 'Round 3: What should CDK do next?', ja: 'ラウンド 3: CDK にこうなってほしい' },
    prompt: {
      en: 'Features you want, especially now that AI coding agents write and review infra code. Then +1 the notes you agree with.',
      ja: '欲しい機能、特に AI コーディングエージェントがインフラコードを書く時代に必要なこと。最後に共感した付箋に +1 を。',
    },
    category: 'wish',
    minutes: 8,
  },
  share: {
    name: { en: 'Share', ja: '全体共有' },
    title: { en: 'What the room said', ja: '全体共有' },
    prompt: {
      en: 'The most +1-ed notes from every table. Keep +1-ing what you want the CDK team to answer.',
      ja: '全テーブルの +1 が多い付箋です。CDK チームに答えてほしいものに +1 を続けてください。',
    },
    minutes: 5,
  },
  qa: {
    name: { en: 'Q&A', ja: '質疑' },
    title: { en: 'Q&A with the AWS CDK team', ja: 'CDK チームとの質疑' },
    prompt: {
      en: 'Ask the CDK team directly. Questions in Japanese are fine; the organizer will translate.',
      ja: 'CDK チームに直接質問できます。日本語の質問は主催者が通訳します。',
    },
    minutes: 10,
  },
  done: {
    name: { en: 'Thanks', ja: '終了' },
    title: { en: 'Thanks for coming!', ja: 'ご参加ありがとうございました！' },
    prompt: {
      en: 'Connect with each other on the People page. Posting closes in a few days; the notes go to the CDK team.',
      ja: '参加者ページでつながりましょう。投稿は数日で締め切り、付箋は CDK チームに届けます。',
    },
    minutes: 0,
  },
};

export const isPhase = (v: unknown): v is Phase => typeof v === 'string' && (PHASES as readonly string[]).includes(v);

/**
 * The organizer's last action, as stored: the part they started (or skipped to) and when it ends.
 * Plain values so it can cross to client components. Use `currentPhase` for what is on now.
 */
export type PhaseState = { phase: Phase; endsAt: string | null } | null;

export function phaseState(session: { phase: string | null; phaseEndsAt: Date | null }): PhaseState {
  if (!isPhase(session.phase)) return null;
  return { phase: session.phase, endsAt: session.phaseEndsAt?.toISOString() ?? null };
}

/**
 * What is on at `now`: walks forward from the stored part by the planned minutes. The last part
 * (`done`, 0 minutes) has no end and stays on.
 */
export function currentPhase(state: PhaseState, now: number): PhaseState {
  if (!state) return null;
  let index = PHASES.indexOf(state.phase);
  let end = state.endsAt ? new Date(state.endsAt).getTime() : null;
  while (end !== null && now >= end && index < PHASES.length - 1) {
    index += 1;
    const minutes = PHASE_INFO[PHASES[index]].minutes;
    end = minutes > 0 ? end + minutes * 60_000 : null;
  }
  return { phase: PHASES[index], endsAt: end === null ? null : new Date(end).toISOString() };
}

/** Planned start time of every part from the stored state on (for the organizer's schedule). */
export function schedule(state: PhaseState): { phase: Phase; startsAt: string }[] {
  if (!state?.endsAt) return [];
  const out: { phase: Phase; startsAt: string }[] = [];
  const first = PHASES.indexOf(state.phase);
  let start = new Date(state.endsAt).getTime() - PHASE_INFO[state.phase].minutes * 60_000;
  for (let i = first; i < PHASES.length; i++) {
    out.push({ phase: PHASES[i], startsAt: new Date(start).toISOString() });
    start += PHASE_INFO[PHASES[i]].minutes * 60_000;
  }
  return out;
}

/** What is on right now for a stored session row (server render; clients keep it moving). */
export function livePhase(session: { phase: string | null; phaseEndsAt: Date | null }): PhaseState {
  return currentPhase(phaseState(session), Date.now());
}
