"use client";
import Link from "next/link";
import StepView from "./StepView";
import { TrainingMonitor } from "./TrainingMonitor";
import { RawId } from "./Named";

// Unit VW85 (round 91), Q-A 3:26.3 (a): "The run view of a book-run list shows the same tree and the training monitor, as for phase 2."
// The run view /runs/<stamp> of a book-run list (progress.json kind "book-run" with a real book, translator_run.py:3290-3293).
// The same order as for a phase 2 list (components/RunView.tsx): the training monitor first, then the step tree with the prompt updates.
// Two self-contained sections with their own data-* markers, so that a later unit (VW99, tabs) can move them.
// Readable names (Q-A 3:17.4): the book title, the slug in small grey text.
export default function BookRunSections({ stamp, book, title }: { stamp: string; book: string; title: string | null }) {
  return (
    <>
      <TrainingMonitor stamp={stamp} book={book} />
      <section data-run-steps data-run-steps-book={book} className="mt-6">
        <h2 className="mb-1 flex flex-wrap items-baseline gap-x-2 text-lg font-semibold">
          <span>Steps of this book run{title ? `: ${title}` : ""}</span>
          <RawId>{book}</RawId>
        </h2>
        <p className="mb-2 text-sm text-muted">
          The same tree as the step view{" "}
          <Link href={`/monitor/${book}/steps`} className="underline">
            /monitor/{book}/steps
          </Link>
          : all lists of this run, in run order across restarts.
        </p>
        <StepView initial={null} list={stamp} book={book} showUpdates />
      </section>
    </>
  );
}
