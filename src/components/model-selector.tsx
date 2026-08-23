"use client";

import { useEffect, useMemo, useState } from "react";
import { ModelCard } from "@/components/model-card";
import type { Model } from "@/lib/models";
import { DEFAULT_LABS, PRESETS, resolvePreset } from "@/lib/presets";

export function ModelSelector({
  models,
  onStart,
  initialSelected,
}: {
  models: Model[];
  onStart: (selected: Model[]) => void;
  initialSelected?: Model[];
}) {
  const [search, setSearch] = useState("");
  const [labFilter, setLabFilter] = useState<string>("all");
  const [onlyDefaultLabs, setOnlyDefaultLabs] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set((initialSelected ?? []).map((m) => m.id)),
  );
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const _initialKey = (initialSelected ?? [])
    .map((m) => m.id)
    .sort()
    .join("|");
  useEffect(() => {
    if (initialSelected && initialSelected.length > 0) {
      setSelectedIds(new Set(initialSelected.map((m) => m.id)));
    }
  }, [initialSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  const labs = useMemo(() => {
    const s = new Set(models.map((m) => m.providerId));
    return ["all", ...Array.from(s).sort()];
  }, [models]);

  const filtered = useMemo(() => {
    return models.filter((m) => {
      if (onlyDefaultLabs && !DEFAULT_LABS.has(m.providerId)) return false;
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
  }, [
    models,
    search,
    labFilter,
    onlyDefaultLabs,
    selectedIds,
    showOnlySelected,
  ]);

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

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const resolved = resolvePreset(preset, models);
    setSelectedIds(new Set(resolved.map((m) => m.id)));
  };

  const togglePreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const resolved = resolvePreset(preset, models);
    const ids = resolved.map((m) => m.id);
    const allSelected =
      ids.length > 0 && ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (allSelected) {
        for (const id of ids) n.delete(id);
      } else {
        for (const id of ids) n.add(id);
      }
      return n;
    });
  };

  const _appendPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const resolved = resolvePreset(preset, models);
    setSelectedIds((prev) => {
      const n = new Set(prev);
      for (const m of resolved) n.add(m.id);
      return n;
    });
  };

  const activePresetIds = useMemo(() => {
    const active = new Set<string>();
    for (const p of PRESETS) {
      const ids = resolvePreset(p, models).map((m) => m.id);
      if (ids.length > 0 && ids.every((id) => selectedIds.has(id))) {
        active.add(p.id);
      }
    }
    return active;
  }, [models, selectedIds]);

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 py-6 flex flex-col gap-4">
      {/* header */}
      <div className="border border-zinc-800 bg-[#1a1a1a] p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-black tracking-tighter leading-none text-white">
              MODELS.TIERLIST
            </h1>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              Select models → make a tier list
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs font-mono border border-zinc-700 px-2 py-1 bg-zinc-900 text-zinc-300">
              {selectedIds.size} SELECTED / {models.length} TOTAL
            </div>
            <button
              type="button"
              onClick={() => onStart(selectedModels)}
              disabled={selectedIds.size < 2}
              className="px-6 py-2 bg-white text-black font-black text-sm tracking-widest disabled:opacity-30 hover:bg-zinc-200 transition-colors"
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

        {/* presets */}
        <div className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-widest text-zinc-300">
              PRESETS — MIX ANY
            </h2>
            <span className="text-[10px] font-mono text-zinc-500">
              click to toggle (mix) • shift+click to replace
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => {
              const count = resolvePreset(p, models).length;
              const active = activePresetIds.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={(e) => {
                    if (e.shiftKey) applyPreset(p.id);
                    else togglePreset(p.id);
                  }}
                  className={`group border px-2.5 py-1.5 text-left transition-colors ${
                    active
                      ? "bg-white border-white"
                      : "bg-zinc-900 border-zinc-700 hover:bg-white hover:border-white"
                  }`}
                  title={`${p.description} (${count} models) — click to toggle, shift+click to replace. ${
                    active ? "ACTIVE" : ""
                  }`}
                >
                  <div
                    className={`text-xs font-bold tracking-wide leading-none ${
                      active
                        ? "text-black"
                        : "text-white group-hover:text-black"
                    }`}
                  >
                    {p.label}
                    {active ? " ✓" : ""}
                  </div>
                  <div
                    className={`text-[10px] font-mono leading-none mt-0.5 ${
                      active
                        ? "text-zinc-600"
                        : "text-zinc-400 group-hover:text-zinc-600"
                    }`}
                  >
                    {count} models
                  </div>
                </button>
              );
            })}
          </div>
          {activePresetIds.size > 1 && (
            <div className="text-[10px] font-mono text-zinc-400">
              Mixing {activePresetIds.size} presets → {selectedIds.size} unique
              models
            </div>
          )}
        </div>

        {/* controls */}
        <div className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search model, lab, id..."
              className="flex-1 min-w-[200px] border border-zinc-700 bg-black px-3 py-2 text-sm font-mono outline-none focus:border-zinc-500 text-white placeholder:text-zinc-500"
            />
            <select
              value={labFilter}
              onChange={(e) => setLabFilter(e.target.value)}
              className="border border-zinc-700 bg-black px-3 py-2 text-sm font-mono text-white min-w-[140px]"
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
              type="button"
              onClick={selectAllFiltered}
              className="border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200 hover:bg-white hover:text-black transition-colors font-bold"
            >
              SELECT FILTERED ({filtered.length})
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-300 hover:bg-white hover:text-black transition-colors"
            >
              CLEAR
            </button>
            <span className="text-zinc-600 mx-1">|</span>
            <button
              type="button"
              onClick={() => quickPick(8)}
              className="border border-zinc-800 px-2 py-1 bg-transparent text-zinc-400 hover:bg-white hover:text-black transition-colors"
            >
              RAND 8
            </button>
            <button
              type="button"
              onClick={() => quickPick(16)}
              className="border border-zinc-800 px-2 py-1 bg-transparent text-zinc-400 hover:bg-white hover:text-black transition-colors"
            >
              RAND 16
            </button>
            <button
              type="button"
              onClick={() => quickPick(24)}
              className="border border-zinc-800 px-2 py-1 bg-transparent text-zinc-400 hover:bg-white hover:text-black transition-colors"
            >
              RAND 24
            </button>
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-zinc-300 ml-2">
              <input
                type="checkbox"
                checked={onlyDefaultLabs}
                onChange={(e) => setOnlyDefaultLabs(e.target.checked)}
                className="w-4 h-4 border border-zinc-700 accent-white bg-black"
              />
              DEFAULT 17 LABS
            </label>
            <label className="ml-auto flex items-center gap-1.5 cursor-pointer select-none text-zinc-300">
              <input
                type="checkbox"
                checked={showOnlySelected}
                onChange={(e) => setShowOnlySelected(e.target.checked)}
                className="w-4 h-4 border border-zinc-700 accent-white bg-black"
              />
              SHOW SELECTED ONLY
            </label>
          </div>
        </div>
      </div>

      {/* grid */}
      <div className="border border-zinc-800 bg-[#1a1a1a] p-1">
        <div className="flex flex-wrap gap-1.5 bg-[#121212] p-2 min-h-[380px] content-start">
          {sorted.length === 0 ? (
            <div className="w-full py-20 text-center text-sm font-mono text-zinc-500">
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
        <div className="px-2 py-2 flex items-center justify-between border-t border-zinc-800 bg-[#1a1a1a] text-xs font-mono">
          <span className="text-zinc-500">
            {filtered.length} shown · {selectedIds.size} selected · Click to
            toggle • Shift+click presets to add
          </span>
          <span className="hidden sm:inline text-zinc-600">
            MODELS.DEV · minimal
          </span>
        </div>
      </div>
    </div>
  );
}
