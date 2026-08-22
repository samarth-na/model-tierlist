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
  { id: "s", label: "S", color: "#ff7f7f" },
  { id: "a", label: "A", color: "#ffbf7f" },
  { id: "b", label: "B", color: "#ffdf7f" },
  { id: "c", label: "C", color: "#ffff7f" },
  { id: "d", label: "D", color: "#bfff7f" },
  { id: "e", label: "E", color: "#7fff7f" },
  { id: "f", label: "F", color: "#7fffff" },
  { id: "dont", label: "Don't used", color: "#7fbfff" },
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

const BRAND: Record<string, string> = {
  openai: "#111111",
  anthropic: "#c97a3a",
  google: "#4285f4",
  meta: "#0668e1",
  deepseek: "#4d6bfe",
  xai: "#ffffff",
  alibaba: "#ff6a00",
  mistral: "#ff7000",
  nvidia: "#76b900",
  zhipuai: "#2d6bff",
  moonshotai: "#7c3aed",
  "bytedance-seed": "#00c6ff",
  bytedance: "#00c6ff",
  minimax: "#5a2ff0",
  tencent: "#006eff",
  xiaomi: "#ff6900",
  stepfun: "#ff4d4f",
  upstage: "#00c2a2",
  cohere: "#39594e",
  sakana: "#ff3b6b",
  arcee_ai: "#00b894",
  "arcee-ai": "#00b894",
  poolside: "#0ea5e9",
  perplexity: "#1ea2ff",
  groq: "#f55036",
  fireworks: "#ff3366",
  together: "#00cc99",
  huggingface: "#ff9d00",
};

export function providerBrandColor(providerId: string) {
  return BRAND[providerId] ?? "#e5e5e5";
}

// Format version/label: use last segment after slash or release date
export function modelVersion(m: Model) {
  // e.g. gpt-5.5 or claude-opus-4-7
  const parts = m.id.split("/");
  return parts[parts.length - 1] ?? m.id;
}
