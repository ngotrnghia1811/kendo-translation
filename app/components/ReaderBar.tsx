"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/htv-types";

// Bar of the reader pages (unit RC1, round 63). Links: all books, the human-translation-view for translators and admins, the admin pages for admins.
// The reader pages are for reading only: the bar has no write action except Sign out.
// Unit VW105 (Q-A 3:60.4 row 1): the name of the person is a link to the profile page /profile. `onProfile` marks that page: "All books" is then a link and the name is the current page.
export default function ReaderBar({ name, email, role, approved, backHref, onProfile = false }: { name: string; email: string; role: Role; approved: boolean; backHref?: string; onProfile?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function out() {
    setBusy(true);
    await fetch("/api/htv/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    router.push("/sign-in");
    router.refresh();
  }
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line pb-2 text-sm" data-reader-bar>
      <nav aria-label="Reader links" className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href="/read" className={backHref || onProfile ? "text-accent underline" : "font-semibold"}>
          All books
        </Link>
        {backHref ? (
          <Link href={backHref} className="text-accent underline">
            Book page
          </Link>
        ) : null}
        {role !== "reader" ? (
          <Link href="/translate" className="text-accent underline">
            Human translation
          </Link>
        ) : null}
        {role === "admin" ? (
          <>
            <Link href="/admin/readers" className="text-accent underline" data-admin-link>
              Readers
            </Link>
            <Link href="/admin/versions" className="text-accent underline" data-admin-link>
              Human versions
            </Link>
          </>
        ) : null}
      </nav>
      <div className="flex items-center gap-3">
        <span data-user>
          <Link href="/profile" className={onProfile ? "font-semibold" : "text-accent underline"} aria-current={onProfile ? "page" : undefined} data-profile-link>
            {name || email}
          </Link>{" "}
          ({role}
          {role === "reader" && !approved ? ", waits for approval" : ""})
        </span>
        <button type="button" onClick={out} disabled={busy} className="rounded border border-line px-2 py-0.5 disabled:opacity-50">
          Sign out
        </button>
      </div>
    </div>
  );
}
