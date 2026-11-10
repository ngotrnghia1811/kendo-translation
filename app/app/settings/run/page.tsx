import { requireMonitor } from "@/lib/monitor";
import { readSettings } from "@/lib/settings-run";
import RunSettingsForm from "@/components/RunSettingsForm";
import { stringifySettingsJson } from "@/lib/settings-json";
export const dynamic = "force-dynamic";
export default async function RunSettingsPage() {
  await requireMonitor();
  return <RunSettingsForm initialText={stringifySettingsJson(await readSettings())} />;
}
