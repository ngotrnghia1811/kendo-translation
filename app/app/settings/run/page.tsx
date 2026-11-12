import { requireMonitor } from "@/lib/monitor";
import { readSettings } from "@/lib/settings-run";
import RunSettingsForm from "@/components/RunSettingsForm";
import { stringifySettingsJson } from "@/lib/settings-json";
import { loadPageLabels } from "@/lib/readable-load";
export const dynamic = "force-dynamic";
export default async function RunSettingsPage() {
  await requireMonitor();
  const snapshot = await readSettings();
  // Unit VW96 (Q-A 3:17.4): the article title and "page n of m" for the active pages. The form shows the page ID in small grey text next to it.
  const pageLabels = await loadPageLabels(snapshot.active.flatMap((a) => [a.page, a.next]));
  return <RunSettingsForm initialText={stringifySettingsJson(snapshot)} pageLabels={pageLabels} />;
}
