import type { Preset } from "./presets";

export type CustomPreset = Preset & {
  custom: true;
  createdAt: string;
};

const KEY = "models-tierlist-custom-presets";

export function loadCustomPresets(): CustomPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveCustomPresets(presets: CustomPreset[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(presets));
  } catch {}
}

export function addCustomPreset(label: string, modelIds: string[], description?: string): CustomPreset {
  const preset: CustomPreset = {
    id: `custom-${Date.now()}`,
    label: label.toUpperCase().slice(0, 24),
    description: description ?? `${modelIds.length} models`,
    modelIds,
    custom: true,
    createdAt: new Date().toISOString(),
  };
  const current = loadCustomPresets();
  current.unshift(preset);
  saveCustomPresets(current);
  return preset;
}

export function deleteCustomPreset(id: string) {
  const current = loadCustomPresets().filter((p) => p.id !== id);
  saveCustomPresets(current);
}
