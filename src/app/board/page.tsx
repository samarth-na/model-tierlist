import { fetchModels } from "@/lib/models";
import { BoardClient } from "@/components/board-client";

export const revalidate = 3600;

export default async function BoardPage() {
  const models = await fetchModels().catch(() => []);
  return <BoardClient models={models} />;
}
