import Link from 'next/link';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { SessionForm } from '@/components/admin/SessionForm';
import { listSessions } from '@/lib/data';
import { isAdmin } from '@/lib/identity';
import { adminLogout } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto max-w-sm px-4 py-16">
        <AdminLogin />
      </main>
    );
  }
  const sessions = await listSessions();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CDK Lover admin</h1>
        <form action={adminLogout}>
          <button className="text-sm underline">Log out</button>
        </form>
      </div>
      <section className="space-y-2">
        <h2 className="font-semibold">Sessions</h2>
        {sessions.length === 0 && <p className="text-sm text-slate-500">No sessions yet. Create one below.</p>}
        <ul className="divide-y rounded-xl border bg-white">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium">{s.title}</div>
                <div className="text-xs text-slate-500">
                  /s/{s.id} · {s.status}
                </div>
              </div>
              <Link href={`/admin/${s.id}`} className="rounded-lg bg-slate-900 px-3 py-1 text-sm text-white">
                Manage
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">New session</h2>
        <SessionForm />
      </section>
    </main>
  );
}
