"use client";

import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ModelCard } from "@/components/model-card";
import { TierRow } from "@/components/tier-row";
import {
  createEntryFromBoard,
  upsertHistory,
  upsertHistoryByName,
} from "@/lib/history";
import { BOARD_KEY, clearBoard, loadBoard, saveBoard, type BoardState } from "@/lib/board-storage";
import { DEFAULT_TIERS, type Model, type Tier } from "@/lib/models";

function selectionKey(models: Model[]) {
  return [...models]
    .map((m) => m.id)
    .sort()
    .join("|");
}

export function TierBoard({
  initialModels,
  allModels,
  onBack,
  onSelectionChange,
  onHistoryChange,
}: {
  initialModels: Model[];
  allModels?: Model[];
  onBack: () => void;
  onSelectionChange?: (next: Model[]) => void;
  onHistoryChange?: () => void;
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
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addSelected, setAddSelected] = useState<Set<string>>(new Set());
  const boardIdRef = useRef<string>(
    `board-${selectionKey(initialModels)}`,
  );

  const all = allModels ?? initialModels;

  // additive sync when initialModels changes (preserve tier placements, just add/remove diff)
  useEffect(() => {
    if (!didLoadRef.current) return;
    const currentIds = new Set(
      [...pool, ...tiers.flatMap((t) => t.items)].map((m) => m.id),
    );
    const nextIds = new Set(initialModels.map((m) => m.id));
    // add new models to pool
    const toAdd = initialModels.filter((m) => !currentIds.has(m.id));
    if (toAdd.length > 0) {
      setPool((p) => [...p, ...toAdd]);
    }
    // remove models that are no longer selected
    const toRemove = [...currentIds].filter((id) => !nextIds.has(id));
    if (toRemove.length > 0) {
      const removeSet = new Set(toRemove);
      setPool((p) => p.filter((m) => !removeSet.has(m.id)));
      setTiers((prev) =>
        prev.map((t) => ({
          ...t,
          items: t.items.filter((m) => !removeSet.has(m.id)),
        })),
      );
    }
  }, [initialModels, pool, tiers.flatMap]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const board = loadBoard();
      if (board) {
        // map using `all` so we can handle any tier item even if initialModels is slightly stale
        const byId = new Map(all.map((m) => [m.id, m] as const));
        const mapIds = (ids: string[]) =>
          ids.map((id) => byId.get(id)).filter((x): x is Model => !!x);
        // only restore if board actually has content for this selection set
        // we use board's tiers/pool directly — they were merged via selector so they preserve placements
        const restoredTiers: Tier[] = board.tiers.map((t) => ({
          id: t.id,
          label: t.label,
          color: t.color,
          items: mapIds(t.items),
        }));
        const restoredPool = mapIds(board.pool);
        // sanity: if board is empty but we have initialModels, keep initialModels as pool
        const hasAnyRestored = restoredTiers.some((t) => t.items.length > 0) || restoredPool.length > 0;
        if (hasAnyRestored || board.selectionIds.length > 0) {
          // only apply if the board's selection roughly matches — otherwise keep default
          // we accept board even if sizes differ slightly (merged selection)
          setTiers(restoredTiers.length > 0 ? restoredTiers : DEFAULT_TIERS.map((t) => ({ ...t, items: [] })));
          // if board pool is empty but we have items in tiers, keep empty pool
          // if both empty, fallback to initialModels as pool
          if (restoredPool.length > 0 || restoredTiers.some((t) => t.items.length > 0)) {
            setPool(restoredPool);
          } else if (initialModels.length > 0) {
            setPool([...initialModels]);
          }
        }
      } else if (initialModels.length > 0) {
        // no board yet — initialize pool from initialModels (default tiers already set)
        setPool([...initialModels]);
      }
    } catch {
      // ignore
    } finally {
      didLoadRef.current = true;
      setIsHydrated(true);
    }
    // we intentionally run once per initialModels identity change; `all` is stable for mapping
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialModels]);

  useEffect(() => {
    if (!didLoadRef.current) return;
    try {
      const board: BoardState = {
        v: 2,
        tiers: tiers.map((t) => ({
          id: t.id,
          label: t.label,
          color: t.color,
          items: t.items.map((m) => m.id),
        })),
        pool: pool.map((m) => m.id),
        selectionIds: [...pool, ...tiers.flatMap((t) => t.items)].map((m) => m.id),
        updatedAt: new Date().toISOString(),
      };
      saveBoard(board);
    } catch {
      // ignore
    }
  }, [tiers, pool]);

  // history — save every change (never lost)
  useEffect(() => {
    if (!didLoadRef.current) return;
    const allIds = [...pool, ...tiers.flatMap((t) => t.items)].map((m) => m.id);
    // also include any tier items that might be from history restore? already covered
    const entry = createEntryFromBoard(
      boardIdRef.current,
      tiers,
      pool.map((m) => m.id),
      allIds.length > 0 ? allIds : initialModels.map((m) => m.id),
    );
    upsertHistory(entry);
    onHistoryChange?.();
  }, [tiers, pool, initialModels.map, onHistoryChange]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const addableModels = useMemo(() => {
    const existing = new Set(
      [...pool, ...tiers.flatMap((t) => t.items)].map((m) => m.id),
    );
    let list = all.filter((m) => !existing.has(m.id));
    if (addSearch.trim()) {
      const q = addSearch.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.providerId.toLowerCase().includes(q),
      );
    }
    return list.slice(0, 80);
  }, [all, pool, tiers, addSearch]);

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

  const handleUnselect = (model: Model) => {
    setPool((p) => p.filter((m) => m.id !== model.id));
    setTiers((prev) =>
      prev.map((t) => ({
        ...t,
        items: t.items.filter((m) => m.id !== model.id),
      })),
    );
    const nextSelection = [...pool, ...tiers.flatMap((t) => t.items)]
      .filter((m) => m.id !== model.id)
      .map((m) => m.id);
    // also include the removed model's id should not be in next, but pool/tiers already filtered
    // notify parent to update selected
    const byId = new Map(all.map((m) => [m.id, m] as const));
    const nextModels = nextSelection
      .map((id) => byId.get(id))
      .filter((x): x is Model => !!x);
    onSelectionChange?.(nextModels);
  };

  const handleAddSelected = () => {
    const byId = new Map(all.map((m) => [m.id, m] as const));
    const toAdd = [...addSelected]
      .map((id) => byId.get(id))
      .filter((x): x is Model => !!x);
    if (toAdd.length === 0) return;
    setPool((p) => [...p, ...toAdd]);
    const nextSelection = [...pool, ...tiers.flatMap((t) => t.items), ...toAdd];
    onSelectionChange?.(nextSelection);
    setAddSelected(new Set());
    setShowAddDrawer(false);
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
    const allCurrent = [...pool, ...tiers.flatMap((t) => t.items)];
    setPool(allCurrent);
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
      clearBoard();
      // also clear legacy keys for cleanliness
      localStorage.removeItem("models-tierlist-v1");
      localStorage.removeItem("models-tierlist-last-selection");
    } catch {}
    reset();
  };

  const totalInBoard =
    pool.length + tiers.reduce((s, t) => s + t.items.length, 0);

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
            ← BACK TO LIST
          </button>
          <h1 className="text-lg font-black tracking-tighter text-white">
            TIER LIST
          </h1>
          <span className="text-xs font-mono border border-zinc-700 px-1.5 py-0.5 bg-zinc-900 text-zinc-300">
            {totalInBoard} MODELS
          </span>
          {isHydrated && (
            <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
              AUTO-SAVED • HISTORY KEPT
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAddDrawer((v) => !v)}
            className="px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-200 hover:bg-white hover:text-black transition-colors"
          >
            + ADD MODELS
          </button>
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
            onClick={() => {
              const name = window.prompt("Name this tier list?");
              if (!name || !name.trim()) return;
              const allIds = [
                ...pool,
                ...tiers.flatMap((t) => t.items),
              ].map((m) => m.id);
              upsertHistoryByName({
                tiers: tiers.map((t) => ({
                  id: t.id,
                  label: t.label,
                  color: t.color,
                  items: t.items.map((m) => m.id),
                })),
                pool: pool.map((m) => m.id),
                selectionIds: allIds,
                title: name.trim(),
              });
              onHistoryChange?.();
            }}
            className="px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-xs font-bold text-white hover:bg-white hover:text-black transition-colors"
            title="Save current board as named list (kept in history)"
          >
            SAVE LIST
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

      {/* add drawer */}
      {showAddDrawer && (
        <div className="border border-zinc-800 bg-[#1a1a1a] p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold tracking-widest text-zinc-300">
              ADD MODELS — {addableModels.length} available • {addSelected.size}{" "}
              selected
            </h3>
            <button
              type="button"
              onClick={() => setShowAddDrawer(false)}
              className="text-xs border border-zinc-700 px-2 py-1 text-zinc-400 hover:text-white"
            >
              CLOSE
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="Search to add…"
              className="flex-1 border border-zinc-700 bg-black px-2 py-1 text-xs font-mono text-white placeholder:text-zinc-500"
            />
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={addSelected.size === 0}
              className="px-3 py-1 bg-white text-black text-xs font-bold disabled:opacity-30 hover:bg-zinc-200"
            >
              ADD SELECTED ({addSelected.size})
            </button>
            <button
              type="button"
              onClick={() => setAddSelected(new Set())}
              className="px-2 py-1 border border-zinc-700 text-xs text-zinc-400"
            >
              CLEAR
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 bg-[#121212] p-2 max-h-[260px] overflow-auto content-start">
            {addableModels.length === 0 ? (
              <div className="w-full py-8 text-center text-xs font-mono text-zinc-500">
                No more models to add — all {all.length} are already in board
              </div>
            ) : (
              addableModels.map((m) => {
                const sel = addSelected.has(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() =>
                      setAddSelected((prev) => {
                        const n = new Set(prev);
                        if (n.has(m.id)) n.delete(m.id);
                        else n.add(m.id);
                        return n;
                      })
                    }
                    className={`cursor-pointer ${sel ? "ring-2 ring-white" : ""}`}
                  >
                    <ModelCard
                      model={m}
                      draggable={false}
                      selected={sel}
                      size="pool"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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
              onUnselect={handleUnselect}
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
            <div key={m.id} className="relative group">
              <ModelCard
                model={m}
                onDragStart={(e) => handleDragStart(e, m, "pool")}
                onDragEnd={handleDragEnd}
                onClick={() => handlePoolItemClick(m)}
                size="pool"
              />
              <button
                type="button"
                onClick={() => handleUnselect(m)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold border border-black opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-opacity flex items-center justify-center"
                title="Unselect — remove from tier list"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-800 px-3 py-2 bg-[#1a1a1a] text-[10px] font-mono text-zinc-500">
          Drag & drop between tiers • Hover a card to insert before it • Click
          gear to edit tier • Click card to quick-move • X to unselect
        </div>
      </div>

      {/* also show unselect on tier cards via overlay */}
      <style>{`.tier-card-wrap .unselect-btn { opacity: 0 } .tier-card-wrap:hover .unselect-btn { opacity: 1 }`}</style>
    </div>
  );
}
