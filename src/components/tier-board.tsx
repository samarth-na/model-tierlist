"use client";

import { toPng } from "html-to-image";
import { useRef, useState } from "react";
import { ModelCard } from "@/components/model-card";
import { TierRow } from "@/components/tier-row";
import { DEFAULT_TIERS, type Model, type Tier } from "@/lib/models";

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
  const [dragSource, setDragSource] = useState<string | null>(null); // tier id or "pool"
  const boardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // ---- drag helpers ----
  const handleDragStart = (
    e: React.DragEvent,
    model: Model,
    sourceId: string,
  ) => {
    setDragged(model);
    setDragSource(sourceId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", model.id);
    // ghost opacity
    setTimeout(() => {
      (e.target as HTMLElement).classList.add("dragging");
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove("dragging");
    setDragged(null);
    setDragSource(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // move dragged to tier
  const handleDropOnTier = (e: React.DragEvent, tierId: string) => {
    e.preventDefault();
    if (!dragged) return;

    // remove from source
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

    // add to target if not already there (avoid dup during reorder)
    setTiers((prev) =>
      prev.map((t) => {
        if (t.id !== tierId) return t;
        // if moving within same tier, append at end (simple). For reorder we could insert index but keep simple
        const already = t.items.find((m) => m.id === dragged.id);
        if (already && dragSource === tierId) {
          // re-append to end to allow reorder via drag
          return {
            ...t,
            items: [...t.items.filter((m) => m.id !== dragged.id), dragged],
          };
        }
        return { ...t, items: [...t.items, dragged] };
      }),
    );

    setDragged(null);
    setDragSource(null);
  };

  const handleDropOnPool = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragged || dragSource === "pool") return;
    // remove from tier
    setTiers((prev) =>
      prev.map((t) => ({
        ...t,
        items: t.items.filter((m) => m.id !== dragged.id),
      })),
    );
    // dedup
    setPool((p) => (p.find((m) => m.id === dragged.id) ? p : [...p, dragged]));
    setDragged(null);
    setDragSource(null);
  };

  // click-to-move fallback (mobile): click item in pool -> move to first tier, click item in tier -> back to pool
  const handlePoolItemClick = (model: Model) => {
    // Move to first tier that exists, or distribute? Just move to S
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

  // tier controls
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
      "#ff6b6b",
      "#ffd23f",
      "#7ed957",
      "#5ca8ff",
      "#c49bff",
      "#ff8a2b",
      "#6bcb77",
    ];
    const _labels = ["S", "A", "B", "C", "D", "E", "F"];
    const nextLabel = String.fromCharCode(65 + tiers.length) || "X";
    setTiers((prev) => [
      ...prev,
      {
        id,
        label: nextLabel,
        color: colors[prev.length % colors.length],
        items: [],
      },
    ]);
  };

  const reset = () => {
    const all = [...pool, ...tiers.flatMap((t) => t.items)];
    setPool(all);
    setTiers((prev) => prev.map((t) => ({ ...t, items: [] })));
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
        backgroundColor: "#f5f5f0",
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

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 py-6 flex flex-col gap-4">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-black bg-white p-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 border-2 border-black bg-white text-xs font-bold hover:bg-black hover:text-white transition-colors"
          >
            ← SELECT MODELS
          </button>
          <h1 className="text-lg font-black tracking-tighter">TIER LIST</h1>
          <span className="text-xs font-mono border border-black px-1.5 py-0.5 bg-zinc-100">
            {initialModels.length} MODELS
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={addTier}
            className="px-3 py-1.5 border-2 border-black bg-white text-xs font-bold hover:bg-black hover:text-white transition-colors"
          >
            + ADD TIER
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 border-2 border-black bg-white text-xs font-bold hover:bg-black hover:text-white transition-colors"
          >
            RESET
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-1.5 border-2 border-black bg-black text-white text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {exporting ? "EXPORTING..." : "DOWNLOAD PNG"}
          </button>
        </div>
      </div>

      {/* board capture target */}
      <div
        ref={boardRef}
        className="flex flex-col gap-2 border-2 border-black bg-black p-2"
      >
        {/* tiers */}
        <div className="flex flex-col gap-2">
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
            />
          ))}
          {tiers.length === 0 && (
            <div className="bg-white border-2 border-black p-8 text-center text-sm font-mono">
              No tiers. Click ADD TIER.
            </div>
          )}
        </div>

        {/* branding footer inside capture */}
        <div className="flex items-center justify-between bg-white border-2 border-black px-3 py-1.5 mt-1">
          <span className="text-[10px] font-mono tracking-widest">
            MODELS.TIERLIST — {new Date().getFullYear()}
          </span>
          <span className="text-[10px] font-mono">models.dev</span>
        </div>
      </div>

      {/* pool */}
      <div className="border-2 border-black bg-white flex flex-col">
        <div className="flex items-center justify-between border-b-2 border-black px-3 py-2 bg-zinc-50">
          <h2 className="text-xs font-black tracking-widest">
            POOL — DRAG TO TIERS (or click)
          </h2>
          <div className="flex gap-2">
            <span className="text-xs font-mono border border-black px-2 py-0.5 bg-white">
              {pool.length} LEFT
            </span>
            <button
              onClick={shufflePool}
              className="text-xs font-bold border border-black px-2 py-0.5 bg-white hover:bg-black hover:text-white transition-colors"
            >
              SHUFFLE
            </button>
            <button
              onClick={() =>
                setPool(
                  initialModels.filter(
                    (m) =>
                      !tiers.flatMap((t) => t.items).some((x) => x.id === m.id),
                  ),
                )
              }
              className="text-xs font-bold border border-black px-2 py-0.5 bg-white hover:bg-black hover:text-white transition-colors"
            >
              RESTORE ALL
            </button>
          </div>
        </div>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDropOnPool}
          className="flex flex-wrap gap-2 p-3 min-h-[140px] bg-zinc-100 content-start"
        >
          {pool.length === 0 && (
            <div className="w-full flex items-center justify-center py-10 text-zinc-400 text-xs font-mono">
              All models placed — drag back here to remove from tier
            </div>
          )}
          {pool.map((m) => (
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
        <div className="border-t-2 border-black px-3 py-2 bg-white flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
          <span>
            TIP: Drag & drop between tiers. Click label to rename. Click color
            dot to change color. Click a card to quick-move.
          </span>
        </div>
      </div>
    </div>
  );
}
