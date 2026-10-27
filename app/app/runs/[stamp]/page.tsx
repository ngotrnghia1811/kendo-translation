import { notFound } from "next/navigation";
import RunView from "@/components/RunView";
import { getRun } from "@/lib/runs";
import { isSafeSegment } from "@/lib/safe-path";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ stamp: string }> }) {
  const { stamp } = await params;
  if (!isSafeSegment(stamp)) notFound();
  const run = await getRun(stamp);
  if (!run) notFound();
  return <RunView initial={run} />;
}
