import { cache } from "react";
import type { Metadata } from "next";
import MonitorDashboard from "@/components/MonitorDashboard";
import { loadMonitor } from "@/lib/book-status";
import { tabTitle } from "@/lib/book-status-rules";
import { frontDoor, monitorEnabled } from "@/lib/monitor";

export const dynamic = "force-dynamic";

// One read for the title and the page of the same request.
const load = cache(() => loadMonitor());

// Unit VW77a (round 80), VISION-viewer 15.24.4.1: the tab title shows the count of Needs attention, for example "(1) Monitor dashboard".
// The browser also changes document.title after each poll (components/MonitorDashboard.tsx). With the monitor off, the title stays as the layout sets it.
export async function generateMetadata(): Promise<Metadata> {
  if (!(await monitorEnabled())) return {};
  return { title: tabTitle((await load()).summary.counts["Needs attention"]) };
}

// Round 43 answer 6 (Q-A l110) and round 44 answer 13 (Q-A l142): tab Runs is the first screen.
// Round 58 answer 7 (Q-A 2026-10-28 l205): with the monitor off, this first page sends the visitor on.
// Unit RC4 (round 68 answer 4, round 69 answer 11): the visitor goes by the sign-in state and the role: /sign-in, /read, or /translate (lib/monitor.ts).
// Unit VW77a (round 80), VISION-viewer 15.24.4: "/" shows the Monitor dashboard. The old runs table moved to /runs (tab Lists).
export default async function MonitorPage() {
  const door = await frontDoor();
  if (door) return <p role="alert" className="text-red-700">{door.down}</p>;
  return <MonitorDashboard initial={await load()} />;
}
