'use client';

import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { joinSession, setLang } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PublicNotice } from '@/components/PublicNotice';
import type { GroupRow } from '@/lib/data';
import { isLang, t, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function JoinPanel({ lang, sessionId, groups }: { lang: Lang; sessionId: string; groups: GroupRow[] }) {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState('');
  // Preselect the first group in the reader's language; most rooms are split by language.
  const [groupId, setGroupId] = useState(groups.find((g) => g.language === lang)?.id ?? groups[0]?.id ?? '');
  const [pending, start] = useTransition();

  // Groups are split by language, so picking one switches the UI to that language right away.
  const pick = (g: GroupRow) => {
    setGroupId(g.id);
    if (isLang(g.language) && g.language !== lang)
      start(async () => {
        await setLang(g.language);
        router.refresh();
      });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await joinSession({ sessionId, passphrase, groupId });
      if (!res.ok) {
        toast.error(res.error === 'wrong passphrase' ? t(lang, 'wrongPassphrase') : t(lang, 'error'));
        return;
      }
      toast.success(t(lang, 'joined'));
      router.refresh();
    });
  };

  return (
    <Card className="overflow-hidden">
      <form onSubmit={submit} className="space-y-4 p-4 sm:p-5">
        <div>
          <div>
            <h2 className="font-semibold leading-tight">{t(lang, 'joinTitle')}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t(lang, 'joinHint')}</p>
          </div>
        </div>
        <PublicNotice>{t(lang, 'publicJoin')}</PublicNotice>

        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 text-sm font-medium">{t(lang, 'yourGroup')}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {groups.map((g) => (
              <label
                key={g.id}
                className={cn(
                  'flex h-11 cursor-pointer items-center justify-between gap-2 rounded-lg border bg-card px-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40',
                  groupId === g.id ? 'border-slate-900 bg-secondary' : 'hover:bg-secondary',
                )}
              >
                <input
                  type="radio"
                  name="group"
                  value={g.id}
                  checked={groupId === g.id}
                  onChange={() => pick(g)}
                  className="sr-only"
                />
                <span className="font-mono font-medium">{g.name}</span>
                <span className="text-xs text-muted-foreground">{g.language === 'ja' ? '日本語' : 'English'}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block flex-1 space-y-1.5 text-sm font-medium">
            <span>{t(lang, 'passphrase')}</span>
            <Input
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              required
            />
          </label>
          <Button type="submit" size="lg" disabled={pending || !groupId || !passphrase.trim()} className="sm:h-10">
            <LogIn />
            {t(lang, 'join')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
