"use client";

import { ModelCard } from "@/components/model-card";
import type { Model, Tier } from "@/lib/models";

export function TierRow({
  tier,
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  onLabelChange,
  onColorChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  isFirst,
  isLast,
  onItemClick,
  onPoolDrop, // click-to-move fallback
}: {
  tier: Tier;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragStart: (e: React.DragEvent, model: Model) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onLabelChange: (label: string) => void;
  onColorChange: (color: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
  onItemClick?: (model: Model) => void;
  onPoolDrop?: () => void;
}) {
  return (
    <div className="flex min-h-[96px] border-2 border-black bg-white w-full">
      {/* label */}
      <div
        className="w-[88px] shrink-0 flex flex-col items-center justify-center border-r-2 border-black p-2 gap-2 relative"
        style={{ background: tier.color }}
      >
        <input
          value={tier.label}
          onChange={(e) =>
            onLabelChange(e.target.value.slice(0, 4).toUpperCase())
          }
          className="w-full bg-transparent text-center font-black text-[28px] leading-none tracking-tighter text-black outline-none placeholder:text-black/40"
          maxLength={4}
          spellCheck={false}
        />
        <div className="flex items-center gap-1">
          <label className="w-5 h-5 border border-black bg-white cursor-pointer overflow-hidden flex items-center justify-center">
            <input
              type="color"
              value={tier.color}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-8 h-8 opacity-0 absolute cursor-pointer"
            />
            <span
              className="w-3 h-3 border border-black/20"
              style={{ background: tier.color }}
            />
          </label>
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="w-5 h-5 border border-black bg-white text-[10px] font-bold disabled:opacity-30 hover:bg-black hover:text-white transition-colors"
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="w-5 h-5 border border-black bg-white text-[10px] font-bold disabled:opacity-30 hover:bg-black hover:text-white transition-colors"
            title="Move down"
          >
            ↓
          </button>
          <button
            onClick={onDelete}
            className="w-5 h-5 border border-black bg-white text-[10px] font-bold hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
            title="Delete tier (items go to pool)"
          >
            ×
          </button>
        </div>
      </div>

      {/* drop zone */}
      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="flex-1 flex flex-wrap gap-1 p-1.5 bg-zinc-100 min-h-[96px] content-start"
      >
        {tier.items.length === 0 && (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs font-mono pointer-events-none">
            DROP HERE
          </div>
        )}
        {tier.items.map((m) => (
          <ModelCard
            key={m.id}
            model={m}
            onDragStart={(e) => onDragStart(e, m)}
            onDragEnd={onDragEnd}
            onClick={() => onItemClick?.(m)}
            size="default"
          />
        ))}
      </div>
    </div>
  );
}
