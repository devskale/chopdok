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
  deriveParts,
  moveItem,
  insertItems,
  replaceItem,
  DEFAULT_EDIT,
} from "@/lib/documents";
import { exportPdf, ExportOptions, OutlineEntry } from "@/lib/exportPdf";
import { CropRect, croppedItemFrom } from "@/lib/crop";

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
  /** Toggle the virtual segment boundary on an item (merge/split). */
  toggleSegmentStart: (id: string) => void;
  /** Crop an item to a region. keepOriginal=true inserts a copy after it. */
  cropItem: (id: string, rect: CropRect, keepOriginal: boolean) => Promise<void>;
  setSegmentName: (id: string, name: string) => void;
  clearSegmentName: (id: string) => void;
  /** Page note (free-form metadata, shown on the card). */
  setItemNote: (id: string, note: string) => void;

  /** One PDF from all live items (checkout: "one file"). */
  exportAssembledPdf: (opts?: ExportOptions) => Promise<Uint8Array>;
  /** One PDF per segment (checkout: "every segment"). */
  exportSegmentPdfs: (opts?: ExportOptions) => Promise<Uint8Array[]>;
  /** One PDF for a single segment, by its identity anchor (checkout: "this segment"). */
  exportSegmentPdf: (startItemId: string, opts?: ExportOptions) => Promise<Uint8Array>;
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
        // Each file arrives as an auto-named virtual segment, so multi-file
        // docs come in pre-segmented: remove the marker to merge, export any
        // granularity at checkout.
        const firstId = result.items[0].id;
        const autoName = list[f].name.replace(/\.[^.]+$/, "");
        setEdits((prev) => ({
          ...prev,
          [firstId]: {
            ...DEFAULT_EDIT,
            ...prev[firstId],
            segmentStart: true,
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

  const toggleSegmentStart = useCallback((id: string) => {
    setEdits((prev) => {
      const had = prev[id];
      const next = { ...DEFAULT_EDIT, ...had, segmentStart: !had?.segmentStart };
      const out: ItemEdits = { ...prev, [id]: next };
      if (!next.segmentStart && !next.deleted && !next.name) delete out[id];
      return out;
    });
  }, []);

  const cropItem = useCallback(
    async (id: string, rect: CropRect, keepOriginal: boolean) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      let fresh: DocumentItem;
      try {
        fresh = await croppedItemFrom(item, rect);
      } catch (err) {
        console.error("Crop failed:", err);
        toast({
          variant: "destructive",
          title: "Couldn't crop",
          description: "Something went wrong while cropping this page.",
        });
        return;
      }
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === id);
        if (idx === -1) return prev;
        return keepOriginal ? insertItems(prev, [fresh], idx + 1) : replaceItem(prev, id, fresh);
      });
      if (!keepOriginal) {
        // The cropped page INHERITS the original's segment identity (marker +
        // name), so names survive a crop-in-place.
        setEdits((prev) => {
          const old = prev[id];
          if (!old) return prev;
          const next = { ...prev };
          delete next[id];
          if (old.segmentStart || old.name) {
            next[fresh.id] = { deleted: false, segmentStart: old.segmentStart, name: old.name };
          }
          return next;
        });
      }
    },
    [items]
  );

  const setSegmentName = useCallback((id: string, name: string) => {
    setEdits((prev) => ({ ...prev, [id]: { ...DEFAULT_EDIT, ...prev[id], name } }));
  }, []);

  const setItemNote = useCallback((id: string, note: string) => {
    setEdits((prev) => {
      const next = { ...DEFAULT_EDIT, ...prev[id], note: note.trim() || undefined };
      const out: ItemEdits = { ...prev, [id]: next };
      if (!next.deleted && !next.segmentStart && !next.name && !next.note) delete out[id];
      return out;
    });
  }, []);

  const clearSegmentName = useCallback((id: string) => {
    setEdits((prev) => {
      const had = prev[id];
      if (!had) return prev;
      const next = { ...prev };
      if (had.deleted || had.segmentStart) {
        next[id] = { deleted: had.deleted, segmentStart: had.segmentStart }; // keep flags, drop name
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

  /** Checkout option 1: ONE PDF — all segments become its bookmarks. */
  const exportAssembledPdf = useCallback(
    async (opts: ExportOptions = {}) => {
      if (!liveItems.length) throw new Error("Nothing to export");
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

  /** Checkout option 2: EVERY segment as its own PDF (same order as parts). */
  const exportSegmentPdfs = useCallback(
    async (opts: ExportOptions = {}) => {
      const pdfs: Uint8Array[] = [];
      for (const part of parts) {
        if (!part.items.length) continue;
        pdfs.push(await exportPdf(part.items, { ...opts, title: part.name }));
      }
      return pdfs;
    },
    [parts]
  );

  /** Checkout option 3: ONE selected segment (by its identity anchor). */
  const exportSegmentPdf = useCallback(
    async (startItemId: string, opts: ExportOptions = {}) => {
      const part = parts.find((p) => p.startItemId === startItemId);
      if (!part || !part.items.length) throw new Error("Segment not found");
      return exportPdf(part.items, { ...opts, title: part.name });
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
    toggleSegmentStart,
    cropItem,
    setSegmentName,
    clearSegmentName,
    setItemNote,
    exportAssembledPdf,
    exportSegmentPdfs,
    exportSegmentPdf,
    clearAll,
  };
}
