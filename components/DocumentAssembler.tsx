"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import Image from "next/image";
import {
  useDocumentAssembler,
  DocumentAssemblerHook,
} from "@/lib/useDocumentAssembler";
import { assignPartIndices, deriveDocRuns, DocRun } from "@/lib/documents";
import { PageSizeOption } from "@/lib/exportPdf";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Scissors,
  Plus,
  Minus,
  Upload,
  X,
  Download,
  Archive,
  Eraser,
  FileText,
  Image as ImageIcon,
  Edit2,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Layers,
  Bookmark,
} from "lucide-react";
import JSZip from "jszip";

const sectionTints = [
  "bg-primary/10",
  "bg-cyan-500/10",
  "bg-fuchsia-500/10",
  "bg-emerald-500/10",
  "bg-amber-500/10",
  "bg-rose-500/10",
  "bg-indigo-500/10",
  "bg-teal-500/10",
];

const buf = (u: Uint8Array): ArrayBuffer =>
  u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;

const pdfFile = (bytes: Uint8Array, name: string): { name: string; url: string } => {
  const url = URL.createObjectURL(new Blob([buf(bytes)], { type: "application/pdf" }));
  return { name, url };
};

export const DocumentAssembler: React.FC = () => {
  const {
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
    exportAssembledPdf,
    exportSplitParts,
    clearAll,
  }: DocumentAssemblerHook = useDocumentAssembler();

  const [thumbnailSize, setThumbnailSize] = useState(2); // 1-4 zoom
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null); // gap index: insert before items[dropTarget]
  const dragIndexRef = useRef<number | null>(null);
  const dropTargetRef = useRef<number | null>(null);
  const [pageSize, setPageSize] = useState<PageSizeOption>("fit");
  const [isExporting, setIsExporting] = useState(false);
  const [results, setResults] = useState<{ name: string; url: string }[]>([]);
  const [downloaded, setDownloaded] = useState<Set<number>>(new Set());
  const [isZipDownloaded, setIsZipDownloaded] = useState(false);

  // Rename dialog
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [newPartName, setNewPartName] = useState("");
  const [isRenameOpen, setIsRenameOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const increaseThumbnailSize = useCallback(
    () => setThumbnailSize((p) => Math.min(p + 1, 4)),
    []
  );
  const decreaseThumbnailSize = useCallback(
    () => setThumbnailSize((p) => Math.max(p - 1, 1)),
    []
  );

  const gridCols = {
    1: "grid-cols-5",
    2: "grid-cols-4",
    3: "grid-cols-3",
    4: "grid-cols-2",
  }[thumbnailSize];

  // Per-item segment index for tinting/labels (includes deleted items).
  const partIndices = useMemo(() => assignPartIndices(items, edits), [items, edits]);
  // Source-document runs -> bordered groups in the grid (recomputed on reorder).
  const docRuns = useMemo(() => deriveDocRuns(items), [items]);
  const partByStart = useMemo(() => {
    const map = new Map<string, (typeof parts)[number]>();
    for (const p of parts) map.set(p.startItemId, p);
    return map;
  }, [parts]);

  // ---- file dropzone (files only — internal reorder drags are excluded) ----
  const hasFiles = (e: React.DragEvent) => e.dataTransfer?.types?.includes("Files");

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragging(false);
    if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
  };

  // ---- reorder (native DnD with gap indicator + arrow buttons) ----
  const clearDragState = () => {
    dragIndexRef.current = null;
    dropTargetRef.current = null;
    setDraggingIndex(null);
    setDropTarget(null);
  };
  const handleCardDragStart = (index: number) => {
    dragIndexRef.current = index;
    setDraggingIndex(index);
  };
  const handleCardDragOver = (e: React.DragEvent<HTMLElement>, index: number) => {
    if (dragIndexRef.current === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // Pointer in the left half of the card -> gap before it; right half -> after.
    const rect = e.currentTarget.getBoundingClientRect();
    const gap = e.clientX < rect.left + rect.width / 2 ? index : index + 1;
    dropTargetRef.current = gap;
    setDropTarget(gap);
  };
  const handleCardDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const from = dragIndexRef.current;
    const gap = dropTargetRef.current;
    clearDragState();
    if (from === null || gap === null) return;
    // Gap (original-array) -> insertion index in the array without the item.
    const to = gap > from ? gap - 1 : gap;
    if (to !== from) move(from, to);
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) await addFiles(e.target.files);
    },
    [addFiles]
  );

  // ---- exports ----
  const replaceResults = (next: { name: string; url: string }[]) => {
    setResults((prev) => {
      for (const r of prev) {
        try {
          URL.revokeObjectURL(r.url);
        } catch {}
      }
      return next;
    });
    setDownloaded(new Set());
    setIsZipDownloaded(false);
  };

  const handleAssemble = async () => {
    setIsExporting(true);
    try {
      const bytes = await exportAssembledPdf({ pageSize });
      replaceResults([pdfFile(bytes, "chopdok-assembled.pdf")]);
    } catch (err) {
      console.error("Assemble failed:", err);
      replaceResults([]);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSplitParts = async () => {
    setIsExporting(true);
    try {
      const pdfs = await exportSplitParts({ pageSize });
      replaceResults(
        pdfs.map((bytes, i) => {
          const name = parts[i]?.name;
          return pdfFile(bytes, `Part ${i + 1}${name ? ` - ${name}` : ""}.pdf`);
        })
      );
    } catch (err) {
      console.error("Split failed:", err);
      replaceResults([]);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder("chopdok_parts");
    if (!folder) return;
    for (const r of results) {
      const blob = await (await fetch(r.url)).blob();
      folder.file(r.name, blob);
    }
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chopdok_parts.zip";
    a.click();
    URL.revokeObjectURL(url);
    setIsZipDownloaded(true);
  };

  const handleClearAll = useCallback(() => {
    for (const r of results) {
      try {
        URL.revokeObjectURL(r.url);
      } catch {}
    }
    clearAll();
    setResults([]);
    setDownloaded(new Set());
    setIsZipDownloaded(false);
    setThumbnailSize(2);
    clearDragState();
    const input = document.getElementById("file-upload") as HTMLInputElement | null;
    if (input) input.value = "";
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [clearAll, results]);

  // ---- rename dialog ----
  const openRename = (itemId: string, currentName: string) => {
    setRenamingItemId(itemId);
    setNewPartName(currentName);
    setIsRenameOpen(true);
  };
  const saveRename = () => {
    if (renamingItemId && newPartName.trim() !== "") {
      setSegmentName(renamingItemId, newPartName.trim());
    }
    setIsRenameOpen(false);
    setRenamingItemId(null);
    setNewPartName("");
  };

  // Keyboard zoom (guard text inputs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        t?.tagName === "SELECT" ||
        t?.isContentEditable
      )
        return;
      if (e.key === "+" || e.key === "=") increaseThumbnailSize();
      else if (e.key === "-" || e.key === "_") decreaseThumbnailSize();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [increaseThumbnailSize, decreaseThumbnailSize]);

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const liveCount = items.length - deletedCount;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-5xl">
      {/* Dropzone */}
      <div
        className={`relative flex items-center justify-center transition-all duration-300 ease-out rounded-2xl border-2 border-dashed overflow-hidden ${
          items.length
            ? "p-5 flex-row gap-6 border-border/70 bg-secondary/30"
            : `flex-col p-12 sm:p-16 ${
                isFileDragging
                  ? "border-primary bg-primary/10 scale-[1.01] glow-primary"
                  : "border-border/60 hover:border-primary/50 hover:bg-secondary/20"
              }`
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}>
        {!items.length ? (
          <div className="flex flex-col items-center text-center gap-5">
            <div
              className={`grid place-items-center w-16 h-16 rounded-2xl transition-colors ${
                isFileDragging
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-muted-foreground"
              }`}>
              <Upload className="w-7 h-7" strokeWidth={1.75} />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="file-upload"
                className="cursor-pointer block"
                aria-label="Select PDF or image files">
                <span className="font-semibold text-lg text-foreground">
                  Click to upload
                </span>
                <span className="text-muted-foreground"> or drag &amp; drop</span>
              </label>
              <Input
                id="file-upload"
                type="file"
                accept="application/pdf,image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload PDFs or images"
              />
              <p className="text-sm text-muted-foreground/80">
                PDFs &amp; images · mix freely · stays on your device
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="grid place-items-center p-2.5 rounded-xl bg-rose-500/15 ring-1 ring-rose-500/25">
                  <FileText className="text-rose-400 w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="grid place-items-center p-2.5 rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/25">
                  <ImageIcon className="text-cyan-400 w-5 h-5" strokeWidth={1.75} />
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {items.length} item{items.length === 1 ? "" : "s"} in the document
                </p>
                <p className="text-sm text-muted-foreground font-mono">
                  {liveCount} live{deletedCount ? ` · ${deletedCount} removed` : ""}
                  {parts.length > 1 ? ` · ${parts.length} segments` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="file-upload-add" className="cursor-pointer">
                <Button variant="outline" size="sm" className="pointer-events-none">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add files
                </Button>
              </label>
              <Input
                id="file-upload-add"
                type="file"
                accept="application/pdf,image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                aria-label="Add PDFs or images"
              />
            </div>
          </div>
        )}
      </div>

      {isBusy && (
        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm text-muted-foreground shrink-0">
            Reading files…
          </span>
          <Progress value={progress} className="flex-1" />
          <span className="text-sm font-medium tabular-nums w-10 text-right font-mono">
            {progress}%
          </span>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-8 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
            <h2 className="text-lg font-semibold flex items-center gap-2.5">
              <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-primary to-fuchsia-400" />
              Document
            </h2>
            <div className="flex items-center gap-1.5 bg-secondary/60 border border-border/60 p-1 rounded-xl">
              <Button
                onClick={decreaseThumbnailSize}
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Zoom Out"
                aria-label="Zoom Out">
                <Minus size={16} />
              </Button>
              <span className="text-sm font-medium w-12 text-center font-mono">
                {thumbnailSize * 50}%
              </span>
              <Button
                onClick={increaseThumbnailSize}
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Zoom In"
                aria-label="Zoom In">
                <Plus size={16} />
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button
                onClick={handleClearAll}
                size="sm"
                variant="destructive"
                className="h-8 px-3 text-xs"
                title="Clear all"
                aria-label="Clear all">
                <Eraser size={14} className="mr-1.5" />
                Clear
              </Button>
            </div>
          </div>

          {/* Grid */}
          <div
            ref={scrollContainerRef}
            className="overflow-y-auto max-h-[600px] p-4 rounded-2xl bg-background/30">
            <div className="space-y-6">
              {docRuns.map((run: DocRun) => (
                <div
                  key={run.startIndex}
                  className="rounded-2xl border border-border/60 bg-background/20 p-3 space-y-3">
                  {/* Doc border header */}
                  <div className="flex items-center gap-2 min-w-0 px-1 pt-1">
                    <span className="grid place-items-center w-6 h-6 rounded-md bg-secondary/70 border border-border/60 shrink-0">
                      {run.file.type === "application/pdf" || /\.pdf$/i.test(run.file.name) ? (
                        <FileText size={12} className="text-rose-400" />
                      ) : (
                        <ImageIcon size={12} className="text-cyan-400" />
                      )}
                    </span>
                    <span className="text-xs font-medium text-foreground/80 truncate">
                      {run.file.name}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">
                      {run.length} item{run.length === 1 ? "" : "s"}
                    </span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                  <div className={`grid ${gridCols} gap-5`}>
                    {items.slice(run.startIndex, run.startIndex + run.length).map((item, localIdx) => {
                      const index = run.startIndex + localIdx;
                      const edit = edits[item.id];
                      const isShaded = !!edit?.deleted;
                      const partIdx = partIndices[index];
                      const sectionColor = sectionTints[partIdx % sectionTints.length];
                      const part = partByStart.get(item.id);
                      const isPartStart = !!part;
                      const displayPartName = part?.name ?? `Part ${(partIdx ?? 0) + 1}`;
                      const nextEdit = items[index + 1] ? edits[items[index + 1].id] : undefined;
                      const nextBoundary = nextEdit?.boundary; // boundary on the FOLLOWING item
                      const isDragging = draggingIndex === index;
                      const gapBefore = dropTarget === index;
                      const gapAfterEnd =
                        dropTarget === items.length && index === items.length - 1;

                      return (
                        <div key={item.id} className="relative group">
                          {/* Insertion gap indicator — glowing bar at the drop gap */}
                          {draggingIndex !== null && gapBefore && (
                            <div className="absolute -left-3 top-0 bottom-0 w-1.5 rounded-full bg-primary glow-primary z-30 pointer-events-none animate-pulse" />
                          )}
                          {draggingIndex !== null && gapAfterEnd && (
                            <div className="absolute -right-3 top-0 bottom-0 w-1.5 rounded-full bg-primary glow-primary z-30 pointer-events-none animate-pulse" />
                          )}

                          <div
                            draggable
                            onDragStart={(e) => {
                              handleCardDragStart(index);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={clearDragState}
                            onDragOver={(e) => handleCardDragOver(e, index)}
                            onDrop={handleCardDrop}
                            className={`relative rounded-xl overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/40 cursor-grab active:cursor-grabbing ${sectionColor} ${
                              isShaded ? "opacity-40 grayscale" : ""
                            } ${isDragging ? "opacity-30 grayscale scale-95 ring-2 ring-primary/60 border-dashed" : ""} ${
                              gapBefore ? "-translate-x-1.5" : ""
                            } ${gapAfterEnd ? "translate-x-1.5" : ""}`}>
                            <div className="aspect-[1/1.4] relative bg-background/60">
                              <Image
                                src={item.thumbnailUrl}
                                alt={item.label}
                                fill
                                sizes="20vw"
                                unoptimized
                                className="object-contain p-2"
                              />
                              <div className="absolute top-2 right-2 grid place-items-center w-5 h-5 rounded-md bg-background/70 border border-border/60 pointer-events-none">
                                {item.kind === "image" ? (
                                  <ImageIcon size={11} className="text-muted-foreground" />
                                ) : (
                                  <FileText size={11} className="text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />

                            {/* Label bar */}
                            <div className="absolute bottom-0 left-0 right-0 glass border-t border-white/10 p-2 flex justify-between items-center">
                              <button
                                className={`text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1 max-w-[70%] transition-colors ${
                                  isPartStart
                                    ? "cursor-pointer hover:bg-primary/20 hover:text-primary"
                                    : "cursor-default text-muted-foreground"
                                }`}
                                onClick={(e) => {
                                  if (isPartStart && part) {
                                    e.stopPropagation();
                                    openRename(part.startItemId, displayPartName);
                                  }
                                }}
                                disabled={!isPartStart}
                                aria-label={isPartStart ? "Rename segment" : "Segment name"}>
                                <span className="truncate">{displayPartName}</span>
                                {isPartStart && (
                                  <Edit2 size={10} className="opacity-50 shrink-0" />
                                )}
                              </button>
                              <span className="text-xs text-muted-foreground font-mono">
                                {index + 1}
                              </span>
                            </div>

                            {/* Remove / restore */}
                            <Button
                              className={`absolute top-2 left-2 h-8 w-8 rounded-full p-0 transition-all duration-200
                                ${
                                  isShaded
                                    ? "bg-foreground text-background hover:bg-foreground/80"
                                    : "glass border border-white/15 text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive opacity-0 group-hover:opacity-100"
                                }
                              `}
                              onClick={() => toggleDeleted(item.id)}
                              title={isShaded ? "Restore item" : "Remove item"}
                              aria-label={isShaded ? "Restore item" : "Remove item"}>
                              {isShaded ? <Plus size={16} /> : <X size={16} />}
                            </Button>

                            {/* Reorder arrows */}
                            <div className="absolute bottom-12 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="glass h-6 w-6 rounded-full p-0"
                                disabled={index === 0}
                                onClick={() => shift(index, -1)}
                                title="Move earlier"
                                aria-label="Move earlier">
                                <ChevronLeft size={13} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="glass h-6 w-6 rounded-full p-0"
                                disabled={index === items.length - 1}
                                onClick={() => shift(index, 1)}
                                title="Move later"
                                aria-label="Move later">
                                <ChevronRight size={13} />
                              </Button>
                            </div>
                          </div>

                          {/* Boundary controls — act on the gap AFTER this card:
                              ✂ split = real cut into separate PDFs
                              🔖 index = virtual segment (bookmark only, no cut)
                              clicking an active control removes it (merge) */}
                          {index < items.length - 1 && (
                            <div className="absolute top-1/2 -right-3 z-10 -mt-7 flex flex-col gap-1.5">
                              {([
                                {
                                  kind: "split" as const,
                                  icon: <Scissors size={12} />,
                                  label:
                                    nextBoundary === "split"
                                      ? `Remove split before item ${index + 2}`
                                      : `Split before item ${index + 2}`,
                                  active: nextBoundary === "split",
                                  activeCls:
                                    "bg-primary border-primary text-primary-foreground glow-primary",
                                },
                                {
                                  kind: "index" as const,
                                  icon: <Bookmark size={12} />,
                                  label:
                                    nextBoundary === "index"
                                      ? `Remove index segment before item ${index + 2}`
                                      : `Index segment before item ${index + 2}`,
                                  active: nextBoundary === "index",
                                  activeCls: "bg-cyan-500 border-cyan-500 text-white",
                                },
                              ] as const).map((c) => (
                                <div
                                  key={c.kind}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={c.label}
                                  title={c.label}
                                  className={`w-6 h-6 cursor-pointer rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                                              ${
                                                c.active
                                                  ? "opacity-100"
                                                  : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                              }`}
                                  onClick={() =>
                                    setBoundary(
                                      items[index + 1].id,
                                      nextBoundary === c.kind ? null : c.kind
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setBoundary(
                                        items[index + 1].id,
                                        nextBoundary === c.kind ? null : c.kind
                                      );
                                    }
                                  }}>
                                  <div
                                    className={`w-full h-full rounded-full grid place-items-center border transition-colors ${
                                      c.active
                                        ? c.activeCls
                                        : "glass border-border text-muted-foreground hover:text-primary hover:border-primary"
                                    }`}>
                                    {c.icon}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary & actions */}
      {items.length > 0 && parts.length > 0 && (
        <div className="mt-8 rounded-2xl border border-border/60 glass overflow-hidden">
          <div className="p-6 border-b border-border/60 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Summary &amp; Actions
            </h3>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Image page size
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as PageSizeOption)}
                className="bg-secondary/60 border border-border/60 rounded-md px-2 py-1 text-xs text-foreground"
                aria-label="Image page size">
                <option value="fit">Fit to image</option>
                <option value="a4">A4 (letterboxed)</option>
              </select>
            </label>
          </div>
          <div className="p-6 space-y-6">
            <div className="divide-y divide-border/60">
              {parts.map((part) => (
                <div
                  key={part.startItemId}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {part.boundary === "split" ? (
                      <Scissors size={13} className="text-primary shrink-0" aria-label="split" />
                    ) : part.boundary === "index" ? (
                      <Bookmark size={13} className="text-cyan-400 shrink-0" aria-label="index" />
                    ) : (
                      <Layers size={13} className="text-muted-foreground shrink-0" aria-label="start" />
                    )}
                    <button
                      className="font-medium text-foreground truncate hover:text-primary transition-colors"
                      onClick={() => openRename(part.startItemId, part.name || `Part ${part.index}`)}
                      title="Rename segment">
                      {part.name || `Part ${part.index}`}
                      <Edit2 size={10} className="inline ml-1.5 opacity-50" />
                    </button>
                  </div>
                  <span className="text-xs bg-secondary/60 border border-border/60 px-2 py-1 rounded-md text-muted-foreground font-mono shrink-0">
                    {part.items.length} item{part.items.length === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-border/60">
              <Button
                onClick={handleSplitParts}
                size="lg"
                variant="outline"
                disabled={isExporting || isBusy}
                title="Cut at ✂ boundaries into separate PDFs (🔖 segments become bookmarks)">
                <Scissors className="mr-2 h-4 w-4" />
                Split &amp; download
              </Button>
              <Button
                onClick={handleAssemble}
                size="lg"
                className="glow-primary"
                disabled={isExporting || isBusy}
                title="One PDF; named segments become its bookmark index">
                {isExporting ? (
                  <Layers className="mr-2 h-4 w-4 animate-pulse" />
                ) : (
                  <Layers className="mr-2 h-4 w-4" />
                )}
                Assemble PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Downloads */}
      {results.length > 0 && (
        <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Download className="h-4 w-4" />
            </span>
            Ready for Download
          </h3>
          <div className="flex flex-wrap gap-3">
            {results.map((r, index) => {
              const isDownloaded = downloaded.has(index);
              return (
                <Button
                  key={r.url}
                  variant="outline"
                  className={
                    isDownloaded
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
                      : "border-border/60 bg-background/40 hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:text-emerald-300"
                  }
                  onClick={() => {
                    handleDownload(r.url, r.name);
                    setDownloaded((prev) => new Set(prev).add(index));
                  }}>
                  {isDownloaded ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {r.name}
                </Button>
              );
            })}
            {results.length > 1 && (
              <Button
                onClick={handleDownloadZip}
                className={`ml-auto ${isZipDownloaded ? "" : "glow-primary"}`}>
                <Archive className="mr-2 h-4 w-4" />
                Download All (ZIP)
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Rename dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Segment</DialogTitle>
            <DialogDescription>
              Enter a new name for this segment. The name stays anchored to the
              segment when items move.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                className="col-span-3"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={saveRename}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentAssembler;
