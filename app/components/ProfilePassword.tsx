"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AFTER_PASSWORD_PATH, PASSWORD_MIN, passwordProblem } from "@/lib/profile-rules";

// Password form of the profile page (unit VW105, Q-A 3:60.4 row 3): the old password, then the new one twice, at least 8 characters.
// PocketBase checks the old password. After a change PocketBase ends the old sign-ins, so the route clears the cookie and this form opens the sign-in page.
// The fields have type password. This file never writes a password to a log or a console line.
// The form has noValidate: the checks of lib/profile-rules.ts give the plain messages in English, not the tooltips of the browser.
export default function ProfilePassword() {
  const router = useRouter();
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const bad = passwordProblem(oldPassword, newPassword, again);
    if (bad) {
      setMsg({ ok: false, text: bad });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, newPasswordAgain: again }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; next?: string };
      if (!r.ok) {
        setMsg({ ok: false, text: j.error ?? "The password was not changed." });
        setOld("");
        return;
      }
      setOld("");
      setNew("");
      setAgain("");
      setMsg({ ok: true, text: "Password changed. Opening the sign-in page…" });
      router.push(j.next ?? AFTER_PASSWORD_PATH);
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "The app did not answer. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-2" data-password-form>
      <label className="block text-sm">
        Old password
        <input type="password" name="oldPassword" required autoComplete="current-password" value={oldPassword} onChange={(e) => setOld(e.target.value)} className="mt-1 w-full rounded border border-line bg-white p-2" data-old-password />
      </label>
      <label className="block text-sm">
        New password ({PASSWORD_MIN} characters or more)
        <input type="password" name="newPassword" required minLength={PASSWORD_MIN} autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} className="mt-1 w-full rounded border border-line bg-white p-2" data-new-password />
      </label>
      <label className="block text-sm">
        New password again
        <input type="password" name="newPasswordAgain" required minLength={PASSWORD_MIN} autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className="mt-1 w-full rounded border border-line bg-white p-2" data-new-password-again />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="min-h-[44px] rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 md:min-h-0" data-password-save>
          {busy ? "Changing…" : "Change password"}
        </button>
        {msg ? (
          <p role={msg.ok ? "status" : "alert"} className={"text-sm " + (msg.ok ? "text-green-800" : "text-red-700")} data-password-message>
            {msg.text}
          </p>
        ) : null}
      </div>
      <p className="text-xs text-muted">After the change you sign in again with the new password.</p>
    </form>
  );
}
