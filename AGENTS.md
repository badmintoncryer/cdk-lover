# AGENTS.md

## Commands

```bash
# install all dependencies
pnpm install

# webapp
cd apps/webapp && pnpm run dev          # starts on port 3010 (DATABASE_URL=postgres://... works for local)
cd apps/webapp && pnpm run build
cd apps/webapp && pnpm run lint

# cdk
cd apps/cdk && pnpm run build
cd apps/cdk && pnpm run test:unit
cd apps/cdk && pnpm exec cdk deploy --all
cd apps/cdk && pnpm exec cdk diff

# db migration (requires DSQL cluster)
pnpm --filter @repo/db run migrate

# lint / test across all workspaces (from root)
pnpm -r run lint
pnpm -r run test:unit

# local development (requires DSQL cluster)
pnpm --filter @repo/db run cluster create   # create dev DSQL cluster
cd apps/webapp && pnpm run dev
```

## Development guide

### Access model

- No login for attendees. A random browser id (`cl_pid` cookie) is hashed per purpose with the signing key (`lib/crypto.ts` `purposeKey`) so opinions, votes and profiles cannot be linked to each other. Never store the raw id or join these keys.
- Every attendee mutation in `app/actions.ts` must go through `requireJoined()`, which checks the per-session passphrase cookie. This is the AI cost guard: translation only runs behind it. The one exception is `toggleVote` (`requireVoter()`): +1 is open to anyone viewing an open session; never let it reach an AI call.
- Admin mutations in `app/admin/actions.ts` and `/api/admin/*` must call `requireAdmin()` / `isAdmin()`.

### Database

The project uses Aurora DSQL with Drizzle ORM. Schema is defined in `packages/db/src/schema.ts`.

DSQL constraints:

- No SERIAL/SEQUENCE — use UUID
- No FOREIGN KEY — use Drizzle `relations()` for query builder joins
- JSON: `json`/`jsonb` are supported (stored compressed; 1 MiB compressed-size limit) but **not indexable** — extract fields you filter or sort on into their own columns. Prefer `jsonb`.
- No TRUNCATE — use `DELETE FROM` instead
- CREATE INDEX must use ASYNC keyword
- 1 DDL per transaction
- ALTER TABLE only supports: ADD COLUMN, RENAME COLUMN/TABLE/CONSTRAINT, SET SCHEMA, OWNER TO, and IDENTITY operations. Everything else (DROP COLUMN, ALTER COLUMN TYPE, SET/DROP NOT NULL, SET/DROP DEFAULT, DROP CONSTRAINT) requires table recreation.

- `db.query.*.findMany()` with `exists()`/`sql` subqueries causes alias errors on DSQL (drizzle-team/drizzle-orm#3068). Use `db.select().from()` instead. `findFirst()` is safe.
- Drizzle relational queries can't do `_count` or nested `where` on relations. For list views needing cross-table aggregates or per-row flags, batch-fetch by ids (one query per related table) and merge in JS — never per-row queries (N+1).
- No FK cascade. Delete children explicitly. Default: wrap the deletes in `db.transaction()`. Exception: if a delete can exceed the 3,000-row/transaction limit, batch it in chunks across separate transactions (`DELETE ... WHERE id IN (SELECT id ... LIMIT n)` — DSQL has no `DELETE ... LIMIT`).

### Database migration

See `packages/db/README.md` for full usage. Key rules:

- `pnpm --filter @repo/db run generate` — generates and auto-transforms SQL for DSQL.
- `pnpm --filter @repo/db run migrate` — applies migrations (1 DDL per transaction).
- Do not use `drizzle-kit push` or `drizzle-kit migrate` — they violate DSQL's 1 DDL/transaction constraint.
- When `generate` errors on unfixable patterns (DROP COLUMN, ALTER COLUMN TYPE, etc.): run `git checkout -- migrations/`, then `pnpm --filter @repo/db exec drizzle-kit generate --custom --name=<name>`, and write table recreation SQL or a `.mjs` batch migration manually.
- Data migrations are `.mjs` (`export default async function(client, context)`); the runner does not support `.ts`. The optional `context` injects AWS resources (e.g. an S3 bucket name) into migrations that need them.
- Never hand-create migration files outside the `generate` / `generate --custom` flow — it forks the snapshot chain (duplicate `prevId`) and makes `generate` abort. `check:ci` runs `drizzle-kit check` to catch chain forks and snapshot/`schema.ts` desync.

### Lambda environment

The webapp runs on Lambda behind CloudFront via Lambda Web Adapter (response streaming). `next.config.ts` uses `output: 'standalone'`. Build-time env vars (prefixed `NEXT_PUBLIC_`) are injected via CDK `ContainerImageBuild` build args — they cannot be changed at runtime.

Lambda@Edge function versions (`edge-function.ts`) are retained (`RemovalPolicy.RETAIN`) instead of deleted by CDK, since CloudFront replica deletion is asynchronous and premature deletion causes `DELETE_FAILED`. Retained versions accumulate over deploys and must be deleted manually (via the Lambda console/CLI, after confirming they are no longer replicated to any edge location) if cleanup is needed.

### Container and bundle assets

Both container images are built from the repo root (`directory: join('..', '..')`) with `ignoreMode: IgnoreMode.DOCKER`, so the root `.dockerignore` governs what is staged. Without `IgnoreMode.DOCKER`, CDK applies its own ignore semantics and recursively copies `cdk.out` into the asset staging directory, which fails with `ENAMETOOLONG`.

- The Dockerfiles run `pnpm install` without `--filter`. Under pnpm's strict `node_modules` layout, a filtered install omits transitive dependencies that esbuild needs to resolve while bundling.
- esbuild emits `.mjs`. The bundle is ESM (`--format=esm`) and the packages do not set `"type": "module"`, so a `.js` extension would be loaded as CJS at Lambda runtime and fail.
- `--external:@aws-sdk/*` does not match `@aws/*`. `@aws/aurora-dsql-node-postgres-connector` is bundled, not externalized — do not assume the AWS SDK exclusion covers it.

### Real-time notifications

Server → client push uses AppSync Events. Server-side: `notifySession()` → `sendEvent()` with IAM SigV4. Browsers subscribe with a public API key that the namespace handler limits to `/event-bus/public/*`; publishing is IAM-only. `LiveRefresh` also polls, so a missed event only delays an update.

## Documentation policy

- Do not document what can be derived from code. An agent can read the codebase.
- Enforce verifiable constraints with tests and linters, not prose.
- Code comments explain "why not" only — the non-obvious reason something was done a certain way.
- Before adding a line to this file, ask: "If I remove this line, will an agent make a mistake?" If no, don't add it. If a root cause is fixed, remove the corresponding line.

## Conventions

- PR titles and code comments in English.
- Issues and discussions in English or Japanese.
- PR titles follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.).
- UI components: use [shadcn/ui](https://ui.shadcn.com/). Do not introduce alternative component libraries.
- Logs: use JSON structured output.
- Dependencies: esbuild and Next.js bundle everything, so only packages with native binaries needed at Lambda runtime belong in `dependencies`. Everything else goes in `devDependencies`.
- Tests: colocate with source (`foo.test.ts` next to `foo.ts`). Use `.integ.test.ts` suffix for tests requiring external resources. Test runner is vitest for `apps/webapp` and `packages/db`; `apps/cdk` uses Jest (`test:unit`) for CDK snapshot/template tests kept under `apps/cdk/test/`.
