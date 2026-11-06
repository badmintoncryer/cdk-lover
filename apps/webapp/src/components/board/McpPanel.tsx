'use client';

import { Bot, Copy } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createMcpToken } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { t, type Lang } from '@/lib/i18n';

function CopyField({ lang, label, value }: { lang: Lang; label: string; value: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t(lang, 'copied'));
    } catch {
      toast.error(t(lang, 'error'));
    }
  };
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-start gap-2">
        <code className="min-w-0 flex-1 rounded-md border bg-muted px-2 py-1.5 font-mono text-xs break-all select-all">
          {value}
        </code>
        <Button type="button" size="sm" variant="outline" onClick={copy} aria-label={t(lang, 'copy')}>
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** Issues a personal MCP token so an AI client can post and read as this browser. */
export function McpPanel({ lang, sessionId }: { lang: Lang; sessionId: string }) {
  const [token, setToken] = useState<string>();
  const [pending, start] = useTransition();

  const issue = () =>
    start(async () => {
      const res = await createMcpToken(sessionId);
      if (!res.ok) return void toast.error(t(lang, 'error'));
      setToken(res.token);
    });

  const base = typeof window === 'undefined' ? '' : `${window.location.origin}/api/mcp`;

  return (
    <Card className="space-y-3 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Bot className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        <div>
          <h2 className="font-semibold leading-tight">{t(lang, 'mcpTitle')}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t(lang, 'mcpHint')}</p>
        </div>
      </div>
      {token ? (
        <div className="space-y-3">
          <CopyField lang={lang} label={t(lang, 'mcpUrl')} value={`${base}/${token}`} />
          <CopyField
            lang={lang}
            label={t(lang, 'mcpCli')}
            value={`claude mcp add --transport http cdk-lover "${base}/${token}"`}
          />
          <p className="text-xs text-muted-foreground">{t(lang, 'mcpWarn')}</p>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={issue} disabled={pending}>
          {t(lang, 'mcpIssue')}
        </Button>
      )}
    </Card>
  );
}
