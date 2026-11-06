/**
 * The CDK Lover MCP server. One server, two kinds of caller:
 * - a participant (token issued on the board after joining) gets the board and people tools for
 *   their one session, acting as the same anonymous person as their browser;
 * - the admin (token from Secrets Manager) gets the admin page operations for every session.
 * Admin tools are not even listed for a participant token.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as admin from '@/lib/core/admin';
import { CoreError } from '@/lib/core/errors';
import * as participant from '@/lib/core/participant';
import { getSession, listGroups, listOpinions, listProfiles, listSessions, type OpinionView } from '@/lib/data';
import { CATEGORIES } from '@/lib/i18n';
import { toMarkdown } from '@/lib/report';

export type Caller = { kind: 'participant'; participant: participant.Participant } | { kind: 'admin' };

const CATEGORY_HELP =
  'good = what you love about CDK, bad = pain points, wish = what you want the CDK team to do, other = anything else';

const json = (value: unknown): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
});

/** Shows messages we chose to expose; anything unexpected becomes a generic error (and is logged). */
async function handle(tool: string, fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    const value = await fn();
    return json(value ?? { ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({ msg: 'mcp tool failed', tool, error: msg }));
    return { isError: true, content: [{ type: 'text', text: e instanceof CoreError ? msg : 'error' }] };
  }
}

const READ = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;
const DELETE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false } as const;

function opinionOut(o: OpinionView, withMine: boolean) {
  return {
    id: o.id,
    category: o.category,
    group: o.groupName,
    groupId: o.groupId,
    original: o.body,
    sourceLang: o.sourceLang,
    en: o.bodyEn,
    ja: o.bodyJa,
    votes: o.votes,
    ...(withMine ? { mine: o.mine, votedByMe: o.votedByMe } : {}),
    createdAt: o.createdAt,
  };
}

const listFilter = {
  category: z.enum(CATEGORIES).optional().describe(CATEGORY_HELP),
  group_id: z.string().uuid().optional().describe('Only posts from this group'),
  sort: z.enum(['new', 'top']).optional().describe('new = newest first (default), top = most +1 first'),
  limit: z.number().int().min(1).max(500).optional().describe('Max posts to return (default 100)'),
};

function filterOpinions(
  items: OpinionView[],
  f: { category?: string; group_id?: string; sort?: 'new' | 'top'; limit?: number },
) {
  let out = items.filter(
    (o) => (!f.category || o.category === f.category) && (!f.group_id || o.groupId === f.group_id),
  );
  if (f.sort === 'top') out = [...out].sort((a, b) => b.votes - a.votes);
  return out.slice(0, f.limit ?? 100);
}

