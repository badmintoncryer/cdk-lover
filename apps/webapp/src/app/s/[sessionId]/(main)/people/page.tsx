import { notFound } from 'next/navigation';
import Link from 'next/link';
import { OrganizerCard, PeopleList } from '@/components/people/PeopleList';
import { ProfileForm } from '@/components/people/ProfileForm';
import { getSession, listProfiles } from '@/lib/data';
import { getLang, isJoined, keyFor } from '@/lib/identity';
import { t } from '@/lib/i18n';

export default async function PeoplePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) notFound();
  const [lang, joined, ownerKey] = await Promise.all([
    getLang(),
    isJoined(sessionId, session.passphraseHash),
    keyFor('profile'),
  ]);
  const people = await listProfiles(sessionId, ownerKey);
  const mine = people.find((p) => p.mine);

  return (
    <div className="space-y-5">
      <OrganizerCard lang={lang} />
      <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
        <section className="lg:sticky lg:top-20">
          {joined ? (
            // Keyed so the form resets after the profile is saved or deleted elsewhere.
            <ProfileForm key={mine?.id ?? 'new'} lang={lang} sessionId={sessionId} profile={mine} />
          ) : (
            <Link
              href={`/s/${sessionId}`}
              className="block rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground transition-colors hover:border-slate-400 hover:text-foreground"
            >
              {t(lang, 'joinToAddProfile')} →
            </Link>
          )}
        </section>
        <PeopleList lang={lang} people={people} />
      </div>
    </div>
  );
}
