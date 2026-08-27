import { fetchModels } from "@/lib/models";
import { SelectorClient } from "@/components/selector-client";

export const revalidate = 3600;

export default async function Home() {
  const models = await fetchModels().catch(() => []);
  return <SelectorClient models={models} />;
}
