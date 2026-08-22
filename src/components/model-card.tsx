"use client";

import { logoUrl, type Model, modelVersion } from "@/lib/models";

export function ModelCard({
  model,
  draggable = true,
  onDragStart,
  onDragEnd,
  size = "default",
  onClick,
  selected,
}: {
  model: Model;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  size?: "default" | "small" | "pool";
  onClick?: () => void;
  selected?: boolean;
}) {
  const version = modelVersion(model);
  const dims =
    size === "small"
      ? "w-[86px] h-[86px]"
      : size === "pool"
        ? "w-[96px] h-[96px]"
        : "w-[88px] h-[88px]";

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`${dims} relative flex flex-col items-center justify-between border-2 border-black bg-white p-1.5 select-none cursor-grab active:cursor-grabbing hover:bg-zinc-50 transition-colors shrink-0
        ${selected ? "bg-black text-white border-black" : ""}
        ${draggable ? "" : "cursor-pointer"}
      `}
      title={`${model.name} (${model.id})`}
    >
      {/* logo */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl(model.providerId)}
          alt={model.providerId}
          className={`w-8 h-8 object-contain pointer-events-none ${selected ? "invert" : ""}`}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* name */}
      <div className="w-full text-center leading-none">
        <div
          className={`text-[10px] font-bold tracking-tight leading-3 line-clamp-2 break-words ${selected ? "text-white" : "text-black"}`}
        >
          {model.name}
        </div>
        <div
          className={`text-[8px] font-mono mt-0.5 truncate ${selected ? "text-zinc-300" : "text-zinc-600"}`}
        >
          {version}
        </div>
      </div>
    </div>
  );
}
