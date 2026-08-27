import type { Tier } from "./models";

export type HistoryEntry = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  tiers: { id: string; label: string; color: string; items: string[] }[];
  pool: string[];
  selectionIds: string[];
};

const KEY = "models-tierlist-history";
const MAX = 50;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {}
}

export function upsertHistory(entry: HistoryEntry) {
  const list = loadHistory();
  const idx = list.findIndex((e) => e.id === entry.id);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  saveHistory(list);
}

export function deleteHistory(id: string) {
  const list = loadHistory().filter((e) => e.id !== id);
  saveHistory(list);
}

export function upsertHistoryByName(
  entry: Omit<HistoryEntry, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
): HistoryEntry {
  const list = loadHistory();
  const name = entry.title.trim().toLowerCase();
  const idx = list.findIndex((e) => e.title.trim().toLowerCase() === name);
  const now = new Date().toISOString();
  const next: HistoryEntry = {
    id: idx >= 0 ? list[idx].id : (entry.id ?? `list-${Date.now()}`),
    createdAt: idx >= 0 ? list[idx].createdAt : now,
    updatedAt: now,
    ...entry,
  };
  if (idx >= 0) list[idx] = next;
  else list.unshift(next);
  saveHistory(list);
  return next;
}

export function createEntryFromBoard(
  id: string,
  tiers: Tier[],
  poolIds: string[],
  selectionIds: string[],
  title?: string,
): HistoryEntry {
  const now = new Date().toISOString();
  return {
    id,
    title:
      title ??
      `TierList ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    createdAt: now,
    updatedAt: now,
    tiers: tiers.map((t) => ({
      id: t.id,
      label: t.label,
      color: t.color,
      items: t.items.map((m) => m.id),
    })),
    pool: poolIds,
    selectionIds,
  };
}
