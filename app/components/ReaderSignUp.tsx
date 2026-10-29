"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Sign-up form of the reader pages (unit RC1, round 63 answer 4, Q-A 2026-10-28 l308: "Reader role, not approved").
// The form posts to /api/read/sign-up, then signs in at once. The new account is a reader that waits for approval by an admin.
// The password stays in this form until the post. The browser code never reads a token.
export default function ReaderSignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const r = await post("/api/read/sign-up", { name, email, password });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "The account was not created.");
        setPassword("");
        return;
      }
      const l = await post("/api/htv/login", { email, password });
      setPassword("");
      if (!l.ok) {
        setError("The account exists. Sign in with the new password.");
        router.push("/sign-in");
        return;
      }
      router.push("/read");
      router.refresh();
    } catch {
      setError("The app did not answer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-sm space-y-3 rounded border border-line bg-white/70 p-5" data-sign-up>
      <h1 className="text-lg font-semibold">Create an account to read</h1>
      <p className="text-sm text-muted">You see the list of books at once. An admin opens the page text after a check of your account.</p>
      <label className="block text-sm">
        Name
        <input required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded border border-line bg-white p-2" />
      </label>
      <label className="block text-sm">
        Email
        <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded border border-line bg-white p-2" />
      </label>
      <label className="block text-sm">
        Password (8 characters or more)
        <input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded border border-line bg-white p-2" />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="w-full rounded bg-accent px-3 py-2 font-semibold text-white disabled:opacity-50">
        {busy ? "Creating…" : "Create account"}
      </button>
      <p className="text-sm">
        Already have an account? <Link href="/sign-in" className="text-accent underline">Sign in</Link>
      </p>
    </form>
  );
}
