"use client";

// The assembler hook: state + side-effects around the pure lib.
//
// items[]  — ordered DocumentItems (PDF pages + images, mixed)
// edits{}  — per-item { deleted, boundary?: "index"|"split", name } 
//
// Everything pure lives in lib/documents.ts + lib/exportPdf.ts; this hook
// owns ingest (progress, cancellation, toasts) and object-URL hygiene.

import { useState, useCallback, useMemo, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { ingestFile } from "@/lib/ingest";
import {
  DocumentItem,
  ItemEdits,
  Part,
  Boundary,
  deriveParts,
  deriveSplitUnits,
  moveItem,
  insertItems,
  DEFAULT_EDIT,
} from "@/lib/documents";
import { exportPdf, ExportOptions, OutlineEntry } from "@/lib/exportPdf";

export interface DocumentAssemblerHook {
  items: DocumentItem[];
  edits: ItemEdits;
  /** Live segments derived from items + edits (memoized). */
  parts: Part[];
  /** True while any ingest is running. */
  isBusy: boolean;
  /** Overall ingest progress 0..100 across the current file batch. */
  progress: number;
  /** Number of items excluded from export. */
  deletedCount: number;

  addFiles: (files: FileList | File[]) => Promise<void>;
  move: (from: number, to: number) => void;
  /** Shift an item one slot (arrow buttons). delta: -1 | +1 */
  shift: (index: number, delta: -1 | 1) => void;
  toggleDeleted: (id: string) => void;
  /** Set/clear a boundary on an item. null removes it (merges the segments). */
  setBoundary: (id: string, kind: Boundary | null) => void;
  setSegmentName: (id: string, name: string) => void;
  clearSegmentName: (id: string) => void;

  /** One PDF from all live items (the merge/assemble action). */
  exportAssembledPdf: (opts?: ExportOptions) => Promise<Uint8Array>;
  /** One PDF per live segment (the split action). */
  exportSplitParts: (opts?: ExportOptions) => Promise<Uint8Array[]>;
  clearAll: () => void;
}

export function useDocumentAssembler(): DocumentAssemblerHook {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [edits, setEdits] = useState<ItemEdits>({});
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  // Token: a newer addFiles call cancels any in-flight ingest.
  const ingestTokenRef = useRef(0);

  const parts = useMemo(() => deriveParts(items, edits), [items, edits]);
  const deletedCount = useMemo(
    () => items.filter((i) => edits[i.id]?.deleted).length,
    [items, edits]
  );

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;

    const myToken = ++ingestTokenRef.current;
    setIsBusy(true);
    setProgress(0);

    let added = 0;
    for (let f = 0; f < list.length; f++) {
      if (myToken !== ingestTokenRef.current) return; // superseded
      const result = await ingestFile(list[f], {
        onProgress: (fraction) =>
          setProgress(Math.round(((f + fraction) / list.length) * 100)),
        isCancelled: () => myToken !== ingestTokenRef.current,
      });
      if (myToken !== ingestTokenRef.current) return;

      if (!result.ok) {
        toast({ variant: "destructive", title: "Couldn't add file", description: result.error });
        continue;
      }
      if (result.items.length) {
        setItems((prev) => insertItems(prev, result.items, prev.length));
        // Each file arrives as an auto-named index segment (virtual boundary),
        // so multi-file docs come in pre-segmented and mergeable: remove the
        // bookmark to fuse, flip to scissors for a real cut.
        const firstId = result.items[0].id;
        const autoName = list[f].name.replace(/\.[^.]+$/, "");
        setEdits((prev) => ({
          ...prev,
          [firstId]: {
            ...DEFAULT_EDIT,
            ...prev[firstId],
            boundary: "index",
            name: prev[firstId]?.name ?? autoName,
          },
        }));
        added += result.items.length;
      }
    }
    if (myToken === ingestTokenRef.current) {
      setProgress(100);
      setIsBusy(false);
      if (added > 0) {
        toast({
          title: "Added",
          description: `${added} item${added === 1 ? "" : "s"} in the document.`,
        });
      }
    }
  }, []);

  const move = useCallback((from: number, to: number) => {
    setItems((prev) => moveItem(prev, from, to));
  }, []);

  const shift = useCallback((index: number, delta: -1 | 1) => {
    setItems((prev) => moveItem(prev, index, index + delta));
  }, []);

  const toggleDeleted = useCallback((id: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...DEFAULT_EDIT, ...prev[id], deleted: !prev[id]?.deleted },
    }));
  }, []);

  const setBoundary = useCallback((id: string, kind: Boundary | null) => {
    setEdits((prev) => {
      const had = prev[id];
      const next = { ...DEFAULT_EDIT, ...had };
      if (kind) next.boundary = kind;
      else delete next.boundary;
      const out: ItemEdits = { ...prev, [id]: next };
      if (!next.boundary && !next.deleted && !next.name) delete out[id];
      return out;
    });
  }, []);

  const setSegmentName = useCallback((id: string, name: string) => {
    setEdits((prev) => ({ ...prev, [id]: { ...DEFAULT_EDIT, ...prev[id], name } }));
  }, []);

  const clearSegmentName = useCallback((id: string) => {
    setEdits((prev) => {
      const had = prev[id];
      if (!had) return prev;
      const next = { ...prev };
      if (had.deleted || had.boundary) {
        next[id] = { deleted: had.deleted, boundary: had.boundary }; // keep flags, drop name
      } else {
        delete next[id];
      }
      return next;
    });
  }, []);

  const liveItems = useMemo(
    () => items.filter((i) => !edits[i.id]?.deleted),
    [items, edits]
  );

  const exportAssembledPdf = useCallback(
    async (opts: ExportOptions = {}) => {
      if (!liveItems.length) throw new Error("Nothing to export");
      // One PDF; every named segment (index OR split kind) becomes a bookmark.
      const outline: OutlineEntry[] = [];
      let cursor = 0;
      for (const part of parts) {
        if (part.name) outline.push({ title: part.name, pageIndex: cursor });
        cursor += part.items.length;
      }
      return exportPdf(liveItems, { ...opts, outline: outline.length ? outline : undefined });
    },
    [liveItems, parts]
  );

  const exportSplitParts = useCallback(
    async (opts: ExportOptions = {}) => {
      // Real cuts at SPLIT boundaries only; index segments inside a part
      // become that part's bookmarks.
      const units = deriveSplitUnits(items, edits);
      const pdfs: Uint8Array[] = [];
      for (const unit of units) {
        if (!unit.items.length) continue;
        const outline: OutlineEntry[] = [];
        let cursor = 0;
        for (const seg of unit.segments) {
          if (seg.name) outline.push({ title: seg.name, pageIndex: cursor });
          cursor += seg.items.length;
        }
        pdfs.push(
          await exportPdf(unit.items, {
            ...opts,
            outline: outline.length ? outline : undefined,
            title: unit.name,
          })
        );
      }
      return pdfs;
    },
    [items, edits]
  );

  const clearAll = useCallback(() => {
    ingestTokenRef.current++; // cancel in-flight ingest
    // Revoke image-kind object-URL thumbnails (data URLs are GC'd fine).
    for (const item of items) {
      if (item.source.type === "image" && item.thumbnailUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(item.thumbnailUrl);
        } catch {}
      }
    }
    setItems([]);
    setEdits({});
    setProgress(0);
    setIsBusy(false);
  }, [items]);

  return {
    items,
    edits,
    parts,
    isBusy,
    progress,
    deletedCount,
    addFiles,
    move,
    shift,
    toggleDeleted,
    setBoundary,
    setSegmentName,
    clearSegmentName,
    exportAssembledPdf,
    exportSplitParts,
    clearAll,
  };
}
