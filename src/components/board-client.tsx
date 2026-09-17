"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TierBoard } from "@/components/tier-board";
import { loadBoard, saveBoard } from "@/lib/board-storage";
import type { Model } from "@/lib/models";
import { loadHistory } from "@/lib/history";

export function BoardClient({ models }: { models: Model[] }) {
  const router = useRouter();
  const [initialModels, setInitialModels] = useState<Model[] | null>(null);
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => {
    const board = loadBoard();
    if (!board || board.selectionIds.length === 0) {
      setInitialModels([]);
      return;
    }
    const byId = new Map(models.map((m) => [m.id, m] as const));
    const sel = board.selectionIds.map((id) => byId.get(id)).filter((x): x is Model => !!x);
    // if some ids not found (e.g. models removed), still use what we have
    setInitialModels(sel);
  }, [models]);

  // keep history in sync for TierBoard's onHistoryChange
  const handleHistoryChange = () => setHistoryTick((x) => x + 1);

  const handleBack = () => {
    router.push("/");
  };

  const handleSelectionChange = (next: Model[]) => {
    // TierBoard already persists the updated board (pool+tiers) to board-storage
    // via its own save effect. But we must also update initialModels so the
    // prop stays in sync — otherwise TierBoard's additive-sync effect sees
    // added models as "no longer selected" and instantly removes them again
    // (and re-adds unselected ones to the pool).
    setInitialModels(next);
  };

  if (initialModels === null) {
    return (
      <div className="w-full max-w-[1100px] mx-auto px-4 py-6">
        <div className="border border-zinc-800 bg-[#1a1a1a] p-8 text-center text-sm font-mono text-zinc-500">Loading board…</div>
      </div>
    );
  }

  if (initialModels.length === 0) {
    return (
      <div className="w-full max-w-[1100px] mx-auto px-4 py-10 flex flex-col gap-4">
        <div className="border border-zinc-800 bg-[#1a1a1a] p-8 text-center flex flex-col gap-3">
          <h1 className="text-lg font-black tracking-tighter text-white">NO BOARD YET</h1>
          <p className="text-xs font-mono text-zinc-400">Select models first to create a tier list.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mx-auto px-6 py-2 bg-white text-black font-black text-sm tracking-widest hover:bg-zinc-200 transition-colors"
          >
            GO TO SELECTOR →
          </button>
        </div>
      </div>
    );
  }

  return (
    <TierBoard
      initialModels={initialModels}
      allModels={models}
      onBack={handleBack}
      onSelectionChange={handleSelectionChange}
      onHistoryChange={handleHistoryChange}
    />
  );
}
