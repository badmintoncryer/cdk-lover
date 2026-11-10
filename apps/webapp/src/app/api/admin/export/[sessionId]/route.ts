import { getSession, listOpinions } from '@/lib/data';
import { isAdmin } from '@/lib/identity';
import { toCsv, toMarkdown } from '@/lib/report';

export async function GET(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  if (!(await isAdmin())) return new Response('unauthorized', { status: 401 });
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) return new Response('not found', { status: 404 });
  const opinions = await listOpinions(sessionId);
  const format = new URL(req.url).searchParams.get('format');
  if (format === 'csv') {
    return new Response(toCsv(opinions), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cdk-lovers-${sessionId}.csv"`,
      },
    });
  }
  return new Response(toMarkdown(session, opinions), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="cdk-lovers-${sessionId}.md"`,
    },
  });
}
