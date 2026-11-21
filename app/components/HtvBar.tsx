"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/htv-types";
import ViewAsSelect from "./ViewAsSelect";

// Sign-in state bar of the human-translation-view (round 54 answer 9, Q-A 2026-10-28 l128: sign-in on this view only).
// Unit VW105 (Q-A 3:61.2 "Same links in both bars"): the bar has the links of the Reader bar (components/ReaderBar.tsx): "Read" (/read),
// "Readers" and "Human versions" for an admin, and the name of the person as the link to the profile page /profile (Q-A 3:60.4 row 1).
// The landing page after sign-in does not change: a translator and an admin land on /translate.
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
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line pb-2 text-sm" data-htv-bar>
      <nav aria-label="Translator links" className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {backHref ? (
          <Link href={backHref} className="text-accent underline">
            All books
          </Link>
        ) : null}
        <Link href="/read" className="text-accent underline" data-read-link>
          Read
        </Link>
        {role === "admin" ? (
          <>
            <Link href="/admin/readers" className="text-accent underline" data-admin-link>
              Readers
            </Link>
            <Link href="/admin/versions" className="text-accent underline" data-admin-link>
              Human versions
            </Link>
            {/* Unit VW118 (Q-A 3:99.5 row 7): the list of the visual issues. */}
            <Link href="/admin/issues" className="text-accent underline" data-admin-link>
              Visual issues
            </Link>
            {/* Unit VW120 (Q-A 3:106.5 row 1): the page of the view-only links. */}
            <Link href="/admin/links" className="text-accent underline" data-admin-link>
              Links
            </Link>
          </>
        ) : null}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        {/* Unit VW119 (Q-A 3:103.5 row 1): the select "View as" shows for an admin only (the component decides from the layout context). */}
        <ViewAsSelect />
        <span data-user>
          Signed in as{" "}
          <Link href="/profile" className="font-medium text-accent underline" data-profile-link>
            {name || email}
          </Link>{" "}
          ({ROLE_LABEL[role]})
        </span>
        <button type="button" onClick={out} disabled={busy} className="rounded border border-line px-2 py-0.5 disabled:opacity-50">
          Sign out
        </button>
      </div>
    </div>
  );
}
