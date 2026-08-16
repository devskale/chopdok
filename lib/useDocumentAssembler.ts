"use client";

// The assembler hook: state + side-effects around the pure lib.
//
// items[]  — ordered DocumentItems (PDF pages + images, mixed)
// edits{}  — per-item { deleted, partStart, name } (item-anchored segments)
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
  deriveParts,
  moveItem,
  insertItems,
  DEFAULT_EDIT,
} from "@/lib/documents";
import { exportPdf, ExportOptions } from "@/lib/exportPdf";

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
  togglePartStart: (id: string) => void;
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

  const togglePartStart = useCallback((id: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...DEFAULT_EDIT, ...prev[id], partStart: !prev[id]?.partStart },
    }));
  }, []);

  const setSegmentName = useCallback((id: string, name: string) => {
    setEdits((prev) => ({ ...prev, [id]: { ...DEFAULT_EDIT, ...prev[id], name } }));
  }, []);

  const clearSegmentName = useCallback((id: string) => {
    setEdits((prev) => {
      const had = prev[id];
      if (!had) return prev;
      const next = { ...prev };
      if (had.deleted || had.partStart) {
        next[id] = { deleted: had.deleted, partStart: had.partStart }; // keep flags, drop name
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
      return exportPdf(liveItems, opts);
    },
    [liveItems]
  );

  const exportSplitParts = useCallback(
    async (opts: ExportOptions = {}) => {
      const pdfs: Uint8Array[] = [];
      for (const part of parts) {
        if (part.items.length) pdfs.push(await exportPdf(part.items, opts));
      }
      return pdfs;
    },
    [parts]
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
    togglePartStart,
    setSegmentName,
    clearSegmentName,
    exportAssembledPdf,
    exportSplitParts,
    clearAll,
  };
}
