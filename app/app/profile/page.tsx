import ProfileBookmarks from "@/components/ProfileBookmarks";
import ProfileName from "@/components/ProfileName";
import ProfilePassword from "@/components/ProfilePassword";
import ProfileProgress from "@/components/ProfileProgress";
import ReaderBar from "@/components/ReaderBar";
import { requireReaderSession } from "@/lib/htv-session";
import { profileCtx } from "@/lib/profile-api";
import { loadProfile } from "@/lib/profile-load";
import { PROFILE_TITLE, ROLE_WORD, approvalText, joinDate } from "@/lib/profile-rules";
import { WAITING } from "@/lib/reader-types";

export const dynamic = "force-dynamic";

// Profile page /profile for every role (unit VW105, Q-A 3:58.2 "Design it now", 3:58.3 "Basic plus reading" and "Like v1, with stats", 3:60.4 "Accept all rows", 3:60.5 "4 cards, own for staff").
// No session sends the visitor to /sign-in, which returns here (requireReaderSession). The page shows:
//   cards          Books started, Bookmarks, Member since, and Own translations for translators and admins
//   Account        e-mail (read only), display name (edit and Save), role, approval, join date
//   Change password
//   Continue reading, Bookmarks
// A reader who waits for approval sees the account part and the password part. The cards and the reading parts say WAITING (no read call is made for them).
// An error in one part shows a short message in that part, and the rest of the page stays.
export default async function ProfilePage() {
  const s = await requireReaderSession("/profile");
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;
  const data = await loadProfile(await profileCtx(s.token), s.user);
  const u = data.user;
  const waiting = (
    <p role="status" className="rounded border border-line bg-white p-3 text-sm" data-waiting>
      {WAITING}
    </p>
  );
  return (
    <>
      <ReaderBar name={u.name} email={u.email} role={u.role} approved={u.approved} onProfile />
      <h1 className="mb-3 text-2xl font-semibold">{PROFILE_TITLE}</h1>
      <div className="mb-5" data-profile-cards>
        {data.waiting ? (
          waiting
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.cards.map((c) => (
              <li key={c.id} data-card={c.id} className="rounded border border-line bg-white p-3">
                <p className="text-sm text-muted">{c.label}</p>
                <p className="text-2xl font-semibold" data-card-value>
                  {c.value}
                </p>
                <p className="text-xs text-muted">{c.note}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section aria-labelledby="profile-account" className="rounded border border-line bg-white p-4" data-profile-account>
            <h2 id="profile-account" className="mb-2 text-lg font-semibold">
              Account
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">E-mail</dt>
              <dd className="min-w-0 break-all" data-account-email>
                {u.email}
              </dd>
              <dt className="text-muted">Role</dt>
              <dd>
                <span className="rounded border border-line px-1.5 text-xs" data-role-badge={u.role}>
                  {ROLE_WORD[u.role]}
                </span>
              </dd>
              <dt className="text-muted">Approval</dt>
              <dd data-account-approval>{approvalText(u.role, u.approved)}</dd>
              <dt className="text-muted">Joined</dt>
              <dd data-account-joined>{data.created ? `${joinDate(data.created)} (PST)` : "not known"}</dd>
            </dl>
            <ProfileName initial={u.name} />
          </section>
          <section aria-labelledby="profile-password" className="rounded border border-line bg-white p-4" data-profile-password>
            <h2 id="profile-password" className="mb-2 text-lg font-semibold">
              Change password
            </h2>
            <ProfilePassword />
          </section>
        </div>
        <div className="space-y-6">
          <section aria-labelledby="profile-progress" className="rounded border border-line bg-white p-4" data-profile-progress>
            <h2 id="profile-progress" className="mb-2 text-lg font-semibold">
              Continue reading
            </h2>
            {data.waiting ? waiting : <ProfileProgress rows={data.progress.rows} total={data.progress.total} titles={data.titles} error={data.progress.error} />}
          </section>
          <section aria-labelledby="profile-bookmarks" className="rounded border border-line bg-white p-4" data-profile-bookmarks>
            <h2 id="profile-bookmarks" className="mb-2 text-lg font-semibold">
              Bookmarks
            </h2>
            {data.waiting ? waiting : <ProfileBookmarks rows={data.bookmarks.rows} total={data.bookmarks.total} titles={data.titles} error={data.bookmarks.error} />}
          </section>
        </div>
      </div>
    </>
  );
}