function registerParticipantTools(server: McpServer, p: participant.Participant) {
  const sessionId = p.session.id;
  // Re-read the session on each call so a status change (open → closed) applies at once.
  const current = async (): Promise<participant.Participant> => {
    const session = await getSession(sessionId);
    if (!session) throw new CoreError('session not found');
    return { ...p, session };
  };

  server.registerTool(
    'get_session',
    {
      title: 'Get the session',
      description:
        'The session this token belongs to: title, whether it accepts posts, its groups (pass a group id to post_opinion), the AI summary if any, and how many posts you have left.',
      annotations: READ,
    },
    () =>
      handle('get_session', async () => {
        const { session } = await current();
        const [groups, mine] = await Promise.all([
          listGroups(sessionId),
          listOpinions(sessionId, { authorKey: p.authorKey }),
        ]);
        return {
          id: session.id,
          title: session.title,
          status: session.status,
          groups: groups.map((g) => ({ id: g.id, name: g.name, language: g.language })),
          categories: CATEGORY_HELP,
          myPosts: mine.filter((o) => o.mine).length,
          maxPostsPerPerson: participant.MAX_OPINIONS_PER_PERSON,
          summary: session.summaryEn ? { en: session.summaryEn, ja: session.summaryJa } : null,
        };
      }),
  );

  server.registerTool(
    'list_opinions',
    {
      title: 'List feedback posts',
      description:
        'Feedback posts on the board, each in the original language plus English and Japanese, with +1 counts. `mine` marks your own posts (you can edit or delete those).',
      inputSchema: { ...listFilter, mine_only: z.boolean().optional().describe('Only your own posts') },
      annotations: READ,
    },
    (args) =>
      handle('list_opinions', async () => {
        const items = await listOpinions(sessionId, { authorKey: p.authorKey, voterKey: p.voterKey });
        return filterOpinions(args.mine_only ? items.filter((o) => o.mine) : items, args).map((o) =>
          opinionOut(o, true),
        );
      }),
  );

  server.registerTool(
    'post_opinion',
    {
      title: 'Post feedback',
      description: `Posts one piece of feedback to the CDK team (one thought per post, at most ${participant.MAX_BODY} characters, Japanese or English). It is shown anonymously and auto-translated. Category: ${CATEGORY_HELP}.`,
      inputSchema: {
        category: z.enum(CATEGORIES),
        body: z.string().min(1).max(participant.MAX_BODY),
        group_id: z
          .string()
          .uuid()
          .optional()
          .describe('Your group (see get_session). May be omitted when the session has a single group.'),
      },
      annotations: WRITE,
    },
    (args) =>
      handle('post_opinion', async () => {
        let groupId = args.group_id;
        if (!groupId) {
          const groups = await listGroups(sessionId);
          if (groups.length !== 1) {
            throw new CoreError(
              `group_id is required; choose one of: ${groups.map((g) => `${g.name} (${g.language}) = ${g.id}`).join(', ')}`,
            );
          }
          groupId = groups[0]!.id;
        }
        return participant.createOpinion(await current(), { groupId, category: args.category, body: args.body });
      }),
  );

  server.registerTool(
    'update_opinion',
    {
      title: 'Edit your feedback',
      description: 'Edits one of your own posts. The text is translated again if it changed.',
      inputSchema: {
        opinion_id: z.string().uuid(),
        category: z.enum(CATEGORIES),
        body: z.string().min(1).max(participant.MAX_BODY),
      },
      annotations: WRITE,
    },
    (args) =>
      handle('update_opinion', async () =>
        participant.updateOpinion(await current(), {
          opinionId: args.opinion_id,
          category: args.category,
          body: args.body,
        }),
      ),
  );

  server.registerTool(
    'delete_opinion',
    {
      title: 'Delete your feedback',
      description: 'Deletes one of your own posts and its +1s.',
      inputSchema: { opinion_id: z.string().uuid() },
      annotations: DELETE,
    },
    (args) => handle('delete_opinion', async () => participant.deleteOpinion(await current(), args.opinion_id)),
  );

  server.registerTool(
    'toggle_vote',
    {
      title: '+1 a post',
      description: 'Adds your +1 to a post, or removes it if you already gave one. Returns whether it is now voted.',
      inputSchema: { opinion_id: z.string().uuid() },
      annotations: { ...WRITE, idempotentHint: false },
    },
    (args) =>
      handle('toggle_vote', async () => participant.toggleVote((await current()).session, p.voterKey, args.opinion_id)),
  );

  server.registerTool(
    'list_people',
    {
      title: 'List attendees',
      description: 'Attendees who shared a profile: name, one-line intro and LinkedIn / X / GitHub links.',
      annotations: READ,
    },
    () =>
      handle('list_people', async () =>
        (await listProfiles(sessionId, p.ownerKey)).map(({ sessionId: _s, ...rest }) => rest),
      ),
  );

  server.registerTool(
    'get_my_profile',
    { title: 'Get your profile', description: 'Your own profile, or null if you have none.', annotations: READ },
    () =>
      handle('get_my_profile', async () => {
        const mine = (await listProfiles(sessionId, p.ownerKey)).find((x) => x.mine);
        return mine ? { ...mine, sessionId: undefined } : null;
      }),
  );

  server.registerTool(
    'save_profile',
    {
      title: 'Save your profile',
      description:
        'Creates or updates your profile, visible to every attendee and deleted a few days after the event. Omitted fields keep their current value; pass an empty string to clear one. Links accept a URL or a handle.',
      inputSchema: {
        name: z.string().max(60).optional().describe('Required when creating the profile'),
        intro: z.string().max(160).optional().describe('One line about yourself'),
        linkedin: z.string().max(300).optional(),
        x: z.string().max(300).optional(),
        github: z.string().max(300).optional(),
      },
      annotations: WRITE,
    },
    (args) =>
      handle('save_profile', async () => {
        const existing = (await listProfiles(sessionId, p.ownerKey)).find((x) => x.mine);
        await participant.saveProfile(await current(), {
          name: args.name ?? existing?.name ?? '',
          intro: args.intro ?? existing?.intro ?? '',
          linkedin: args.linkedin ?? existing?.linkedinUrl ?? '',
          x: args.x ?? existing?.xUrl ?? '',
          github: args.github ?? existing?.githubUrl ?? '',
        });
        return { ok: true, created: !existing };
      }),
  );

  server.registerTool(
    'delete_profile',
    { title: 'Delete your profile', description: 'Removes your profile from the attendee list.', annotations: DELETE },
    () => handle('delete_profile', async () => participant.deleteProfile(await current())),
  );
}

