'use client';

import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { joinSession } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PublicNotice } from '@/components/PublicNotice';
import { t, type Lang } from '@/lib/i18n';

/** Joining only needs the passphrase: people move between tables on the day, so there is no group to pick. */
export function JoinPanel({ lang, sessionId }: { lang: Lang; sessionId: string }) {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState('');
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await joinSession({ sessionId, passphrase });
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
          <h2 className="font-semibold leading-tight">{t(lang, 'joinTitle')}</h2>
          {/* Walk-up attendees land here first, so this doubles as the session's intro slide. */}
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            <li>{t(lang, 'joinIntro1')}</li>
            <li>{t(lang, 'joinIntro2')}</li>
            <li>{t(lang, 'joinIntro3')}</li>
          </ol>
          <p className="mt-2 text-sm text-muted-foreground">{t(lang, 'joinHint')}</p>
        </div>
        <PublicNotice>{t(lang, 'publicJoin')}</PublicNotice>

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
          <Button type="submit" size="lg" disabled={pending || !passphrase.trim()} className="sm:h-10">
            <LogIn />
            {t(lang, 'join')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
