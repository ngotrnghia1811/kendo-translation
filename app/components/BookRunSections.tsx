"use client";
import Link from "next/link";
import StepView from "./StepView";
import { TrainingMonitor } from "./TrainingMonitor";
import type { RunTabKey } from "@/lib/tabs";

// Unit VW85 (round 91), Q-A 3:26.3 (a): "The run view of a book-run list shows the same tree and the training monitor, as for phase 2."
// The run view /runs/<stamp> of a book-run list (progress.json kind "book-run" with a real book, translator_run.py:3290-3293).
// Self-contained sections with their own data-* markers. Unit VW99 (Q-A 3:27.3): each section shows in its own tab of the run view,
// the same tabs as for a phase 2 list (components/RunView.tsx). `open`: the open tab. The tab "Pages" has no section here.
// Readable names (Q-A 3:17.4): the book title in the heading, the slug in the link to the step view.
export default function BookRunSections({ stamp, book, title, open }: { stamp: string; book: string; title: string | null; open: RunTabKey }) {
  if (open === "training") return <TrainingMonitor stamp={stamp} book={book} />;
  if (open === "updates")
    return (
      <section data-run-updates data-run-updates-book={book}>
        <StepView initial={null} list={stamp} book={book} showTree={false} showUpdates />
      </section>
    );
  if (open !== "steps") return null;
  return (
    <section data-run-steps data-run-steps-book={book}>
      <h2 className="section-band mb-1 text-lg font-semibold">Steps of this book run{title ? `: ${title}` : ""}</h2>
      <p className="mb-2 text-sm text-muted">
        The same tree as the step view{" "}
        <Link href={`/monitor/${book}/steps`} className="underline">
          /monitor/{book}/steps
        </Link>
        : all lists of this run, in run order across restarts.
      </p>
      <StepView initial={null} list={stamp} book={book} />
    </section>
  );
}
