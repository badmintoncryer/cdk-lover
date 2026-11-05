import { notFound } from 'next/navigation';
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
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section>
        {joined ? (
          <ProfileForm lang={lang} sessionId={sessionId} profile={mine} />
        ) : (
          <p className="rounded-xl border bg-white p-4 text-sm text-slate-500">{t(lang, 'joinToAddProfile')}</p>
        )}
      </section>
      <section>
        <h2 className="mb-3 font-bold">
          {t(lang, 'people')} ({people.length})
        </h2>
        {people.length === 0 ? (
          <p className="text-slate-400">{t(lang, 'noProfiles')}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {people.map((p) => (
              <li
                key={p.id}
                className={`rounded-xl border bg-white p-4 shadow-sm ${p.mine ? 'border-orange-400' : ''}`}
              >
                <div className="font-semibold">{p.name}</div>
                {p.intro && <p className="mt-1 text-sm text-slate-600 break-words">{p.intro}</p>}
                <div className="mt-3 flex gap-2 text-xs">
                  {p.linkedinUrl && <SocialLink href={p.linkedinUrl} label="LinkedIn" className="bg-[#0a66c2]" />}
                  {p.xUrl && <SocialLink href={p.xUrl} label="X" className="bg-black" />}
                  {p.githubUrl && <SocialLink href={p.githubUrl} label="GitHub" className="bg-slate-700" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SocialLink({ href, label, className }: { href: string; label: string; className: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`rounded-full px-3 py-1 text-white ${className}`}
    >
      {label}
    </a>
  );
}
