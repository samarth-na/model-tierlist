"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ModelSelector } from "@/components/model-selector";
import { deleteHistory, type HistoryEntry, loadHistory } from "@/lib/history";
import { loadBoard, mergeSelectionIntoBoard, saveBoard, createBoardFromSelection } from "@/lib/board-storage";
import type { Model } from "@/lib/models";

export function SelectorClient({ models }: { models: Model[] }) {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [boardSelectionIds, setBoardSelectionIds] = useState<string[] | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
    const board = loadBoard();
    if (board) setBoardSelectionIds(board.selectionIds);
    else setBoardSelectionIds([]);
  }, []);

  const refreshHistory = () => setHistory(loadHistory());

  const initialSelected = useMemo(() => {
    if (boardSelectionIds === null) return [];
    if (boardSelectionIds.length === 0) return [];
    const byId = new Map(models.map((m) => [m.id, m] as const));
    return boardSelectionIds.map((id) => byId.get(id)).filter((x): x is Model => !!x);
  }, [models, boardSelectionIds]);

  const boardHasContent = useMemo(() => {
    const board = loadBoard();
    if (!board) return false;
    return board.selectionIds.length > 0;
  }, [boardSelectionIds]);

  const handleStart = (selected: Model[]) => {
    const ids = selected.map((m) => m.id);
    const existing = loadBoard();
    let next;
    if (existing) {
      next = mergeSelectionIntoBoard(existing, ids);
    } else {
      next = createBoardFromSelection(ids);
    }
    saveBoard(next);
    refreshHistory();
    router.push("/board");
  };

  const handleContinue = () => {
    router.push("/board");
  };

  const handleRestore = (entry: HistoryEntry) => {
    const byId = new Map(models.map((m) => [m.id, m] as const));
    const sel = entry.selectionIds.map((id) => byId.get(id)).filter((x): x is Model => !!x);
    // prime board storage so board page picks it up
    const board = {
      v: 2 as const,
      tiers: entry.tiers,
      pool: entry.pool,
      selectionIds: entry.selectionIds,
      updatedAt: new Date().toISOString(),
    };
    saveBoard(board);
    setBoardSelectionIds(entry.selectionIds);
    router.push("/board");
  };

  const handleDeleteHistory = (id: string) => {
    deleteHistory(id);
    refreshHistory();
  };

  // show loading until boardSelectionIds resolved to avoid flash
  if (boardSelectionIds === null) {
    return (
      <div className="w-full max-w-[1100px] mx-auto px-4 py-6">
        <div className="border border-zinc-800 bg-[#1a1a1a] p-8 text-center text-sm font-mono text-zinc-500">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {boardHasContent && (
        <div className="w-full max-w-[1100px] mx-auto px-4 pt-6">
          <div className="border border-zinc-800 bg-[#1a1a1a] p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-widest text-white">YOU HAVE A SAVED BOARD — {initialSelected.length} models</span>
              <span className="text-[10px] font-mono text-zinc-400">Your tier placements are saved. Continue editing or pick a new selection below (it will preserve your tiers).</span>
            </div>
            <button
              type="button"
              onClick={handleContinue}
              className="px-6 py-2 bg-white text-black font-black text-sm tracking-widest hover:bg-zinc-200 transition-colors"
            >
              CONTINUE BOARD →
            </button>
          </div>
        </div>
      )}
      <ModelSelector models={models} initialSelected={initialSelected} onStart={handleStart} />
      {history.length > 0 && (
        <div className="w-full max-w-[1100px] mx-auto px-4 pb-6">
          <div className="border border-zinc-800 bg-[#1a1a1a] p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold tracking-widest text-zinc-300">HISTORY — {history.length} saved</h2>
              <span className="text-[10px] font-mono text-zinc-500">auto-saved, never lost</span>
            </div>
            <div className="flex flex-col gap-1.5 max-h-[320px] overflow-auto pr-1">
              {history.map((e) => (
                <div key={e.id} className="flex items-center justify-between border border-zinc-800 bg-zinc-900 px-2 py-1.5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{e.title}</span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {new Date(e.updatedAt).toLocaleString()} • {e.selectionIds.length} models • {e.tiers.length} tiers
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleRestore(e)}
                      className="px-2 py-1 bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
                    >
                      RESTORE
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHistory(e.id)}
                      className="px-2 py-1 border border-zinc-700 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
