export type Lang = 'ja' | 'en';

export const CATEGORIES = ['good', 'bad', 'wish', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

const dict = {
  appName: { ja: 'CDK Lover', en: 'CDK Lover' },
  tagline: {
    ja: 'CDK の好きなところ・つらいところ・こうしてほしいことを共有しよう',
    en: 'Share what you love, what hurts, and what you wish for in AWS CDK',
  },
  board: { ja: 'ボード', en: 'Board' },
  people: { ja: '参加者', en: 'People' },
  screen: { ja: 'スクリーン', en: 'Screen' },
  sessions: { ja: 'セッション', en: 'Sessions' },
  noSessions: { ja: 'まだセッションがありません', en: 'No sessions yet' },
  'cat.good': { ja: '好き 👍', en: 'Love 👍' },
  'cat.bad': { ja: 'つらい 😣', en: 'Pain 😣' },
  'cat.wish': { ja: 'こうしてほしい 🙏', en: 'Wish 🙏' },
  'cat.other': { ja: 'その他 💬', en: 'Other 💬' },
  joinTitle: { ja: '投稿するにはパスフレーズを入力', en: 'Enter the passphrase to post' },
  joinHint: {
    ja: '閲覧だけならそのままで OK。パスフレーズは会場でお知らせします。',
    en: 'You can read without it. The passphrase is announced in the room.',
  },
  passphrase: { ja: 'パスフレーズ', en: 'Passphrase' },
  yourGroup: { ja: 'あなたのグループ', en: 'Your group' },
  join: { ja: '参加する', en: 'Join' },
  wrongPassphrase: { ja: 'パスフレーズが違います', en: 'Wrong passphrase' },
  closed: { ja: 'このセッションの受付は終了しました（閲覧のみ）', en: 'This session is closed (read-only)' },
  postPlaceholder: {
    ja: 'CDK について思うことを 1 枚に 1 つ（日本語でも英語でも OK、自動翻訳されます）',
    en: 'One thought about CDK per note (Japanese or English, auto-translated)',
  },
  post: { ja: '投稿', en: 'Post' },
  posting: { ja: '翻訳して投稿中…', en: 'Translating & posting…' },
  allGroups: { ja: '全グループ', en: 'All groups' },
  myGroup: { ja: '自分のグループ', en: 'My group' },
  allCategories: { ja: 'すべて', en: 'All' },
  sortNew: { ja: '新しい順', en: 'Newest' },
  sortTop: { ja: '+1 が多い順', en: 'Most +1' },
  showOriginal: { ja: '原文', en: 'Original' },
  showTranslation: { ja: '訳文', en: 'Translation' },
  edit: { ja: '編集', en: 'Edit' },
  delete: { ja: '削除', en: 'Delete' },
  save: { ja: '保存', en: 'Save' },
  cancel: { ja: 'キャンセル', en: 'Cancel' },
  confirmDelete: { ja: '削除しますか？', en: 'Delete this?' },
  empty: { ja: 'まだ投稿がありません', en: 'No notes yet' },
  notes: { ja: '件', en: 'notes' },
  changeGroup: { ja: 'グループ変更', en: 'Change group' },
  anonymousNote: {
    ja: '投稿は匿名で表示されます。',
    en: 'Notes are shown anonymously.',
  },
  profileTitle: { ja: 'あなたのプロフィール', en: 'Your profile' },
  profileHint: {
    ja: '入力した情報は参加者全員に公開され、イベント後数日で削除されます。すべて任意です。',
    en: 'Visible to all attendees and deleted a few days after the event. Everything is optional.',
  },
  name: { ja: '名前', en: 'Name' },
  intro: { ja: 'ひとこと', en: 'One-line intro' },
  noProfiles: { ja: 'まだ誰も登録していません', en: 'No profiles yet' },
  joinToAddProfile: {
    ja: 'プロフィールを載せるにはボードでパスフレーズを入力してください',
    en: 'Enter the passphrase on the board to add your profile',
  },
  summary: { ja: 'AI まとめ', en: 'AI summary' },
  scanToJoin: { ja: 'スキャンして参加', en: 'Scan to join' },
  tooMany: { ja: '投稿数の上限に達しました', en: 'You reached the post limit' },
  error: { ja: 'エラーが発生しました', en: 'Something went wrong' },
} as const;

export type MessageKey = keyof typeof dict;

export function t(lang: Lang, key: MessageKey): string {
  return dict[key][lang];
}

export function categoryLabel(lang: Lang, c: string): string {
  return (CATEGORIES as readonly string[]).includes(c) ? t(lang, `cat.${c}` as MessageKey) : c;
}

export function isLang(v: unknown): v is Lang {
  return v === 'ja' || v === 'en';
}
