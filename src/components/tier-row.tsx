"use client";

import { useState } from "react";
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
  dropHint,
  onCardDragOver,
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
  dropHint?: { tierId: string; beforeId: string | null } | null;
  onCardDragOver?: (beforeId: string | null) => void;
}) {
  const [showSettings, setShowSettings] = useState(false);

  const handleZoneDragOver = (e: React.DragEvent) => {
    onDragOver(e);
    if (e.target === e.currentTarget) {
      onCardDragOver?.(null);
    }
  };

  return (
    <div className="relative flex min-h-[76px] border-b border-black w-full">
      {/* label */}
      <div
        className="w-[82px] shrink-0 flex items-center justify-center p-2 border-r border-black"
        style={{ background: tier.color }}
      >
        <input
          value={tier.label}
          onChange={(e) =>
            onLabelChange(e.target.value.slice(0, 8).toUpperCase())
          }
          className="w-full bg-transparent text-center font-bold text-[13px] leading-none tracking-wide text-black/80 outline-none placeholder:text-black/40"
          maxLength={8}
          spellCheck={false}
        />
      </div>

      {/* drop zone */}
      <div
        onDragOver={handleZoneDragOver}
        onDrop={onDrop}
        className="flex-1 flex flex-wrap gap-1 p-1.5 bg-[#1e1e1e] min-h-[76px] content-start"
      >
        {tier.items.length === 0 && (
          <div className="w-full h-full min-h-[48px] flex items-center justify-center text-zinc-600 text-xs font-mono pointer-events-none select-none">
            —
          </div>
        )}
        {tier.items.map((m) => {
          const showIndicator =
            dropHint?.tierId === tier.id && dropHint?.beforeId === m.id;
          return (
            <div
              key={m.id}
              className="relative shrink-0"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCardDragOver?.(m.id);
              }}
            >
              {showIndicator && (
                <div className="absolute -left-[4px] top-0 bottom-0 w-[2px] bg-white z-10 pointer-events-none" />
              )}
              <ModelCard
                model={m}
                onDragStart={(e) => onDragStart(e, m)}
                onDragEnd={onDragEnd}
                onClick={() => onItemClick?.(m)}
                size="default"
              />
            </div>
          );
        })}
        {dropHint?.tierId === tier.id &&
          dropHint?.beforeId === null &&
          tier.items.length > 0 && (
            <div className="w-[2px] bg-white/70 self-stretch ml-1 pointer-events-none" />
          )}
      </div>

      {/* right controls - black bar like screenshot */}
      <div className="w-[36px] shrink-0 bg-black flex flex-col items-center justify-center gap-1 py-1 border-l border-black">
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          title="Tier settings"
          aria-label="Tier settings"
        >
          <span className="text-[14px] leading-none">⚙</span>
        </button>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          className="w-6 h-5 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-[10px]"
          title="Move up"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className="w-6 h-5 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-[10px]"
          title="Move down"
        >
          ▼
        </button>
      </div>

      {/* settings popover */}
      {showSettings && (
        <div className="absolute right-[42px] top-1 z-20 bg-zinc-900 border border-zinc-700 p-2 flex items-center gap-2 shadow-lg">
          <input
            value={tier.label}
            onChange={(e) =>
              onLabelChange(e.target.value.slice(0, 8).toUpperCase())
            }
            className="w-20 bg-black border border-zinc-700 px-2 py-1 text-xs font-bold text-white outline-none"
            placeholder="Label"
          />
          <label className="relative w-7 h-7 border border-zinc-700 bg-white cursor-pointer overflow-hidden flex items-center justify-center">
            <input
              type="color"
              value={tier.color}
              onChange={(e) => onColorChange(e.target.value)}
              className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
            />
            <span
              className="w-4 h-4 border border-black/20"
              style={{ background: tier.color }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              onDelete();
              setShowSettings(false);
            }}
            className="px-2 py-1 bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
          >
            DELETE
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="px-2 py-1 bg-black text-white border border-zinc-700 text-xs hover:bg-zinc-800 transition-colors"
          >
            CLOSE
          </button>
        </div>
      )}
    </div>
  );
}