function registerAdminTools(server: McpServer) {
  const sessionArg = { session_id: z.string().min(1).max(32) };

  server.registerTool(
    'admin_list_sessions',
    {
      title: 'List sessions',
      description: 'Every session with its status, groups and post / profile counts.',
      annotations: READ,
    },
    () =>
      handle('admin_list_sessions', async () => {
        const sessions = await listSessions();
        return Promise.all(
          sessions.map(async (s) => {
            const [groups, opinions, people] = await Promise.all([
              listGroups(s.id),
              listOpinions(s.id),
              listProfiles(s.id),
            ]);
            return {
              id: s.id,
              title: s.title,
              status: s.status,
              groups: groups.map((g) => ({ id: g.id, name: g.name, language: g.language })),
              posts: opinions.length,
              profiles: people.length,
              translations: s.translateCount ?? 0,
              summaries: `${s.summaryCount}/${admin.MAX_SUMMARIES_PER_SESSION}`,
              summarizedAt: s.summarizedAt?.toISOString() ?? null,
            };
          }),
        );
      }),
  );

  server.registerTool(
    'admin_list_opinions',
    {
      title: 'List posts of a session',
      description: 'All feedback posts of a session with ids (for admin_delete_opinion).',
      inputSchema: { ...sessionArg, ...listFilter },
      annotations: READ,
    },
    (args) =>
      handle('admin_list_opinions', async () =>
        filterOpinions(await listOpinions(args.session_id), args).map((o) => opinionOut(o, false)),
      ),
  );

  server.registerTool(
    'admin_list_people',
    {
      title: 'List profiles of a session',
      description: 'All attendee profiles of a session with ids (for admin_delete_profile).',
      inputSchema: sessionArg,
      annotations: READ,
    },
    (args) =>
      handle('admin_list_people', async () =>
        (await listProfiles(args.session_id)).map(({ mine: _m, sessionId: _s, ...rest }) => rest),
      ),
  );

  server.registerTool(
    'admin_upsert_session',
    {
      title: 'Create or edit a session',
      description:
        'Creates a session or edits one. When editing, omitted fields keep their value; a new passphrase signs every attendee out of the session (and revokes their MCP tokens).',
      inputSchema: {
        ...sessionArg,
        title: z.string().max(120).optional().describe('Required when creating'),
        passphrase: z.string().max(200).optional().describe('Required when creating; omit to keep'),
        status: z.enum(['open', 'closed']).optional().describe('open accepts posts; closed is read-only'),
      },
      annotations: WRITE,
    },
    (args) =>
      handle('admin_upsert_session', async () => {
        const existing = await getSession(args.session_id);
        return admin.upsertSession({
          id: args.session_id,
          title: args.title ?? existing?.title ?? '',
          passphrase: args.passphrase ?? '',
          status: args.status ?? (existing?.status as 'open' | 'closed' | undefined) ?? 'open',
        });
      }),
  );

  server.registerTool(
    'admin_add_group',
    {
      title: 'Add a group',
      description: 'Adds a table group to a session. language decides the UI language of people who pick it.',
      inputSchema: { ...sessionArg, name: z.string().min(1).max(40), language: z.enum(['ja', 'en']) },
      annotations: WRITE,
    },
    (args) =>
      handle('admin_add_group', () => admin.addGroup(args.session_id, { name: args.name, language: args.language })),
  );

  server.registerTool(
    'admin_delete_group',
    {
      title: 'Delete a group',
      description: 'Deletes a group that has no posts.',
      inputSchema: { ...sessionArg, group_id: z.string().uuid() },
      annotations: DELETE,
    },
    (args) => handle('admin_delete_group', () => admin.deleteGroup(args.session_id, args.group_id)),
  );

  server.registerTool(
    'admin_delete_opinion',
    {
      title: 'Delete any post',
      description: 'Moderation: deletes a post (and its +1s) regardless of who wrote it.',
      inputSchema: { ...sessionArg, opinion_id: z.string().uuid() },
      annotations: DELETE,
    },
    (args) => handle('admin_delete_opinion', () => admin.deleteAnyOpinion(args.session_id, args.opinion_id)),
  );

  server.registerTool(
    'admin_delete_profile',
    {
      title: 'Delete any profile',
      description: 'Moderation: deletes an attendee profile.',
      inputSchema: { ...sessionArg, profile_id: z.string().uuid() },
      annotations: DELETE,
    },
    (args) => handle('admin_delete_profile', () => admin.deleteAnyProfile(args.session_id, args.profile_id)),
  );

  server.registerTool(
    'admin_run_summary',
    {
      title: 'Run the AI summary',
      description: `Summarizes every post of a session with the summary model and shows it on the board and screen. Capped at ${admin.MAX_SUMMARIES_PER_SESSION} runs per session.`,
      inputSchema: sessionArg,
      annotations: { ...WRITE, openWorldHint: true },
    },
    (args) => handle('admin_run_summary', () => admin.runSummary(args.session_id)),
  );

  server.registerTool(
    'admin_clear_summary',
    {
      title: 'Clear the AI summary',
      description: 'Hides the AI summary of a session.',
      inputSchema: sessionArg,
      annotations: WRITE,
    },
    (args) => handle('admin_clear_summary', () => admin.clearSummary(args.session_id)),
  );

  server.registerTool(
    'admin_export',
    {
      title: 'Export a session report',
      description: 'The Markdown report of a session (same as the export on the admin page): summary and every post.',
      inputSchema: sessionArg,
      annotations: READ,
    },
    async (args) => {
      try {
        const session = await getSession(args.session_id);
        if (!session) throw new CoreError('session not found');
        const [groups, opinions] = await Promise.all([listGroups(session.id), listOpinions(session.id)]);
        return { content: [{ type: 'text', text: toMarkdown(session, groups, opinions) }] };
      } catch (e) {
        return handle('admin_export', () => Promise.reject(e));
      }
    },
  );

  server.registerTool(
    'admin_delete_session_data',
    {
      title: 'Delete a whole session',
      description:
        'Permanently deletes a session with all its groups, posts, +1s and profiles. Cannot be undone. Pass the session id again as confirm_session_id.',
      inputSchema: { ...sessionArg, confirm_session_id: z.string() },
      annotations: DELETE,
    },
    (args) =>
      handle('admin_delete_session_data', () => admin.deleteSessionData(args.session_id, args.confirm_session_id)),
  );
}

export function createMcpServer(caller: Caller): McpServer {
  const instructions =
    caller.kind === 'admin'
      ? 'CDK Lover admin tools: manage sessions, groups, moderation and AI summaries for the CDK Lover feedback board. Confirm with the user before any delete.'
      : `CDK Lover feedback board for session "${caller.participant.session.title}". Attendees post anonymous feedback about AWS CDK (auto-translated between Japanese and English), +1 each other's posts, and share a short profile. Post one thought per post, in the user's own words; ask the user before posting on their behalf.`;
  const server = new McpServer({ name: 'cdk-lover', version: '1.0.0' }, { instructions });
  if (caller.kind === 'admin') registerAdminTools(server);
  else registerParticipantTools(server, caller.participant);
  return server;
}
