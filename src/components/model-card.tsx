"use client";

import { useEffect, useState } from "react";
import {
  logoUrl,
  type Model,
  modelVersion,
  providerBrandColor,
} from "@/lib/models";

const svgCache = new Map<string, string>();

function useColoredLogo(providerId: string) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const brand = providerBrandColor(providerId);
    const cached = svgCache.get(providerId);
    if (cached) {
      setSvg(cached.replaceAll("currentColor", brand));
      return;
    }
    fetch(logoUrl(providerId))
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => {
        svgCache.set(providerId, text);
        if (!cancelled) setSvg(text.replaceAll("currentColor", brand));
      })
      .catch(() => {
        if (!cancelled) setSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  return svg;
}

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
      ? "w-[72px] h-[72px]"
      : size === "pool"
        ? "w-[84px] h-[84px]"
        : "w-[76px] h-[76px]";
  const coloredSvg = useColoredLogo(model.providerId);

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`${dims} relative flex flex-col items-center justify-between border bg-white p-1.5 select-none cursor-grab active:cursor-grabbing hover:bg-zinc-50 transition-colors shrink-0
        ${selected ? "ring-2 ring-white ring-offset-2 ring-offset-[#0e0e0e] border-zinc-900" : "border-zinc-200"}
        ${draggable ? "" : "cursor-pointer"}
      `}
      title={`${model.name} (${model.id})`}
    >
      {/* colored logo */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0 py-1">
        {coloredSvg ? (
          <span
            className="w-7 h-7 flex items-center justify-center [&>svg]:w-7 [&>svg]:h-7 [&>svg]:object-contain pointer-events-none"
            aria-hidden
            // biome-ignore lint/security/noDangerouslySetInnerHtml: logos are from trusted models.dev CDN, brand color replaced
            dangerouslySetInnerHTML={{ __html: coloredSvg }}
          />
        ) : (
          <span
            className="w-7 h-7 rounded-none flex items-center justify-center text-[10px] font-black text-white pointer-events-none"
            style={{ background: providerBrandColor(model.providerId) }}
          >
            {model.providerId.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      <div className="w-full text-center leading-none">
        <div className="text-[10px] font-bold tracking-tight leading-3 line-clamp-2 break-words text-black">
          {model.name}
        </div>
        <div className="text-[8px] font-mono mt-0.5 truncate text-zinc-600">
          {version}
        </div>
      </div>
    </div>
  );
}
