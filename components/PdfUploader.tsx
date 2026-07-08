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
  useSimplePdfUploader,
  SimplePdfUploaderHook,
} from "@/lib/simplePdfUploader";
import { getPartInfo } from "@/lib/parts";
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
  Edit2,
  Check,
  Sparkles,
} from "lucide-react";
import JSZip from "jszip";

// Subtle section tints — a faint wash, no rings/borders (avoids card-in-card).
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

export const PdfUploader: React.FC = () => {
  const {
    fileInfo,
    thumbnails,
    isGeneratingThumbnails,
    thumbnailProgress,
    handleFileChange,
    loadFile,
    splitPDF,
    splitPDFs,
    clearAll,
  }: SimplePdfUploaderHook = useSimplePdfUploader();
  const [splitPoints, setSplitPoints] = useState<number[]>([]);
  const [shadedPages, setShadedPages] = useState<number[]>([]);
  const [thumbnailSize, setThumbnailSize] = useState(2); // 1-4 scale
  const [isDragging, setIsDragging] = useState(false);
  const [isZipDownloaded, setIsZipDownloaded] = useState(false);
  const [downloadedParts, setDownloadedParts] = useState<Set<number>>(new Set());
  const [partNames, setPartNames] = useState<{ [key: number]: string }>({});

  // Rename state
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renamingPartKey, setRenamingPartKey] = useState<number | null>(null);
  const [newPartName, setNewPartName] = useState("");

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const toggleSplitPoint = (index: number) => {
    setSplitPoints((prev) => {
      if (prev.includes(index)) {
        return prev.filter((p) => p !== index);
      } else {
        return [...prev, index].sort((a, b) => a - b);
      }
    });
  };

  const toggleShadedPage = (pageNumber: number) => {
    setShadedPages((prev) =>
      prev.includes(pageNumber)
        ? prev.filter((p) => p !== pageNumber)
        : [...prev, pageNumber].sort((a, b) => a - b)
    );
  };

  const increaseThumbnailSize = useCallback(() => {
    setThumbnailSize((prev) => Math.min(prev + 1, 4));
  }, []);

  const decreaseThumbnailSize = useCallback(
    () => setThumbnailSize((prev) => Math.max(prev - 1, 1)),
    []
  );

  const gridCols = {
    1: "grid-cols-5",
    2: "grid-cols-4",
    3: "grid-cols-3",
    4: "grid-cols-2",
  }[thumbnailSize];

  const getSectionColor = (pageNumber: number) => {
    const sectionIndex =
      [1, ...splitPoints, thumbnails.length + 1].findIndex(
        (sp) => pageNumber < sp
      ) - 1;
    return sectionTints[sectionIndex % sectionTints.length];
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const handleSplitPDF = async () => {
    const modifiedSplitPoints = splitPoints.map((p) => p - 1);
    const modifiedShadedPages = shadedPages.map((p) => p - 1);
    await splitPDF(modifiedSplitPoints, modifiedShadedPages);
    setDownloadedParts(new Set());
  };

  const getPartStatus = useMemo(() => {
    const allSplitPoints = [1, ...splitPoints, thumbnails.length + 1].sort(
      (a, b) => a - b
    );
    return allSplitPoints.slice(0, -1).map((startPage, index) => {
      const endPage = allSplitPoints[index + 1] - 1;
      const pageCount = endPage - startPage + 1;
      const deletions = shadedPages.filter(
        (p) => p >= startPage && p <= endPage
      ).length;
      return {
        name: partNames[startPage] || `Part ${index + 1}`,
        pageCount,
        deletions,
      };
    });
  }, [thumbnails.length, splitPoints, shadedPages, partNames]);

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder("split_pdfs");
    if (folder) {
      const starts = [1, ...splitPoints].sort((a, b) => a - b);
      for (let i = 0; i < splitPDFs.length; i++) {
        const response = await fetch(splitPDFs[i].url);
        const blob = await response.blob();
        const partIndex = i + 1;
        const customName = partNames[starts[i]];
        const partName = customName ? ` - ${customName}` : "";
        folder.file(`Part ${partIndex}${partName}.pdf`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "split_pdfs.zip";
      a.click();
      URL.revokeObjectURL(url);
      setIsZipDownloaded(true);
    }
  };

  const handleClearAll = useCallback(() => {
    clearAll();
    setSplitPoints([]);
    setShadedPages([]);
    setThumbnailSize(2);
    setIsZipDownloaded(false);
    setPartNames({});
    const input = document.getElementById(
      "file-upload"
    ) as HTMLInputElement | null;
    if (input) input.value = "";
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    setDownloadedParts(new Set());
    setIsDragging(false);
  }, [clearAll]);

  const handlePartNameChange = (partKey: number, name: string) => {
    setPartNames((prev) => ({
      ...prev,
      [partKey]: name,
    }));
  };

  const openRenameDialog = (partKey: number, currentName: string) => {
    setRenamingPartKey(partKey);
    setNewPartName(currentName);
    setIsRenameDialogOpen(true);
  };

  const savePartName = () => {
    if (renamingPartKey !== null && newPartName.trim() !== "") {
      handlePartNameChange(renamingPartKey, newPartName.trim());
      setIsRenameDialogOpen(false);
      setRenamingPartKey(null);
      setNewPartName("");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        t?.tagName === "SELECT" ||
        t?.isContentEditable
      ) {
        return;
      }
      if (e.key === "+" || e.key === "=") {
        increaseThumbnailSize();
      } else if (e.key === "-" || e.key === "_") {
        decreaseThumbnailSize();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [increaseThumbnailSize, decreaseThumbnailSize]);

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-5xl">
      {/* Dropzone */}
      <div
        className={`relative flex items-center justify-center transition-all duration-300 ease-out rounded-2xl border-2 border-dashed overflow-hidden ${fileInfo
            ? "p-5 flex-row gap-6 border-border/70 bg-secondary/30"
            : `flex-col p-12 sm:p-16 ${isDragging
                ? "border-primary bg-primary/10 scale-[1.01] glow-primary"
                : "border-border/60 hover:border-primary/50 hover:bg-secondary/20"
            }`
          }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}>

        {!fileInfo ? (
          <div className="flex flex-col items-center text-center gap-5">
            <div className={`grid place-items-center w-16 h-16 rounded-2xl transition-colors ${isDragging ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
              <Upload className="w-7 h-7" strokeWidth={1.75} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="file-upload" className="cursor-pointer block" aria-label="Select PDF file">
                <span className="font-semibold text-lg text-foreground">
                  Click to upload
                </span>
                <span className="text-muted-foreground"> or drag &amp; drop</span>
              </label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload PDF"
              />
              <p className="text-sm text-muted-foreground/80">PDF files only · stays on your device</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="grid place-items-center p-3 rounded-xl bg-rose-500/15 ring-1 ring-rose-500/25">
                <FileText className="text-rose-400 w-6 h-6" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{fileInfo.name}</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {fileInfo.size} MB · {fileInfo.pageCount} pages
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="file-upload-change" className="cursor-pointer">
                <Button variant="outline" size="sm" className="pointer-events-none">
                  Change File
                </Button>
              </label>
              <Input
                id="file-upload-change"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Change PDF"
              />
            </div>
          </div>
        )}
      </div>

      {isGeneratingThumbnails && (
        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm text-muted-foreground shrink-0">Rendering pages…</span>
          <Progress value={thumbnailProgress} className="flex-1" />
          <span className="text-sm font-medium tabular-nums w-10 text-right font-mono">
            {thumbnailProgress}%
          </span>
        </div>
      )}

      {thumbnails.length > 0 && (
        <div className="mt-8 space-y-4">
          {/* Toolbar — flat row, no card (avoids stacking surfaces) */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
            <h2 className="text-lg font-semibold flex items-center gap-2.5">
              <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-primary to-fuchsia-400" />
              Page Preview
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
              <span className="text-sm font-medium w-12 text-center font-mono">{thumbnailSize * 50}%</span>
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

          {/* Grid — one soft inset surface, no extra border nesting */}
          <div
            ref={scrollContainerRef}
            className="overflow-y-auto max-h-[600px] p-4 rounded-2xl bg-background/30">
            <div className={`grid ${gridCols} gap-5`}>
              {thumbnails.map((thumbnail, index) => {
                const pageNumber = index + 1;
                const isShaded = shadedPages.includes(pageNumber);
                const sectionColor = getSectionColor(pageNumber);
                const { startPage: partStartPage, partIndex: currentPartIndex } =
                  getPartInfo(splitPoints, pageNumber);
                const isStartOfPortion =
                  pageNumber === 1 || splitPoints.includes(pageNumber);

                const displayPartName = partNames[partStartPage] || `Part ${currentPartIndex}`;

                return (
                  <div key={thumbnail.pageNumber} className="relative group">
                    <div
                      className={`relative rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/40 ${sectionColor} ${isShaded ? "opacity-40 grayscale" : ""
                        }`}>
                      <div className="aspect-[1/1.4] relative bg-background/60">
                        <Image
                          src={thumbnail.thumbnailUrl}
                          alt={`Page ${pageNumber}`}
                          fill
                          sizes="20vw"
                          className="object-contain p-2"
                        />
                      </div>

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />

                      {/* Label bar */}
                      <div className="absolute bottom-0 left-0 right-0 glass border-t border-white/10 p-2 flex justify-between items-center">
                        <button
                          className={`text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1 max-w-[70%] transition-colors ${isStartOfPortion
                              ? "cursor-pointer hover:bg-primary/20 hover:text-primary"
                              : "cursor-default text-muted-foreground"
                            }`}
                          onClick={(e) => {
                            if (isStartOfPortion) {
                              e.stopPropagation();
                              openRenameDialog(partStartPage, displayPartName);
                            }
                          }}
                          disabled={!isStartOfPortion}
                          aria-label={isStartOfPortion ? "Rename part" : "Section name"}
                        >
                          <span className="truncate">{displayPartName}</span>
                          {isStartOfPortion && <Edit2 size={10} className="opacity-50 shrink-0" />}
                        </button>
                        <span className="text-xs text-muted-foreground font-mono">{pageNumber}</span>
                      </div>

                      {/* Remove / restore */}
                      <Button
                        className={`absolute top-2 left-2 h-8 w-8 rounded-full p-0 transition-all duration-200
                          ${isShaded
                            ? "bg-foreground text-background hover:bg-foreground/80"
                            : "glass border border-white/15 text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive opacity-0 group-hover:opacity-100"
                          }
                        `}
                        onClick={() => toggleShadedPage(pageNumber)}
                        title={isShaded ? "Restore page" : "Remove page"}
                        aria-label={isShaded ? "Restore page" : "Remove page"}
                      >
                        {isShaded ? <Plus size={16} /> : <X size={16} />}
                      </Button>
                    </div>

                    {/* Split handle */}
                    {index < thumbnails.length - 1 && (
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`Split at page ${pageNumber + 1}`}
                        className={`absolute top-1/2 -right-3 w-6 h-6 -mt-3 z-10 cursor-pointer rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                                    ${splitPoints.includes(pageNumber + 1)
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          }`}
                        onClick={() => toggleSplitPoint(pageNumber + 1)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSplitPoint(pageNumber + 1);
                          }
                        }}>
                        <div className={`w-full h-full rounded-full grid place-items-center border transition-colors ${splitPoints.includes(pageNumber + 1)
                            ? "bg-primary border-primary text-primary-foreground glow-primary"
                            : "glass border-border text-muted-foreground hover:text-primary hover:border-primary"
                          }`}>
                          <Scissors size={13} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {(splitPoints.length > 0 || shadedPages.length > 0) && (
        <div className="mt-8 rounded-2xl border border-border/60 glass overflow-hidden">
          <div className="p-6 border-b border-border/60">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Summary &amp; Actions
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="divide-y divide-border/60">
              {getPartStatus.map((status, index) => (
                <div key={index} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-foreground truncate">{status.name}</span>
                    {status.deletions > 0 && (
                      <span className="text-xs text-destructive flex items-center gap-1 shrink-0">
                        <Eraser size={12} />
                        {status.deletions}
                      </span>
                    )}
                  </div>
                  <span className="text-xs bg-secondary/60 border border-border/60 px-2 py-1 rounded-md text-muted-foreground font-mono shrink-0">
                    {status.pageCount} pgs
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-border/60">
              <Button onClick={handleSplitPDF} size="lg" className="glow-primary">
                <Scissors className="mr-2 h-4 w-4" />
                Process PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Downloads */}
      {splitPDFs.length > 0 && (
        <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Download className="h-4 w-4" />
            </span>
            Ready for Download
          </h3>
          <div className="flex flex-wrap gap-3">
            {splitPDFs.map((pdf, index) => {
              const partIndex = index + 1;
              const starts = [1, ...splitPoints].sort((a, b) => a - b);
              const customName = partNames[starts[index]];
              const partName = customName ? ` - ${customName}` : "";
              const displayName = customName
                ? `${customName.substring(0, 20)}`
                : `Part ${partIndex}`;
              const fileName = `Part ${partIndex}${partName}.pdf`;

              const isDownloaded = downloadedParts.has(index);
              return (
                <Button
                  key={index}
                  variant="outline"
                  className={isDownloaded
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
                    : "border-border/60 bg-background/40 hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:text-emerald-300"
                  }
                  onClick={() => {
                    handleDownload(pdf.url, fileName);
                    setDownloadedParts((prev) => new Set(prev).add(index));
                  }}>
                  {isDownloaded ? <Check className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
                  {displayName}
                </Button>
              );
            })}
            <Button
              onClick={handleDownloadZip}
              className={`ml-auto ${isZipDownloaded ? "" : "glow-primary"}`}
            >
              <Archive className="mr-2 h-4 w-4" />
              Download All (ZIP)
            </Button>
          </div>
        </div>
      )}

      {/* Rename dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Part</DialogTitle>
            <DialogDescription>
              Enter a new name for this part of the PDF.
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
                  if (e.key === 'Enter') {
                    savePartName();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={savePartName}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PdfUploader;
