import type { Metadata } from "next";
import AdminReaders from "@/components/AdminReaders";
import ReaderBar from "@/components/ReaderBar";
import { requireAdmin } from "@/lib/htv-session";
import { adminUsers } from "@/lib/pb";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Readers (admin)" };

// Admin page of the accounts (unit RC1, round 63 answer 4). Only the admin role opens it. Other signed-in roles go to /read, visitors go to /sign-in.
export default async function AdminReadersPage() {
  const s = await requireAdmin("/admin/readers");
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;
  const users = await adminUsers(s.token);
  return (
    <>
      <ReaderBar name={s.user.name} email={s.user.email} role={s.user.role} approved={s.user.approved} />
      <h1 className="mb-4 text-2xl font-semibold">Readers</h1>
      <AdminReaders users={users} me={s.user.id} />
    </>
  );
}
