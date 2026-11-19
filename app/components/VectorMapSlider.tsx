"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { markNavigating } from "@/lib/loading-rule";

// Unit VW106, Q-A 3:64.5 row 3: "A version slider." The slider opens the address of the chosen prompt version.
// The page renders on the server, so the slider only changes the address. The links "Earlier" and "Later" work without a script.

export default function VectorMapSlider({ versions, index, hrefs }: { versions: string[]; index: number; hrefs: string[] }) {
  const router = useRouter();
  const [at, setAt] = useState(index);
  if (versions.length === 0) return null;
  const go = (i: number) => {
    setAt(i);
    markNavigating();
    router.push(hrefs[i]);
  };
  return (
    <div data-vm-slider className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <label htmlFor="vm-version" className="font-semibold">
        Prompt version
      </label>
      {index > 0 ? (
        <a data-vm-earlier href={hrefs[index - 1]} className="underline underline-offset-2">
          ← Earlier
        </a>
      ) : null}
      <input
        id="vm-version"
        type="range"
        min={0}
        max={versions.length - 1}
        step={1}
        value={at}
        aria-valuetext={versions[at]}
        onChange={(e) => go(Number(e.target.value))}
        className="w-40 min-w-0 flex-1 accent-[var(--title)] sm:max-w-80"
      />
      {index < versions.length - 1 ? (
        <a data-vm-later href={hrefs[index + 1]} className="underline underline-offset-2">
          Later →
        </a>
      ) : null}
      <span data-vm-version className="font-mono">
        {versions[at]} ({at + 1} of {versions.length})
      </span>
    </div>
  );
}
