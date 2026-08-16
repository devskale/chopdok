// Core document model for the assembler.
//
// A "document" is an ordered list of items. An item is either a single page
// from a PDF, or a standalone image. All operations (reorder, split, delete,
// rename) act on the list; export builds a PDF from the ordered items.
//
// This module is pure and DOM-free so the arrange logic stays unit-testable.

export type ItemKind = "page" | "image";

/** Where an item's real bytes come from at export time. */
export type ItemSource =
  | { type: "pdf"; file: File; pageIndex: number } // page N of a PDF file
  | { type: "image"; file: File }; // a standalone image file

export interface DocumentItem {
  /** Stable identity — survives reorder/split so labels stay anchored. */
  id: string;
  kind: ItemKind;
  /** Display label (renameable; defaults to a part name). */
  label: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  source: ItemSource;
}

export function makeItemId(): string {
  // Enough uniqueness for a client-side session (crypto.randomUUID when available).
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Move an item from one index to another. Returns a new array.
 * `to` is the index the item lands at (0-based), clamped to bounds.
 */
export function moveItem(items: DocumentItem[], from: number, to: number): DocumentItem[] {
  if (from < 0 || from >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  const clamped = Math.max(0, Math.min(to, next.length));
  next.splice(clamped, 0, item);
  return next;
}

/** Insert items at a given index (for merge/append). Returns a new array. */
export function insertItems(
  items: DocumentItem[],
  newItems: DocumentItem[],
  at: number
): DocumentItem[] {
  const next = [...items];
  const clamped = Math.max(0, Math.min(at, next.length));
  next.splice(clamped, 0, ...newItems);
  return next;
}

/** Remove items at the given indices. Returns a new array. */
export function removeItems(items: DocumentItem[], indices: number[]): DocumentItem[] {
  const drop = new Set(indices);
  return items.filter((_, i) => !drop.has(i));
}

// ---- Segment (part) model — item-anchored ----
// A split is a `partStart` marker ON an item ("this item starts a new segment"),
// not a positional index array. A segment's identity is the id of its first
// LIVE item, so names survive reorder (generalizes the old #4 startPage fix).

export interface ItemEditState {
  /** Shaded out — excluded from export but stays visible in the grid. */
  deleted: boolean;
  /** Scissors marker — this item begins a new segment. */
  partStart: boolean;
  /** Custom segment name (meaningful when partStart, shown in summary). */
  name?: string;
}

export type ItemEdits = Record<string, ItemEditState>;

export const DEFAULT_EDIT: ItemEditState = { deleted: false, partStart: false };

export interface Part {
  /** Identity anchor — id of this part's first live item. */
  startItemId: string;
  /** 1-based position among live parts. */
  index: number;
  /** Custom name (carried across deleted boundary items), if any. */
  name?: string;
  /** Live (non-deleted) items, in order. */
  items: DocumentItem[];
}

const editOf = (edits: ItemEdits, id: string): ItemEditState => edits[id] ?? DEFAULT_EDIT;

// ---- Source-document runs (for doc borders in the grid) ----

export interface DocRun {
  /** The source file (identity = reference; PDF pages share one File). */
  file: File;
  /** Index of the run's first item in the ordered list. */
  startIndex: number;
  /** Consecutive items from this file. */
  length: number;
}

/**
 * Group consecutive items sharing a source file. Pure and dynamic: runs are
 * recomputed on every reorder, so document borders always sit where the
 * source file actually changes.
 */
export function deriveDocRuns(items: DocumentItem[]): DocRun[] {
  const runs: DocRun[] = [];
  items.forEach((item, index) => {
    const prev = items[index - 1];
    if (prev && prev.source.file === item.source.file && runs.length) {
      runs[runs.length - 1].length++;
    } else {
      runs.push({ file: item.source.file, startIndex: index, length: 1 });
    }
  });
  return runs;
}

/**
 * Walk the ordered items and group them into live segments.
 *
 * Boundary semantics:
 * - The first live item implicitly starts part 1.
 * - A `partStart` marker on a DELETED item stays "pending": the boundary (and
 *   its custom name) carries to the next live item. Deleting a cut's first
 *   page therefore does NOT merge the segments (matches the old splitter).
 * - A segment whose every item is deleted produces no part (never an empty PDF).
 */
export function deriveParts(items: DocumentItem[], edits: ItemEdits = {}): Part[] {
  const parts: Part[] = [];
  let pendingBoundary = false;
  let pendingName: string | undefined;

  for (const item of items) {
    const e = editOf(edits, item.id);
    if (e.partStart) {
      pendingBoundary = true;
      if (e.name) pendingName = e.name; // newest cut's name wins while pending
    }
    if (e.deleted) continue;

    if (pendingBoundary || parts.length === 0) {
      parts.push({
        startItemId: item.id,
        index: parts.length + 1,
        name: pendingName,
        items: [item],
      });
      pendingBoundary = false;
      pendingName = undefined;
    } else {
      parts[parts.length - 1].items.push(item);
    }
  }
  return parts;
}

/**
 * Per-item 0-based segment index for display (tinting, labels) — includes
 * deleted items so the grid stays stable. Deleted boundary items tint with the
 * preceding segment; leading deletions clamp to segment 0.
 */
export function assignPartIndices(items: DocumentItem[], edits: ItemEdits = {}): number[] {
  const result = new Array<number>(items.length).fill(0);
  let current = -1;
  let pendingBoundary = false;

  items.forEach((item, i) => {
    const e = editOf(edits, item.id);
    if (e.partStart) pendingBoundary = true;
    if (e.deleted) {
      result[i] = Math.max(current, 0);
      return;
    }
    if (pendingBoundary || current === -1) {
      current++;
      pendingBoundary = false;
    }
    result[i] = current;
  });
  return result;
}
