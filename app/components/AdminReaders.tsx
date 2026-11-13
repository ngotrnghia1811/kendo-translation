"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminUser } from "@/lib/pb";
import { pstDay } from "@/lib/htv-pst"; // unit TF83: PST on /admin (round 82 answer 14)

// Admin page of the accounts (unit RC1, round 63 answer 4, Q-A 2026-10-28 l308). A reader that waits for approval is listed first, with Approve.
// An admin can also remove the approval, disable an account, and enable it again. The route checks the admin role. PocketBase checks it again.
export default function AdminReaders({ users, me }: { users: AdminUser[]; me: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const waiting = users.filter((u) => u.role === "reader" && !u.approved && !u.disabled);
  const others = users.filter((u) => !waiting.includes(u));

  async function act(id: string, changes: { approved?: boolean; disabled?: boolean }) {
    setBusy(id);
    setError("");
    try {
      const r = await fetch("/api/admin/readers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...changes }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setError(j.error ?? "The change failed.");
      else router.refresh();
    } finally {
      setBusy("");
    }
  }

  const btn = "min-h-[36px] rounded border border-line px-2 py-0.5 text-sm disabled:opacity-50";
  return (
    <div data-admin-readers>
      {error ? <p role="alert" className="mb-2 text-sm text-red-700">{error}</p> : null}
      <section className="mb-6" aria-labelledby="waiting-h">
        <h2 id="waiting-h" className="section-band mb-2 text-lg font-semibold">
          Readers that wait for approval ({waiting.length})
        </h2>
        {waiting.length === 0 ? <p className="text-sm text-muted" data-none-waiting>No reader waits for approval.</p> : null}
        <ul className="space-y-2">
          {waiting.map((u) => (
            <li key={u.id} data-waiting-user={u.email} className="flex flex-wrap items-center gap-3 rounded border border-line bg-white p-3 text-sm">
              <span className="font-medium">{u.name || "(no name)"}</span>
              <span className="text-muted">{u.email}</span>
              <span className="text-muted">signed up {pstDay(u.created) || u.created.slice(0, 10)}</span>
              <span className="ml-auto flex gap-2">
                <button type="button" disabled={busy === u.id} onClick={() => void act(u.id, { approved: true })} data-approve className={btn + " bg-accent font-semibold text-white"}>
                  Approve
                </button>
                <button type="button" disabled={busy === u.id} onClick={() => void act(u.id, { disabled: true })} data-disable className={btn}>
                  Disable
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="all-h">
        <h2 id="all-h" className="section-band mb-2 text-lg font-semibold">
          All other accounts ({others.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-1 pr-3">Name</th>
                <th className="py-1 pr-3">Email</th>
                <th className="py-1 pr-3">Role</th>
                <th className="py-1 pr-3">State</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {others.map((u) => (
                <tr key={u.id} className="border-b border-line/60" data-user-row={u.email}>
                  <td className="py-1 pr-3">{u.name}</td>
                  <td className="py-1 pr-3">{u.email}</td>
                  <td className="py-1 pr-3">{u.role}</td>
                  <td className="py-1 pr-3">{u.disabled ? "disabled" : u.role === "reader" ? (u.approved ? "approved" : "waits") : "active"}</td>
                  <td className="flex gap-2 py-1">
                    {u.role === "reader" && u.approved && !u.disabled ? (
                      <button type="button" disabled={busy === u.id} onClick={() => void act(u.id, { approved: false })} className={btn}>
                        Remove approval
                      </button>
                    ) : null}
                    {u.id !== me ? (
                      <button type="button" disabled={busy === u.id} onClick={() => void act(u.id, { disabled: !u.disabled })} className={btn}>
                        {u.disabled ? "Enable" : "Disable"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
