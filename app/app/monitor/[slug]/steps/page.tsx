import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import StepView from "@/components/StepView";
import { RawId } from "@/components/Named";
import { requireMonitor } from "@/lib/monitor";
import { dataRoot } from "@/lib/config";
import { isSafeSegment } from "@/lib/safe-path";
import { loadBookDetail } from "@/lib/book-detail";
import { loadStepSummary } from "@/lib/step-tree-load";
import { PHASE2_BOOK } from "@/lib/phase2-articles";
import { bookStore } from "@/lib/run-store";

export const dynamic = "force-dynamic";

// Unit VW85 (round 91), Q-A 3:26.3 (a): "The step view and the training monitor work for a book run too. The Details view `/monitor/<book>`
// gets the links "Steps" and "Training monitor"." This is the step view of the current run of one book, opened by the link "Steps".
// The same not-found rule as the Details view /monitor/<slug>: a slug that is not safe, or not in the book set, gives "not found".
// The book "paired-dataset" is the phase 2 store, so its address goes to the step view /monitor/phase-2.
// Readable names (Q-A 3:17.4): the book title first, the slug in small grey text.
export default async function BookStepsPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireMonitor();
  const { slug } = await params;
  if (!isSafeSegment(slug)) notFound();
  if (slug === PHASE2_BOOK) redirect("/monitor/phase-2");
  const detail = await loadBookDetail(slug);
  if (!detail) notFound();
  const initial = await loadStepSummary(await dataRoot(), null, new Set(), bookStore(slug));
  const title = detail.row.title && detail.row.title !== slug ? detail.row.title : null;
  return (
    <section>
      <Link href={`/monitor/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Details of {title ?? slug}
      </Link>
      <h1 data-steps-heading className="mt-2 mb-1 flex flex-wrap items-baseline gap-x-2 text-xl font-semibold">
        <span>Steps of the book run{title ? `: ${title}` : ""}</span>
        <RawId>{slug}</RawId>
      </h1>
      <p className="mb-4 text-sm text-muted">
        One line per page in run order. Open a page to see its steps: input, grid levels 0 to 3, loss function, backward pass, prompt update. Open a step to see its data.
      </p>
      <StepView initial={initial} list={null} book={slug} showUpdates />
    </section>
  );
}
