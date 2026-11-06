import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { participantKeys } from '@/lib/core/participant';
import { getSession } from '@/lib/data';
import { createMcpServer, type Caller } from '@/lib/mcp/server';
import { isAdminToken, parseParticipantToken, tokenFromRequest, verifyParticipantToken } from '@/lib/mcp-token';
import { getMcpAdminToken, getSigningKey } from '@/lib/secrets';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ token?: string[] }> };

/** Stateless Streamable HTTP: every POST is self-contained, so no MCP session id is kept. */
async function caller(req: Request, { params }: Params): Promise<Caller | undefined> {
  const token = tokenFromRequest(req, (await params).token?.[0]);
  if (!token) return undefined;
  const claims = parseParticipantToken(token);
  if (claims) {
    // Unknown sessions fail before any signature work, so junk tokens cost one indexed read.
    const session = await getSession(claims.sessionId);
    if (!session) return undefined;
    const key = await getSigningKey();
    if (!verifyParticipantToken(key, token, session.passphraseHash)) return undefined;
    return { kind: 'participant', participant: { session, ...participantKeys(key, claims.participantId) } };
  }
  return isAdminToken(token, await getMcpAdminToken()) ? { kind: 'admin' } : undefined;
}

function rpcError(status: number, message: string, headers: Record<string, string> = {}) {
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32001, message }, id: null },
    { status, headers: { 'cache-control': 'no-store', ...headers } },
  );
}

export async function POST(req: Request, ctx: Params) {
  let who: Caller | undefined;
  try {
    who = await caller(req, ctx);
  } catch (e) {
    console.error(JSON.stringify({ msg: 'mcp auth failed', error: String(e) }));
    return rpcError(500, 'internal error');
  }
  if (!who) {
    return rpcError(401, 'invalid or expired token: get a new one from the board ("Use from AI")', {
      'www-authenticate': 'Bearer',
    });
  }
  const server = createMcpServer(who);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    // JSON responses are complete once returned; release the per-request server.
    void server.close();
  }
}

// No server-initiated streams or sessions in stateless mode.
const notAllowed = () => rpcError(405, 'method not allowed', { allow: 'POST' });
export const GET = notAllowed;
export const DELETE = notAllowed;
