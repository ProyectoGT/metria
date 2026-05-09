import { loadHoyData } from "@/modules/hoy/services/queries";
import HoyPanelClient from "./hoy-client";

export default async function HoyPage() {
  const hoyData = await loadHoyData();

  return <HoyPanelClient hoyData={hoyData} />;
}
