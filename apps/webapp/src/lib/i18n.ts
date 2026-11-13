export type Lang = 'ja' | 'en';

export const CATEGORIES = ['good', 'bad', 'wish', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

const dict = {
  appName: { ja: 'CDK Lovers', en: 'CDK Lovers' },
  tagline: {
    ja: 'CDK の好きなところ・つらみ・こうしてほしいことを、CDK チームに届けよう',
    en: 'Tell the AWS CDK team what you love, what hurts, and what you wish for',
  },
  board: { ja: 'ボード', en: 'Board' },
  people: { ja: '参加者', en: 'People' },
  screen: { ja: 'スクリーン', en: 'Screen' },
  sessions: { ja: 'セッション', en: 'Sessions' },
  noSessions: { ja: 'まだセッションがありません', en: 'No sessions yet' },
  'cat.good': { ja: '好きなところ', en: 'Love' },
  'cat.bad': { ja: 'つらみ', en: 'Pain' },
  'cat.wish': { ja: 'こうしてほしい', en: 'Wish' },
  'cat.other': { ja: 'その他・CDK に言いたいこと', en: 'Anything else' },
  joinTitle: { ja: '参加して意見を投稿しよう', en: 'Join to share your feedback' },
  joinHint: {
    ja: 'パスフレーズは会場でお知らせします。閲覧だけならそのままで OK。',
    en: 'The passphrase is announced in the room. You can read without joining.',
  },
  publicJoin: {
    ja: 'このサイトに書いた意見とプロフィールは、すべて参加者全員に公開されます。意見はスクリーンで CDK チームにも表示されます。',
    en: 'Everything you post here (feedback and profile) is public to all attendees. Feedback is also shown on the screen to the CDK team.',
  },
  passphrase: { ja: 'パスフレーズ', en: 'Passphrase' },
  join: { ja: '参加する', en: 'Join' },
  wrongPassphrase: { ja: 'パスフレーズが違います', en: 'Wrong passphrase' },
  closed: { ja: 'このセッションの受付は終了しました（閲覧のみ）', en: 'This session is closed (read-only)' },
  postPlaceholder: {
    ja: 'CDK について思うことを 1 回に 1 つ（日本語でも英語でも OK、自動翻訳されます）',
    en: 'One thought about CDK per post (Japanese or English, auto-translated)',
  },
  post: { ja: '投稿', en: 'Post' },
  posting: { ja: '翻訳して投稿中…', en: 'Translating & posting…' },
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
  empty: { ja: 'まだ意見がありません', en: 'No feedback yet' },
  notes: { ja: '件', en: 'posts' },
  anonymousNote: {
    ja: '投稿は匿名ですが、内容は参加者全員に公開され、スクリーンで CDK チームにも表示されます。個人情報や社外秘は書かないでください。',
    en: "Posts are anonymous, but what you write is public to everyone and shown on the screen to the CDK team. Don't include personal or confidential information.",
  },
  profileTitle: { ja: 'あなたのプロフィール', en: 'Your profile' },
  profileHint: {
    ja: '入力した内容はすべて参加者全員に公開されます（イベント後数日で削除）。名前以外は任意です。',
    en: 'Everything you enter here is public to all attendees (deleted a few days after the event). Everything except your name is optional.',
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
  posted: { ja: '投稿しました', en: 'Posted' },
  joined: { ja: '参加しました。さっそく投稿してみましょう', en: "You're in! Share your first thought" },
  saved: { ja: '保存しました', en: 'Saved' },
  me: { ja: '自分', en: 'You' },
  autoTranslated: { ja: '自動翻訳', en: 'Translated' },
  invalidUrl: { ja: 'URL / ハンドルの形式を確認してください', en: 'Check the URL or handle' },
  newNote: { ja: 'あなたの意見を投稿', en: 'Share your feedback' },
  category: { ja: 'カテゴリ', en: 'Category' },
  sendHint: { ja: '⌘ / Ctrl + Enter で投稿', en: '⌘ / Ctrl + Enter to post' },
  noMatch: { ja: 'この条件の意見はありません', en: 'Nothing matches this filter' },
  emptyHint: {
    ja: '最初の 1 枚を書いてみましょう',
    en: 'Be the first to share a thought',
  },
  joinStep: { ja: 'パスフレーズを入力', en: 'Enter the passphrase' },
  editProfile: { ja: 'プロフィールを編集', en: 'Edit your profile' },
  addProfile: { ja: 'プロフィールを追加', en: 'Add your profile' },
  searchPeople: { ja: '名前やひとことで検索', en: 'Search by name or intro' },
  readOnly: { ja: '閲覧のみ', en: 'Read-only' },
  open: { ja: '受付中', en: 'Open' },
  closedShort: { ja: '終了', en: 'Closed' },
  enter: { ja: '開く', en: 'Enter' },
  statNotes: { ja: '意見', en: 'Posts' },
  statVotes: { ja: '+1', en: 'Votes' },
  fullscreen: { ja: '全画面', en: 'Fullscreen' },
  rotateHint: {
    ja: 'スマホを横向きにすると全カテゴリを見やすくなります',
    en: 'Turn your phone sideways for a better view',
  },
  madeBy: { ja: 'Made by', en: 'Made by' },
  organizer: { ja: '主催者', en: 'Organizer' },
  fresh: { ja: '新着', en: 'New' },
  noSummary: { ja: 'まだ AI まとめはありません', en: 'No summary yet' },
  mcpTitle: { ja: 'AI から使う (MCP)', en: 'Use from AI (MCP)' },
  mcpHint: {
    ja: 'Claude などの AI アシスタントから、意見の投稿・閲覧やプロフィール登録ができます。画面と同じあなたとして扱われます。',
    en: 'Post and read feedback or update your profile from Claude or another AI assistant. It acts as you, same as this browser.',
  },
  mcpIssue: { ja: '接続 URL を発行', en: 'Get my connection URL' },
  mcpUrl: { ja: 'コネクタ URL (claude.ai / Claude Desktop)', en: 'Connector URL (claude.ai / Claude Desktop)' },
  mcpCli: { ja: 'Claude Code', en: 'Claude Code' },
  mcpWarn: {
    ja: 'この URL はあなた専用の鍵です。人に渡さないでください。14 日で失効します。',
    en: 'This URL is your personal key. Do not share it. It expires in 14 days.',
  },
  copy: { ja: 'コピー', en: 'Copy' },
  copied: { ja: 'コピーしました', en: 'Copied' },
  error: { ja: 'エラーが発生しました', en: 'Something went wrong' },
  joinIntro1: {
    ja: 'AWS CDK チームに直接フィードバックを届ける 45 分のミートアップです。',
    en: 'A 45-minute meetup to give feedback straight to the AWS CDK team.',
  },
  joinIntro2: {
    ja: 'テーブルで話しながら、思ったことを 1 つずつ付箋として投稿します（日英は自動翻訳）。',
    en: 'Talk at your table and post each thought as a note (auto-translated between English and Japanese).',
  },
  joinIntro3: {
    ja: '共感した付箋に +1。+1 が多いものを最後に CDK チームと話します。',
    en: '+1 the notes you agree with. The most +1-ed ones are discussed with the CDK team at the end.',
  },
  phaseNow: { ja: 'いまやること', en: 'Now' },
  phaseTimeUp: { ja: '時間です', en: "Time's up" },
  phasePostAs: { ja: 'カテゴリ', en: 'Post as' },
  shareTitle: { ja: '+1 が多い付箋', en: 'Most +1-ed notes' },
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
