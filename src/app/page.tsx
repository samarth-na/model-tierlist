import { fetchModels } from "@/lib/models";
import { HomeClient } from "./home-client";

export const revalidate = 3600;

export default async function Home() {
  const models = await fetchModels().catch(() => []);
  return <HomeClient models={models} />;
}
