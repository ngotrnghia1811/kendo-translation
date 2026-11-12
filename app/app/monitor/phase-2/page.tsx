import Link from "next/link";
import StepView from "@/components/StepView";
import { requireMonitor } from "@/lib/monitor";
import { dataRoot } from "@/lib/config";
import { loadStepSummary } from "@/lib/step-tree-load";

export const dynamic = "force-dynamic";

// Unit VW95 (round 91), Q-A 3:17.6 and 3:19.3 D1: the step view /monitor/phase-2 of the phase 2 run, opened by the link "Steps" in the phase 2 row
// of the Monitor dashboard / on this Mac. This static route wins over /monitor/[slug] (Next.js sorts static segments before dynamic ones).
export default async function Phase2StepsPage() {
  await requireMonitor();
  const initial = await loadStepSummary(await dataRoot(), null, new Set());
  return (
    <section>
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Monitor dashboard
      </Link>
      <h1 data-steps-heading className="mt-2 mb-1 text-xl font-semibold">
        Steps of the phase 2 run
      </h1>
      <p className="mb-4 text-sm text-muted">
        One line per page in run order. Open a page to see its steps: input, grid levels 0 to 3, loss function, backward pass, prompt update. Open a step to see its data.
      </p>
      <StepView initial={initial} list={null} />
    </section>
  );
}
