import { DEFAULT_TIERS } from "./models";

export type BoardStoredTier = {
  id: string;
  label: string;
  color: string;
  items: string[];
};

export type BoardState = {
  v: 2;
  tiers: BoardStoredTier[];
  pool: string[];
  selectionIds: string[];
  updatedAt: string;
};

export const BOARD_KEY = "models-tierlist-board-v2";
const LEGACY_KEY = "models-tierlist-v1";
const LAST_SELECTION_KEY = "models-tierlist-last-selection";

function nowIso() {
  return new Date().toISOString();
}

export function loadBoard(): BoardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    if (raw) {
      const data = JSON.parse(raw) as BoardState;
      if (data?.v === 2 && Array.isArray(data.tiers) && Array.isArray(data.pool) && Array.isArray(data.selectionIds)) {
        return data;
      }
    }
    // migrate legacy v1 if present
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as {
        v: number;
        selectionKey: string;
        tiers: BoardStoredTier[];
        pool: string[];
      };
      if (legacy?.v === 1 && Array.isArray(legacy.tiers) && Array.isArray(legacy.pool)) {
        const selectionIds = [...legacy.pool, ...legacy.tiers.flatMap((t) => t.items)];
        // dedupe
        const uniq = [...new Set(selectionIds)];
        return {
          v: 2,
          tiers: legacy.tiers,
          pool: legacy.pool,
          selectionIds: uniq,
          updatedAt: nowIso(),
        };
      }
    }
    // fallback to last-selection if no board yet
    const lastRaw = localStorage.getItem(LAST_SELECTION_KEY);
    if (lastRaw) {
      const arr = JSON.parse(lastRaw) as string[];
      if (Array.isArray(arr) && arr.length > 0) {
        const tiers: BoardStoredTier[] = DEFAULT_TIERS.map((t) => ({
          id: t.id,
          label: t.label,
          color: t.color,
          items: [],
        }));
        return {
          v: 2,
          tiers,
          pool: [...arr],
          selectionIds: [...arr],
          updatedAt: nowIso(),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function saveBoard(board: BoardState) {
  try {
    board.updatedAt = nowIso();
    localStorage.setItem(BOARD_KEY, JSON.stringify(board));
    // keep last-selection in sync for legacy restore path
    try {
      localStorage.setItem(LAST_SELECTION_KEY, JSON.stringify(board.selectionIds));
    } catch {}
  } catch {}
}

export function clearBoard() {
  try {
    localStorage.removeItem(BOARD_KEY);
  } catch {}
}

export function createBoardFromSelection(selectionIds: string[]): BoardState {
  const tiers: BoardStoredTier[] = DEFAULT_TIERS.map((t) => ({
    id: t.id,
    label: t.label,
    color: t.color,
    items: [],
  }));
  return {
    v: 2,
    tiers,
    pool: [...selectionIds],
    selectionIds: [...selectionIds],
    updatedAt: nowIso(),
  };
}

/**
 * Merge a new selection from the selector into an existing board.
 * - Keeps existing tier order/labels/colors and their placed items (if still selected).
 * - Removes ids that are no longer selected from wherever they live.
 * - Adds newly selected ids to pool (not auto-placing into tiers).
 */
export function mergeSelectionIntoBoard(
  board: BoardState,
  newSelectionIds: string[],
): BoardState {
  const newSet = new Set(newSelectionIds);
  const oldAll = new Set([...board.pool, ...board.tiers.flatMap((t) => t.items)]);
  const toAdd = newSelectionIds.filter((id) => !oldAll.has(id));
  const toRemove = [...oldAll].filter((id) => !newSet.has(id));
  const removeSet = new Set(toRemove);

  let nextTiers = board.tiers;
  let nextPool = board.pool;

  if (removeSet.size > 0) {
    nextTiers = nextTiers.map((t) => ({
      ...t,
      items: t.items.filter((id) => !removeSet.has(id)),
    }));
    nextPool = nextPool.filter((id) => !removeSet.has(id));
  }
  if (toAdd.length > 0) {
    nextPool = [...nextPool, ...toAdd];
  }

  // also ensure selectionIds exactly matches newSelectionIds (preserve order of new selection)
  return {
    v: 2,
    tiers: nextTiers,
    pool: nextPool,
    selectionIds: [...newSelectionIds],
    updatedAt: nowIso(),
  };
}
