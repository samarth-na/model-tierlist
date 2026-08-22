"use client";

import { useMemo, useState } from "react";
import { ModelCard } from "@/components/model-card";
import type { Model } from "@/lib/models";

export function ModelSelector({
  models,
  onStart,
}: {
  models: Model[];
  onStart: (selected: Model[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [labFilter, setLabFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const labs = useMemo(() => {
    const s = new Set(models.map((m) => m.providerId));
    return ["all", ...Array.from(s).sort()];
  }, [models]);

  const filtered = useMemo(() => {
    return models.filter((m) => {
      if (labFilter !== "all" && m.providerId !== labFilter) return false;
      if (showOnlySelected && !selectedIds.has(m.id)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.providerId.toLowerCase().includes(q) ||
        m.family?.toLowerCase().includes(q)
      );
    });
  }, [models, search, labFilter, selectedIds, showOnlySelected]);

  // sort: selected first
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const as = selectedIds.has(a.id) ? 0 : 1;
      const bs = selectedIds.has(b.id) ? 0 : 1;
      if (as !== bs) return as - bs;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, selectedIds]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectedModels = useMemo(
    () => models.filter((m) => selectedIds.has(m.id)),
    [models, selectedIds],
  );

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      for (const m of filtered) n.add(m.id);
      return n;
    });
  };

  const clearAll = () => setSelectedIds(new Set());

  const quickPick = (n: number) => {
    const pick = [...models].sort(() => Math.random() - 0.5).slice(0, n);
    setSelectedIds(new Set(pick.map((m) => m.id)));
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 py-6 flex flex-col gap-4">
      {/* header */}
      <div className="border-2 border-black bg-white p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-black tracking-tighter leading-none">
              MODELS.TIERLIST
            </h1>
            <p className="text-sm font-mono text-zinc-600 mt-1">
              Select models → make a tier list — sharp, minimal, no bullshit.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs font-mono border-2 border-black px-2 py-1 bg-zinc-100">
              {selectedIds.size} SELECTED / {models.length} TOTAL
            </div>
            <button
              onClick={() => onStart(selectedModels)}
              disabled={selectedIds.size < 2}
              className="px-6 py-2 bg-black text-white font-black text-sm tracking-widest border-2 border-black disabled:opacity-30 hover:bg-zinc-800 transition-colors"
            >
              START TIER LIST →
            </button>
            {selectedIds.size < 2 && (
              <span className="text-[10px] font-mono text-zinc-500">
                Pick at least 2
              </span>
            )}
          </div>
        </div>

        {/* controls */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search model, lab, id..."
              className="flex-1 min-w-[200px] border-2 border-black px-3 py-2 text-sm font-mono outline-none focus:bg-zinc-50"
            />
            <select
              value={labFilter}
              onChange={(e) => setLabFilter(e.target.value)}
              className="border-2 border-black px-3 py-2 text-sm font-mono bg-white min-w-[140px]"
            >
              {labs.map((lab) => (
                <option key={lab} value={lab}>
                  {lab === "all" ? "ALL LABS" : lab.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <button
              onClick={selectAllFiltered}
              className="border-2 border-black px-2 py-1 bg-white hover:bg-black hover:text-white transition-colors font-bold"
            >
              SELECT FILTERED ({filtered.length})
            </button>
            <button
              onClick={clearAll}
              className="border-2 border-black px-2 py-1 bg-white hover:bg-black hover:text-white transition-colors"
            >
              CLEAR
            </button>
            <span className="text-zinc-400 mx-1">|</span>
            <button
              onClick={() => quickPick(8)}
              className="border border-black px-2 py-1 bg-white hover:bg-black hover:text-white transition-colors"
            >
              RAND 8
            </button>
            <button
              onClick={() => quickPick(16)}
              className="border border-black px-2 py-1 bg-white hover:bg-black hover:text-white transition-colors"
            >
              RAND 16
            </button>
            <button
              onClick={() => quickPick(24)}
              className="border border-black px-2 py-1 bg-white hover:bg-black hover:text-white transition-colors"
            >
              RAND 24
            </button>
            <label className="ml-auto flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOnlySelected}
                onChange={(e) => setShowOnlySelected(e.target.checked)}
                className="w-4 h-4 border-2 border-black accent-black"
              />
              SHOW SELECTED ONLY
            </label>
          </div>
        </div>
      </div>

      {/* grid */}
      <div className="border-2 border-black bg-white p-2">
        <div className="flex flex-wrap gap-2 bg-zinc-100 p-2 min-h-[400px] content-start">
          {sorted.length === 0 ? (
            <div className="w-full py-20 text-center text-sm font-mono text-zinc-400">
              No models match filters.
            </div>
          ) : (
            sorted.map((m) => (
              <ModelCard
                key={m.id}
                model={m}
                draggable={false}
                selected={selectedIds.has(m.id)}
                onClick={() => toggle(m.id)}
                size="pool"
              />
            ))
          )}
        </div>
        <div className="px-2 py-2 flex items-center justify-between border-t-2 border-black mt-2 bg-white text-xs font-mono">
          <span className="text-zinc-600">
            {filtered.length} shown · {selectedIds.size} selected · Click card
            to toggle — logo + name + version visible in tier
          </span>
          <span className="hidden sm:inline text-zinc-400">
            MODELS.DEV · sharp borders · minimal
          </span>
        </div>
      </div>
    </div>
  );
}
