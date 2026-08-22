"use client";

import { useState } from "react";
import { ModelSelector } from "@/components/model-selector";
import { TierBoard } from "@/components/tier-board";
import type { Model } from "@/lib/models";

export function HomeClient({ models }: { models: Model[] }) {
  const [selected, setSelected] = useState<Model[] | null>(null);

  if (!selected) {
    return <ModelSelector models={models} onStart={(m) => setSelected(m)} />;
  }

  return (
    <TierBoard initialModels={selected} onBack={() => setSelected(null)} />
  );
}
