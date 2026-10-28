"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/htv-types";

// Sign-in state bar of the human-translation-view (round 54 answer 9, Q-A 2026-10-28 l128: sign-in on this view only).
const ROLE_LABEL: Record<Role, string> = { admin: "admin", translator: "translator", reader: "reader" };

export default function HtvBar({ name, email, role, backHref }: { name: string; email: string; role: Role; backHref?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function out() {
    setBusy(true);
    await fetch("/api/htv/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    router.push("/translate/sign-in");
    router.refresh();
  }
  return (
    <div className="mb-3 flex items-center justify-between border-b border-line pb-2 text-sm">
      <div>{backHref ? <Link href={backHref} className="text-accent underline">All pages</Link> : null}</div>
      <div className="flex items-center gap-3">
        <span data-user>
          Signed in as <span className="font-medium">{name || email}</span> ({ROLE_LABEL[role]})
        </span>
        <button type="button" onClick={out} disabled={busy} className="rounded border border-line px-2 py-0.5 disabled:opacity-50">
          Sign out
        </button>
      </div>
    </div>
  );
}
