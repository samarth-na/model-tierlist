"use client";

import { useEffect, useRef, useState } from "react";
import { ModelSelector } from "@/components/model-selector";
import { TierBoard } from "@/components/tier-board";
import { deleteHistory, type HistoryEntry, loadHistory } from "@/lib/history";
import { loadLastSelection, saveLastSelection } from "@/lib/last-selection";
import type { Model } from "@/lib/models";

export function HomeClient({ models }: { models: Model[] }) {
  const [selected, setSelected] = useState<Model[]>([]);
  const [view, setView] = useState<"selector" | "board">("selector");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const restoredRef = useRef(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // restore last selection on first mount so the saved board re-loads
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const ids = loadLastSelection();
    if (ids.length === 0) return;
    const byId = new Map(models.map((m) => [m.id, m] as const));
    const sel = ids.map((id) => byId.get(id)).filter((x): x is Model => !!x);
    if (sel.length > 0) setSelected(sel);
  }, [models]);

  const refreshHistory = () => setHistory(loadHistory());

  const handleStart = (m: Model[]) => {
    setSelected(m);
    saveLastSelection(m.map((x) => x.id));
    setView("board");
    // history will be created by TierBoard on mount
    setTimeout(refreshHistory, 300);
  };

  const handleBack = () => {
    setView("selector");
    refreshHistory();
  };

  const handleSelectionChange = (next: Model[]) => {
    setSelected(next);
    saveLastSelection(next.map((m) => m.id));
  };

  const handleRestore = (entry: HistoryEntry) => {
    // reconstruct selection from history entry's selectionIds
    const byId = new Map(models.map((m) => [m.id, m] as const));
    const sel = entry.selectionIds
      .map((id) => byId.get(id))
      .filter((x): x is Model => !!x);
    // also need to restore tiers? For now restore selection and go to board; TierBoard will load from localStorage per selectionKey, but history entry's tiers are not auto-restored.
    // Instead, we will store tiers in entry and TierBoard will be seeded from history if we pass entry id? Simpler: set selected and also seed localStorage for TierBoard
    try {
      // prime the draft storage so TierBoard picks it up
      const key = "models-tierlist-v1";
      const selectionKey = [...sel]
        .map((m) => m.id)
        .sort()
        .join("|");
      const draft = {
        v: 1,
        selectionKey,
        tiers: entry.tiers,
        pool: entry.pool,
      };
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {}
    saveLastSelection(sel.map((m) => m.id));
    setSelected(sel);
    setView("board");
  };

  const handleDeleteHistory = (id: string) => {
    deleteHistory(id);
    refreshHistory();
  };

  if (view === "board") {
    return (
      <TierBoard
        initialModels={selected}
        allModels={models}
        onBack={handleBack}
        onSelectionChange={handleSelectionChange}
        onHistoryChange={refreshHistory}
      />
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <ModelSelector
        models={models}
        initialSelected={selected}
        onStart={handleStart}
      />
      {history.length > 0 && (
        <div className="w-full max-w-[1100px] mx-auto px-4">
          <div className="border border-zinc-800 bg-[#1a1a1a] p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold tracking-widest text-zinc-300">
                HISTORY — {history.length} saved
              </h2>
              <span className="text-[10px] font-mono text-zinc-500">
                auto-saved, never lost
              </span>
            </div>
            <div className="flex flex-col gap-1.5 max-h-[320px] overflow-auto pr-1">
              {history.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between border border-zinc-800 bg-zinc-900 px-2 py-1.5"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">
                      {e.title}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {new Date(e.updatedAt).toLocaleString()} •{" "}
                      {e.selectionIds.length} models • {e.tiers.length} tiers
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
