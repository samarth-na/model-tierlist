import type { Model } from "./models";

export type Preset = {
  id: string;
  label: string;
  description: string;
  // either static ids or dynamic filter
  modelIds?: string[];
  filter?: (m: Model) => boolean;
  limit?: number; // for dynamic filter, take top N after sort by release_date desc
  sort?: "recency";
};

export const PRESETS: Preset[] = [
  {
    id: "flagship-faceoff",
    label: "FLAGSHIP FACEOFF",
    description: "Best model from each major lab — head to head",
    modelIds: [
      "openai/gpt-5.6-sol",
      "anthropic/claude-opus-5",
      "google/gemini-3.7-flash",
      "meta/muse-spark-1.2",
      "deepseek/deepseek-v4-pro-0813",
      "xai/grok-4.6",
      "alibaba/qwen3.8-27b",
      "mistral/mistral-medium-latest",
      "nvidia/nemotron-3.5-lightning",
      "zhipuai/glm-5.3",
      "moonshotai/kimi-k3",
      "bytedance-seed/seed-2.1-turbo",
      "minimax/MiniMax-M3",
      "tencent/hy3",
      "xiaomi/mimo-v2.5-pro",
      "cohere/north-mini-code-1-0",
      "stepfun/step-3.7-flash",
      "upstage/solar-pro4",
    ],
  },
  {
    id: "best-open-weight",
    label: "BEST OPEN WEIGHT",
    description: "Top open-weight models by recency — strong for self-host",
    filter: (m) => !!m.open_weights,
    limit: 18,
    sort: "recency",
  },
  // per-lab top picks
  {
    id: "lab-openai",
    label: "OPENAI TOP",
    description: "OpenAI flagship line",
    modelIds: [
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-terra",
      "openai/gpt-5.5",
      "openai/gpt-5.4",
      "openai/gpt-5.2",
      "openai/gpt-5",
      "openai/gpt-4o",
    ],
  },
  {
    id: "lab-anthropic",
    label: "ANTHROPIC TOP",
    description: "Claude family headliners",
    modelIds: [
      "anthropic/claude-opus-5",
      "anthropic/claude-sonnet-5",
      "anthropic/claude-opus-4-8",
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-opus-4-7",
      "anthropic/claude-opus-4-6",
      "anthropic/claude-haiku-4-5",
    ],
  },
  {
    id: "lab-google",
    label: "GOOGLE TOP",
    description: "Gemini + Gemma flagships",
    modelIds: [
      "google/gemini-3.7-flash",
      "google/gemini-flash-latest",
      "google/gemini-3.5-flash",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3-flash-preview",
      "google/gemma-4-31b-it",
      "google/gemma-4-26b-a4b-it",
    ],
  },
  {
    id: "lab-deepseek",
    label: "DEEPSEEK TOP",
    description: "DeepSeek V4 line",
    modelIds: [
      "deepseek/deepseek-v4-pro-0813",
      "deepseek/deepseek-v4-flash-0731",
      "deepseek/deepseek-v4-pro",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-chat",
      "deepseek/deepseek-reasoner",
    ],
  },
  {
    id: "lab-xai",
    label: "XAI TOP",
    description: "Grok family",
    modelIds: [
      "xai/grok-4.6",
      "xai/grok-4.5",
      "xai/grok-4.3",
      "xai/grok-build-0.1",
      "xai/grok-imagine-image-2.0",
    ],
  },
  {
    id: "lab-alibaba",
    label: "ALIBABA TOP",
    description: "Qwen3 line",
    modelIds: [
      "alibaba/qwen3.8-27b",
      "alibaba/qwen3.8-2.4t-a95b",
      "alibaba/qwen3.8-max",
      "alibaba/qwen3.7-flash",
      "alibaba/qwen3.7-plus",
      "alibaba/qwen3.6-27b",
    ],
  },
  {
    id: "lab-mistral",
    label: "MISTRAL TOP",
    description: "Mistral medium/small",
    modelIds: [
      "mistral/mistral-medium-latest",
      "mistral/mistral-small-latest",
      "mistral/mistral-medium-2604",
      "mistral/devstral-2512",
    ],
  },
  {
    id: "lab-meta",
    label: "META TOP",
    description: "Muse + Llama flagships",
    modelIds: [
      "meta/muse-spark-1.2",
      "meta/muse-glimmer-30b",
      "meta/llama-4-maverick-17b-instruct",
      "meta/llama-4-scout-17b-instruct",
    ],
  },
];

export function resolvePreset(preset: Preset, all: Model[]): Model[] {
  let list: Model[];
  if (preset.modelIds) {
    const byId = new Map(all.map((m) => [m.id, m] as const));
    list = preset.modelIds
      .map((id) => byId.get(id))
      .filter((x): x is Model => !!x);
  } else if (preset.filter) {
    list = all.filter(preset.filter);
    if (preset.sort === "recency") {
      list = [...list].sort((a, b) => {
        const da = a.release_date ?? "";
        const db = b.release_date ?? "";
        return db.localeCompare(da);
      });
    }
    if (preset.limit) list = list.slice(0, preset.limit);
  } else {
    list = [];
  }
  return list;
}
