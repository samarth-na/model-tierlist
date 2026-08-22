"use client";

import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ModelCard } from "@/components/model-card";
import { TierRow } from "@/components/tier-row";
import { DEFAULT_TIERS, type Model, type Tier } from "@/lib/models";

const STORAGE_KEY = "models-tierlist-v1";

type SavedState = {
  v: 1;
  selectionKey: string;
  tiers: { id: string; label: string; color: string; items: string[] }[];
  pool: string[];
};

function selectionKey(models: Model[]) {
  return [...models]
    .map((m) => m.id)
    .sort()
    .join("|");
}

export function TierBoard({
  initialModels,
  onBack,
}: {
  initialModels: Model[];
  onBack: () => void;
}) {
  const [tiers, setTiers] = useState<Tier[]>(
    DEFAULT_TIERS.map((t) => ({ ...t, items: [] })),
  );
  const [pool, setPool] = useState<Model[]>(initialModels);
  const [dragged, setDragged] = useState<Model | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{
    tierId: string;
    beforeId: string | null;
  } | null>(null);
  const [poolSearch, setPoolSearch] = useState("");
  const boardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const didLoadRef = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!didLoadRef.current) return;
    const placed = new Set(tiers.flatMap((t) => t.items.map((m) => m.id)));
    const _freshPool = initialModels.filter((m) => !placed.has(m.id));
    const currentIds = new Set(
      [...pool, ...tiers.flatMap((t) => t.items)].map((m) => m.id),
    );
    const nextIds = new Set(initialModels.map((m) => m.id));
    const same =
      currentIds.size === nextIds.size &&
      [...currentIds].every((id) => nextIds.has(id));
    if (!same) {
      setPool(initialModels);
      setTiers(DEFAULT_TIERS.map((t) => ({ ...t, items: [] })));
    }
  }, [initialModels, pool, tiers.flatMap]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SavedState;
        if (
          saved?.v === 1 &&
          saved.selectionKey === selectionKey(initialModels)
        ) {
          const byId = new Map(initialModels.map((m) => [m.id, m] as const));
          const mapIds = (ids: string[]) =>
            ids.map((id) => byId.get(id)).filter((x): x is Model => !!x);
          const restoredTiers: Tier[] = saved.tiers.map((t) => ({
            id: t.id,
            label: t.label,
            color: t.color,
            items: mapIds(t.items),
          }));
          const restoredPool = mapIds(saved.pool);
          const restoredIds = new Set([
            ...restoredPool.map((m) => m.id),
            ...restoredTiers.flatMap((t) => t.items.map((m) => m.id)),
          ]);
          if (
            restoredIds.size === initialModels.length &&
            initialModels.every((m) => restoredIds.has(m.id))
          ) {
            setTiers(restoredTiers);
            setPool(restoredPool);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      didLoadRef.current = true;
      setIsHydrated(true);
    }
  }, [initialModels]);

  useEffect(() => {
    if (!didLoadRef.current) return;
    try {
      const state: SavedState = {
        v: 1,
        selectionKey: selectionKey(initialModels),
        tiers: tiers.map((t) => ({
          id: t.id,
          label: t.label,
          color: t.color,
          items: t.items.map((m) => m.id),
        })),
        pool: pool.map((m) => m.id),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [tiers, pool, initialModels]);

  const filteredPool = useMemo(() => {
    const q = poolSearch.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.providerId.toLowerCase().includes(q) ||
        m.family?.toLowerCase().includes(q),
    );
  }, [pool, poolSearch]);

  const handleDragStart = (
    e: React.DragEvent,
    model: Model,
    sourceId: string,
  ) => {
    setDragged(model);
    setDragSource(sourceId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", model.id);
    setTimeout(() => {
      (e.target as HTMLElement).classList.add("dragging");
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove("dragging");
    setDragged(null);
    setDragSource(null);
    setDropHint(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleCardDragOver = (tierId: string, beforeId: string | null) => {
    if (!dragged) return;
    setDropHint({ tierId, beforeId });
  };

  const handleDropOnTier = (e: React.DragEvent, tierId: string) => {
    e.preventDefault();
    if (!dragged) return;

    const hint =
      dropHint?.tierId === tierId ? dropHint : { tierId, beforeId: null };

    if (dragSource === "pool") {
      setPool((p) => p.filter((m) => m.id !== dragged.id));
    } else if (dragSource) {
      setTiers((prev) =>
        prev.map((t) =>
          t.id === dragSource
            ? { ...t, items: t.items.filter((m) => m.id !== dragged.id) }
            : t,
        ),
      );
    }

    setTiers((prev) =>
      prev.map((t) => {
        if (t.id !== tierId) return t;
        const without = t.items.filter((m) => m.id !== dragged.id);
        if (hint.beforeId) {
          const idx = without.findIndex((m) => m.id === hint.beforeId);
          if (idx === -1) return { ...t, items: [...without, dragged] };
          const next = [...without];
          next.splice(idx, 0, dragged);
          return { ...t, items: next };
        }
        return { ...t, items: [...without, dragged] };
      }),
    );

    setDragged(null);
    setDragSource(null);
    setDropHint(null);
  };

  const handleDropOnPool = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragged || dragSource === "pool") {
      setDropHint(null);
      return;
    }
    setTiers((prev) =>
      prev.map((t) => ({
        ...t,
        items: t.items.filter((m) => m.id !== dragged.id),
      })),
    );
    setPool((p) => (p.find((m) => m.id === dragged.id) ? p : [...p, dragged]));
    setDragged(null);
    setDragSource(null);
    setDropHint(null);
  };

  const handlePoolItemClick = (model: Model) => {
    const target = tiers[0];
    if (!target) return;
    setPool((p) => p.filter((m) => m.id !== model.id));
    setTiers((prev) =>
      prev.map((t, i) => (i === 0 ? { ...t, items: [...t.items, model] } : t)),
    );
  };

  const handleTierItemClick = (model: Model, tierId: string) => {
    setTiers((prev) =>
      prev.map((t) =>
        t.id === tierId
          ? { ...t, items: t.items.filter((m) => m.id !== model.id) }
          : t,
      ),
    );
    setPool((p) => [...p, model]);
  };

  const updateTier = (id: string, patch: Partial<Tier>) => {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const moveTier = (id: string, dir: -1 | 1) => {
    setTiers((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const ni = idx + dir;
      if (ni < 0 || ni >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(idx, 1);
      if (!moved) return prev;
      copy.splice(ni, 0, moved);
      return copy;
    });
  };

  const deleteTier = (id: string) => {
    const tier = tiers.find((t) => t.id === id);
    if (tier) {
      setPool((p) => [...p, ...tier.items]);
    }
    setTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const addTier = () => {
    const id = `tier-${Date.now()}`;
    const colors = [
      "#ff7f7f",
      "#ffbf7f",
      "#ffdf7f",
      "#ffff7f",
      "#bfff7f",
      "#7fffbf",
      "#7fffff",
      "#7fbfff",
      "#7f7fff",
      "#bf7fff",
    ];
    const nextLabel = String.fromCharCode(65 + tiers.length) || "X";
    setTiers((prev) => [
      ...prev,
      {
        id,
        label: nextLabel,
        color: colors[prev.length % colors.length] ?? "#777",
        items: [],
      },
    ]);
  };

  const reset = () => {
    const all = [...pool, ...tiers.flatMap((t) => t.items)];
    setPool(all);
    setTiers((prev) => prev.map((t) => ({ ...t, items: [] })));
    setPoolSearch("");
  };

  const shufflePool = () => {
    setPool((p) => [...p].sort(() => Math.random() - 0.5));
  };

  const handleExport = async () => {
    if (!boardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(boardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0e0e0e",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `tierlist-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    } catch (e) {
      console.error(e);
      alert("Export failed. Try screenshot instead.");
    } finally {
      setExporting(false);
    }
  };

  const clearSaved = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    reset();
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 py-6 flex flex-col gap-4">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border border-zinc-800 bg-[#1a1a1a] p-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-200 hover:bg-white hover:text-black hover:border-white transition-colors"
          >
            ← SELECT MODELS
          </button>
          <h1 className="text-lg font-black tracking-tighter text-white">
            TIER LIST
          </h1>
          <span className="text-xs font-mono border border-zinc-700 px-1.5 py-0.5 bg-zinc-900 text-zinc-300">
            {initialModels.length} MODELS
          </span>
          {isHydrated && (
            <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
              AUTO-SAVED
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addTier}
            className="px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-200 hover:bg-white hover:text-black transition-colors"
          >
            + ADD TIER
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-200 hover:bg-white hover:text-black transition-colors"
          >
            RESET
          </button>
          <button
            type="button"
            onClick={clearSaved}
            className="px-3 py-1.5 border border-zinc-800 bg-transparent text-xs font-mono text-zinc-400 hover:text-white transition-colors"
            title="Clear saved tier list from this browser"
          >
            CLEAR SAVE
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-1.5 bg-white text-black text-xs font-bold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {exporting ? "EXPORTING…" : "DOWNLOAD PNG"}
          </button>
        </div>
      </div>

      {/* board capture target - no big padding, thin border like screenshot */}
      <div
        ref={boardRef}
        className="flex flex-col border border-black bg-black overflow-hidden"
      >
        <div className="flex flex-col">
          {tiers.map((tier, idx) => (
            <TierRow
              key={tier.id}
              tier={tier}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnTier(e, tier.id)}
              onDragStart={(e, m) => handleDragStart(e, m, tier.id)}
              onDragEnd={handleDragEnd}
              onLabelChange={(label) => updateTier(tier.id, { label })}
              onColorChange={(color) => updateTier(tier.id, { color })}
              onMoveUp={() => moveTier(tier.id, -1)}
              onMoveDown={() => moveTier(tier.id, 1)}
              onDelete={() => deleteTier(tier.id)}
              isFirst={idx === 0}
              isLast={idx === tiers.length - 1}
              onItemClick={(m) => handleTierItemClick(m, tier.id)}
              dropHint={dropHint}
              onCardDragOver={(beforeId) =>
                handleCardDragOver(tier.id, beforeId)
              }
            />
          ))}
          {tiers.length === 0 && (
            <div className="bg-[#1e1e1e] p-8 text-center text-sm font-mono text-zinc-500">
              No tiers. Click ADD TIER.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between bg-zinc-900 border-t border-black px-3 py-1.5">
          <span className="text-[10px] font-mono tracking-widest text-zinc-400">
            MODELS.TIERLIST — {new Date().getFullYear()}
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            models.dev
          </span>
        </div>
      </div>

      {/* pool - thin border */}
      <div className="border border-zinc-800 bg-[#1a1a1a] flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2 bg-[#1e1e1e]">
          <h2 className="text-xs font-bold tracking-widest text-zinc-200">
            POOL
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={poolSearch}
              onChange={(e) => setPoolSearch(e.target.value)}
              placeholder="Search pool…"
              className="border border-zinc-700 bg-black px-2 py-1 text-xs font-mono outline-none focus:border-zinc-500 text-white placeholder:text-zinc-500 w-[160px]"
            />
            {poolSearch && (
              <button
                type="button"
                onClick={() => setPoolSearch("")}
                className="text-xs font-mono border border-zinc-700 px-1.5 py-1 bg-zinc-900 text-zinc-300 hover:bg-white hover:text-black transition-colors"
              >
                ×
              </button>
            )}
            <span className="text-xs font-mono border border-zinc-700 px-2 py-0.5 bg-zinc-900 text-zinc-300">
              {poolSearch
                ? `${filteredPool.length}/${pool.length}`
                : `${pool.length}`}{" "}
              LEFT
            </span>
            <button
              type="button"
              onClick={shufflePool}
              className="text-xs font-bold border border-zinc-700 px-2 py-0.5 bg-zinc-900 text-zinc-200 hover:bg-white hover:text-black transition-colors"
            >
              SHUFFLE
            </button>
            <button
              type="button"
              onClick={() =>
                setPool(
                  initialModels.filter(
                    (m) =>
                      !tiers.flatMap((t) => t.items).some((x) => x.id === m.id),
                  ),
                )
              }
              className="text-xs font-bold border border-zinc-700 px-2 py-0.5 bg-zinc-900 text-zinc-200 hover:bg-white hover:text-black transition-colors"
            >
              RESTORE ALL
            </button>
          </div>
        </div>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDropOnPool}
          className="flex flex-wrap gap-1.5 p-2 min-h-[120px] bg-[#121212] content-start"
        >
          {pool.length === 0 && (
            <div className="w-full flex items-center justify-center py-8 text-zinc-500 text-xs font-mono">
              All models placed — drag back here to remove from tier
            </div>
          )}
          {pool.length > 0 && filteredPool.length === 0 && (
            <div className="w-full flex items-center justify-center py-8 text-zinc-500 text-xs font-mono">
              No models match “{poolSearch}”
            </div>
          )}
          {filteredPool.map((m) => (
            <ModelCard
              key={m.id}
              model={m}
              onDragStart={(e) => handleDragStart(e, m, "pool")}
              onDragEnd={handleDragEnd}
              onClick={() => handlePoolItemClick(m)}
              size="pool"
            />
          ))}
        </div>
        <div className="border-t border-zinc-800 px-3 py-2 bg-[#1a1a1a] text-[10px] font-mono text-zinc-500">
          Drag & drop between tiers • Hover a card to insert before it • Click
          gear to edit tier • Click card to quick-move
        </div>
      </div>
    </div>
  );
}
