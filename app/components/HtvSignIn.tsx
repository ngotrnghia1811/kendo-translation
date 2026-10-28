"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Sign-in form. Round 54 answer 10 (Q-A 2026-10-28 l129): the form posts to the login route, and the route sets an httpOnly cookie.
// The browser code never reads the token. The password stays in this form until the post.
export default function HtvSignIn({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/htv/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "Sign-in failed.");
        setPassword("");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("The app did not answer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-sm space-y-3 rounded border border-line bg-white/70 p-5">
      <h1 className="text-lg font-semibold">Sign in to the human-translation-view</h1>
      <label className="block text-sm">
        Email
        <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded border border-line bg-white p-2" />
      </label>
      <label className="block text-sm">
        Password
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded border border-line bg-white p-2" />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="w-full rounded bg-accent px-3 py-2 font-semibold text-white disabled:opacity-50">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
