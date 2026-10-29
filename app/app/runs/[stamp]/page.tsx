import { notFound } from "next/navigation";
import RunView from "@/components/RunView";
import { getRun } from "@/lib/runs";
import { isSafeSegment } from "@/lib/safe-path";
import { requireMonitor } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ stamp: string }> }) {
  await requireMonitor(); // Round 58 answer 7 (Q-A 2026-10-28 l205): monitor off gives "not found".
  const { stamp } = await params;
  if (!isSafeSegment(stamp)) notFound();
  const run = await getRun(stamp);
  if (!run) notFound();
  return <RunView initial={run} />;
}
