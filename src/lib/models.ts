export type Model = {
  id: string; // e.g. "openai/gpt-5.5"
  providerId: string; // "openai"
  name: string;
  family?: string;
  description?: string;
  release_date?: string;
  last_updated?: string;
  knowledge?: string;
  open_weights?: boolean;
  limit?: { context?: number; output?: number; input?: number };
  cost?: { input?: number; output?: number };
  modalities?: { input: string[]; output: string[] };
};

export type Tier = {
  id: string;
  label: string;
  color: string;
  items: Model[];
};

export const DEFAULT_TIERS: Omit<Tier, "items">[] = [
  { id: "s", label: "S", color: "#ff4b4b" },
  { id: "a", label: "A", color: "#ff8a2b" },
  { id: "b", label: "B", color: "#ffcf0f" },
  { id: "c", label: "C", color: "#7ed957" },
  { id: "d", label: "D", color: "#5ca8ff" },
  { id: "f", label: "F", color: "#c49bff" },
];

// Fetch canonical models (355) - cheaper / cleaner for tier lists
export async function fetchModels(): Promise<Model[]> {
  const res = await fetch("https://models.dev/models.json", {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("Failed to fetch models.json");
  const data = (await res.json()) as Record<string, any>;
  return Object.values(data).map((m) => {
    const id: string = m.id;
    const providerId = id.split("/")[0] ?? "unknown";
    return {
      id,
      providerId,
      name: m.name,
      family: m.family,
      description: m.description,
      release_date: m.release_date,
      last_updated: m.last_updated,
      knowledge: m.knowledge,
      open_weights: m.open_weights,
      limit: m.limit,
      cost: undefined,
      modalities: m.modalities,
    } as Model;
  });
}

// Provider logos via models.dev
export function logoUrl(providerId: string) {
  return `https://models.dev/logos/${providerId}.svg`;
}

// Format version/label: use last segment after slash or release date
export function modelVersion(m: Model) {
  // e.g. gpt-5.5 or claude-opus-4-7
  const parts = m.id.split("/");
  return parts[parts.length - 1] ?? m.id;
}
