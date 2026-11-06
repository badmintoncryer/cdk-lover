# CDK Lover 💜

AWS re:Invent のコミュニティセッション「CDK Lover」専用の Web サイトです。参加者が CDK の「好き / つらい / こうしてほしい」を付箋のように投稿し、全グループの意見をひとつのボードで共有して、最後に CDK チームへスクリーンで直接フィードバックします。

[aws-samples/serverless-full-stack-webapp-starter-kit](https://github.com/aws-samples/serverless-full-stack-webapp-starter-kit) をベースにしています（MIT-0）。

## できること

| 画面       | URL              | 内容                                                                                                                                     |
| ---------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| ボード     | `/s/<id>`        | 付箋の投稿・+1・編集/削除。全グループ / 自分のグループ / カテゴリで絞り込み。日本語↔英語の自動翻訳と原文切り替え。閲覧はパスフレーズ不要 |
| 参加者     | `/s/<id>/people` | 名前・ひとこと・LinkedIn / X / GitHub のカード一覧（回ごと）                                                                             |
| スクリーン | `/s/<id>/screen` | 投影用。カテゴリ別・+1 順、参加用 QR、AI まとめ。`?lang=ja` で日本語表示                                                                 |
| 管理       | `/admin`         | 回の作成、パスフレーズ設定、受付の開始/終了、グループ作成、AI まとめ実行、レポート出力（Markdown / CSV）、削除                           |
| MCP        | `/api/mcp`       | 画面を開かずに AI アシスタントから操作するための MCP サーバー（下記）                                                                    |

- 意見は匿名で表示します。ブラウザごとのランダム ID のハッシュだけを保存し、用途（意見 / +1 / プロフィール）ごとに salt を変えているので、意見とプロフィールは紐づきません。
- 書き込み（投稿・+1・プロフィール）はその回のパスフレーズを入れたブラウザだけが行えます。AI 処理はすべて書き込み経由なので、パスフレーズが AI コストの防波堤になります。加えて 1 人あたり投稿 60 件、本文 400 文字、AI まとめは各回 20 回までの上限があります。

## 構成

- Next.js (App Router) on Lambda（Lambda Web Adapter）+ CloudFront（OAC + 署名用 Lambda@Edge）
- Aurora DSQL + Drizzle ORM（`cdk destroy` で削除されるよう `RemovalPolicy.DESTROY`）
- AppSync Events: ブラウザは API キーで購読のみ、発行は Lambda から IAM で。会場 Wi-Fi が切れても 10 秒ごとのポーリングで追いつきます
- Amazon Bedrock: 翻訳 `us.amazon.nova-lite-v1:0`、まとめ `us.amazon.nova-pro-v1:0`（デプロイ時に変更可）
- Secrets Manager: 管理者パスワード、署名鍵、MCP 管理者トークン（デプロイ時に自動生成）
- WAF は付けていません（一時的なイベントサイトでアイドルコストを避けるため）。CloudFront は従量課金です

## synth 時のチェック

`cdk synth` / `cdk deploy` のたびに次の 2 つが走ります（`apps/cdk/bin/cdk.ts`）。

- [cdk-preflight](https://github.com/badmintoncryer/cdk-preflight): デプロイ途中で失敗すると分かっているテンプレートを synth の時点で止めます。
- [cfn-idle-cost](https://github.com/badmintoncryer/cfn-idle-cost): アクセスゼロでもかかる月額（アイドルコスト）を表示し、`budgetUsd`（既定 $20）を超えたら synth を失敗させます。1 ドル/月以上のリソースは警告として出ます。WAF は付けていないので、現状のアイドルコストは Secrets Manager の 3 本分（約 $1.20/月）だけです。

## デプロイ

前提: Node.js 22+、pnpm 10、AWS CLI の認証、デプロイ先アカウントで `cdk bootstrap` 済み（us-east-1 と us-west-2 の両方）。

pnpm は `package.json` の `packageManager` に書いた 10.34.4 を使います。別のメジャー（pnpm 12 など）が先に見つかると `ERR_PNPM_BAD_PM_VERSION` で止まるので、次のどれかで合わせてください。

- mise: リポジトリ直下の `mise.toml` が pnpm 10.34.4 と Node.js 22 を指定しています。初回だけ `mise trust && mise install` を実行します。
- corepack: `corepack enable && corepack prepare pnpm@10.34.4 --activate`

`pnpm -v` が `10.34.4` を返せば準備完了です。`cdk.json` の app コマンドは pnpm を経由しない（`npx ts-node`）ので、`./node_modules/.bin/cdk` を直接呼んでも同じように動きます。

```bash
pnpm install
cd apps/cdk
# 予算アラートを付ける場合は -c budgetEmail=you@example.com（任意）
pnpm exec cdk deploy --all   # メインのスタックは us-west-2 固定（変えるなら -c region=...）
```

出力の `FrontendDomainName` がサイトの URL、`AdminPasswordCommand` が管理者パスワードを取り出すコマンドです。

モデルを変える場合:

```bash
pnpm exec cdk deploy --all -c translateModelId=<model or inference profile id> -c summaryModelId=<id>
```

### カスタムドメイン

`apps/cdk/cdk.json` の `domainName` と `hostedZoneId` で、サイトを独自ドメイン（現在は `https://cdk-lover.appnao.com`）で配信します。us-east-1 のスタックで ACM 証明書（DNS 検証）を発行し、メインのスタックで CloudFront に別名と Route 53 のエイリアスレコードを付けます。`*.cloudfront.net` の URL もそのまま使えます。

ホストゾーンは `domainName` と同じ名前でデプロイ先アカウントに置きます。親ドメインが別アカウントにある場合は、先にゾーンを作って親ゾーンに NS レコードで委任してください（委任前にデプロイすると証明書の検証で止まります）。

```bash
AWS_PROFILE=<deploy> aws route53 create-hosted-zone --name cdk-lover.example.com --caller-reference $(date +%s)
# 返ってきた 4 つの NS を、親ゾーン（example.com）に cdk-lover.example.com の NS レコードとして追加
```

独自ドメインなしでデプロイするときは `-c domainName= -c hostedZoneId=` を付けます。

デプロイ後に一度だけやること:

1. Bedrock コンソールで、使うモデルが呼び出せる状態か確認する（Nova はアカウントで有効化済みなら追加作業なし）。
2. IP 制限に自分の IP を登録する（下記）。登録するまでは誰もアクセスできません。

### IP 制限（本番前の保護）

既定で、CloudFront Function と KeyValueStore による IPv4 の許可リストが有効です（WAF は不要です）。リストはデプロイせずに数秒で書き換えられます。

```bash
cd apps/cdk
scripts/allow-ip.sh                      # 今の自分のグローバル IPv4 だけを許可
scripts/allow-ip.sh 203.0.113.7,198.51.100.0/24
scripts/allow-ip.sh show                 # 現在のリストを表示
scripts/allow-ip.sh open                 # 全員に公開（当日）
```

IP が変わったら `scripts/allow-ip.sh` を実行し直してください。制限中は IPv6 を無効にしています。機能自体を外すには `-c ipRestriction=false` でデプロイします。

## 当日の手順

0. `apps/cdk/scripts/allow-ip.sh open` で全員に公開する。
1. `/admin` にログインし、回を作る（例: ID `1130`、パスフレーズ、受付 open）。
2. グループを作る（例: `JP-1` ja、`JP-2` ja、`EN-1` en）。
3. スクリーンに `/s/1130/screen` を映す。QR から参加し、口頭でパスフレーズを伝える。
4. ディスカッション中はボードに投稿してもらう。スクリーンでグループ別・言語別に切り替えられます。
5. 最後に管理画面で「Generate summary」→ スクリーンの「AI summary」タブを CDK チームに見せる。
6. 終わったら受付を closed にし、「Download report (.md)」でレポートを保存。

パスフレーズを変えると、その回に参加済みのブラウザは再入力が必要になります（漏れたときの対処に使えます）。

## MCP サーバー

`/api/mcp` は MCP（Streamable HTTP、ステートレス）のエンドポイントです。webapp と同じ Lambda で動き、画面と同じロジック（`apps/webapp/src/lib/core/`）を呼ぶので、上限・翻訳・リアルタイム反映は画面と同じです。接続トークンの種類で使えるツールが変わります。

| トークン | 入手方法                                                                  | ツール                                                                                                     |
| -------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 参加者   | ボードでパスフレーズを入れた後の「AI から使う (MCP)」→「接続 URL を発行」 | その回の意見の閲覧・投稿・編集・削除、+1、参加者一覧、自分のプロフィールの登録・削除                       |
| 管理者   | デプロイ出力 `McpAdminTokenCommand` のコマンド（AWS の認証情報が必要）    | 管理画面の操作すべて（`admin_*`: 回の作成・編集、グループ、モデレーション、AI まとめ、レポート、回の削除） |

- 参加者トークンはブラウザと同じ匿名 ID として扱われるので、MCP で書いた意見を画面から編集でき、その逆もできます。有効期限は 14 日で、回のパスフレーズを変えるとその回のトークンはすべて無効になります。
- 管理者トークンは Secrets Manager のシークレット `McpAdminToken` です。ローテートすると古いトークンは使えなくなります。
- トークンは URL のパス `/api/mcp/<token>` で渡します。`Authorization` ヘッダーは使えません。CloudFront が Lambda Function URL を呼ぶとき（OAC + IAM 認証）に、自分の SigV4 署名で上書きするためです。
- `/api/mcp` も IP 制限の対象です。claude.ai / Claude Desktop のカスタムコネクタは Anthropic のクラウドから接続してくるので、制限中は使えません。制限中に使えるのは、許可した IP の PC から接続する Claude Code だけです。`allow-ip.sh open` の後はどのクライアントからも使えます。

管理者として Claude Code から使う例:

```bash
TOKEN=$(aws secretsmanager get-secret-value --region us-west-2 --secret-id <McpAdminTokenCommand の secret-id> --query SecretString --output text)
claude mcp add -s user --transport http cdk-lover-admin "<FrontendDomainName>/api/mcp/$TOKEN"   # 例: https://cdk-lover.appnao.com/api/mcp/$TOKEN
```

## 撤去

```bash
cd apps/cdk
pnpm exec cdk destroy --all
```

DSQL クラスタ、シークレット、ログ、S3 バケットまで消えます。カスタムドメインのホストゾーンと親ゾーンの NS レコードはスタックの外で作ったものなので残ります（ゾーンは月 $0.50）。例外として、CloudFront の仕様上 Lambda@Edge の関数バージョンは数時間後に手動削除が必要です（us-east-1 の Lambda コンソールで名前に `SignPayloadHandler` を含む関数を削除）。データだけ先に消したいときは、管理画面の「Delete everything」で回ごとに削除できます。

## ローカル開発

```bash
cp apps/webapp/.env.local.example apps/webapp/.env.local
# DSQL の代わりに素の PostgreSQL も使えます: DATABASE_URL=postgres://...
# （その場合 migrations/*.sql の "INDEX ASYNC" を "INDEX" にして流してください）
cd apps/webapp && pnpm run dev
```

`TRANSLATE_MODEL_ID` が未設定、または Bedrock 呼び出しに失敗した場合は、原文をそのまま両言語に表示します（投稿は失われません）。

## テスト

```bash
pnpm -r run check:ci
pnpm -r run test:unit
cd apps/webapp && pnpm run build
```
