"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NAME_MAX, cleanName, nameProblem } from "@/lib/profile-rules";

// Name field of the profile page (unit VW105, Q-A 3:60.4 row 2). The page sends the name only. It cannot change the role, the approval, or "disabled".
// The form has noValidate: the checks of lib/profile-rules.ts give the plain messages in English, not the tooltips of the browser.
export default function ProfileName({ initial }: { initial: string }) {
  const router = useRouter();
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const clean = cleanName(name);
    const bad = nameProblem(clean);
    if (bad) {
      setMsg({ ok: false, text: bad });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/profile/name", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: clean }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string; name?: string };
      if (!r.ok) {
        setMsg({ ok: false, text: j.error ?? "The name was not saved." });
        return;
      }
      setName(j.name ?? clean);
      setMsg({ ok: true, text: "Name saved." });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "The app did not answer. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="mt-3 space-y-2" data-name-form>
      <label className="block text-sm">
        Display name
        <input
          type="text"
          name="displayName"
          required
          maxLength={NAME_MAX}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-line bg-white p-2"
          data-name-input
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="min-h-[44px] rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 md:min-h-0" data-name-save>
          {busy ? "Saving…" : "Save"}
        </button>
        {msg ? (
          <p role={msg.ok ? "status" : "alert"} className={"text-sm " + (msg.ok ? "text-green-800" : "text-red-700")} data-name-message>
            {msg.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
