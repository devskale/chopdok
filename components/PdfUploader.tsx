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
} from "lucide-react";
import JSZip from "jszip";

const colors = [
  "bg-red-100",
  "bg-blue-100",
  "bg-green-100",
  "bg-yellow-100",
  "bg-purple-100",
  "bg-pink-100",
  "bg-indigo-100",
  "bg-gray-100",
];

export const PdfUploader: React.FC = () => {
  const {
    fileInfo,
    thumbnails,
    handleFileChange,
    splitPDF,
    splitPDFs,
    modifiedPDF,
    clearAll,
  }: SimplePdfUploaderHook = useSimplePdfUploader();
  const [splitPoints, setSplitPoints] = useState<number[]>([]);
  const [shadedPages, setShadedPages] = useState<number[]>([]);
  const [thumbnailSize, setThumbnailSize] = useState(2); // 1-4 scale
  const [isDragging, setIsDragging] = useState(false);
  const [isZipDownloaded, setIsZipDownloaded] = useState(false);
  const [partNames, setPartNames] = useState<{ [key: number]: string }>({});

  // Rename state
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renamingPartIndex, setRenamingPartIndex] = useState<number | null>(null);
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
    return colors[sectionIndex % colors.length];
  };

  const getPartName = (pageNumber: number) => {
    const allSplitPoints = [1, ...splitPoints, thumbnails.length + 1].sort(
      (a, b) => a - b
    );
    const partIndex = allSplitPoints.findIndex((sp) => pageNumber < sp);
    return `part${partIndex}`;
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

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileChange({
        target: { files },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const resetButtonStyles = useCallback(() => {
    const buttons = document.querySelectorAll(".download-button");
    buttons.forEach((button) => {
      button.classList.remove("bg-gray-800", "text-white");
      button.classList.add("bg-gray-200", "text-black", "hover:bg-gray-300");
    });
    setIsZipDownloaded(false);
  }, []);

  const handleSplitPDF = async () => {
    const modifiedSplitPoints = splitPoints.map((p) => p - 1);
    const modifiedShadedPages = shadedPages.map((p) => p - 1);
    await splitPDF(modifiedSplitPoints, modifiedShadedPages);
    resetButtonStyles();
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
        name: partNames[index + 1] || `Part ${index + 1}`,
        pageCount,
        deletions,
      };
    });
  }, [thumbnails.length, splitPoints, shadedPages, partNames]);

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder("split_pdfs");
    if (folder) {
      for (const pdf of splitPDFs) {
        const response = await fetch(pdf.url);
        const blob = await response.blob();
        const partIndex = splitPDFs.indexOf(pdf) + 1;
        const partName = partNames[partIndex]
          ? ` - ${partNames[partIndex]}`
          : "";
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
    resetButtonStyles();
    setIsDragging(false);
  }, [clearAll, resetButtonStyles]);

  const handlePartNameChange = (index: number, name: string) => {
    setPartNames((prev) => ({
      ...prev,
      [index]: name,
    }));
  };

  const openRenameDialog = (index: number, currentName: string) => {
    setRenamingPartIndex(index);
    setNewPartName(currentName);
    setIsRenameDialogOpen(true);
  };

  const savePartName = () => {
    if (renamingPartIndex !== null && newPartName.trim() !== "") {
      handlePartNameChange(renamingPartIndex, newPartName.trim());
      setIsRenameDialogOpen(false);
      setRenamingPartIndex(null);
      setNewPartName("");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    <div className="container mx-auto p-4 max-w-5xl">
      <div
        className={`flex items-center justify-center transition-all duration-200 ease-in-out border-2 border-dashed rounded-xl ${fileInfo
            ? "p-4 flex-row gap-6 border-gray-200 bg-gray-50/50"
            : `flex-col p-10 ${isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-gray-300 hover:border-primary/50 hover:bg-gray-50"
            }`
          }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}>

        {!fileInfo ? (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-gray-100 rounded-full">
              <Upload className="text-gray-500 w-8 h-8" />
            </div>
            <div className="space-y-2">
              <label htmlFor="file-upload" className="cursor-pointer block" aria-label="Select PDF file">
                <span className="font-semibold text-lg text-gray-900">
                  Click to upload
                </span>
                <span className="text-gray-500"> or drag and drop</span>
              </label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload PDF"
              />
              <p className="text-sm text-gray-500">PDF files only</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <FileText className="text-red-600 w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{fileInfo.name}</p>
                <p className="text-sm text-gray-500">
                  {fileInfo.size} MB • {fileInfo.pageCount} pages
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

      {thumbnails.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-6 bg-primary rounded-full"></span>
              Page Preview
            </h2>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <Button
                onClick={decreaseThumbnailSize}
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Zoom Out"
                aria-label="Zoom Out">
                <Minus size={16} />
              </Button>
              <span className="text-sm font-medium w-12 text-center">{thumbnailSize * 25}%</span>
              <Button
                onClick={increaseThumbnailSize}
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Zoom In"
                aria-label="Zoom In">
                <Plus size={16} />
              </Button>
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              <Button
                onClick={handleClearAll}
                size="sm"
                variant="destructive"
                className="h-8 px-3 text-xs"
                title="Clear all"
                aria-label="Clear all">
                <Eraser size={14} className="mr-2" />
                Clear
              </Button>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="overflow-y-auto max-h-[600px] p-4 bg-gray-50 rounded-xl border">
            <div className={`grid ${gridCols} gap-6`}>
              {thumbnails.map((thumbnail, index) => {
                const pageNumber = index + 1;
                const isShaded = shadedPages.includes(pageNumber);
                const sectionColor = getSectionColor(pageNumber);
                const partName = getPartName(pageNumber);
                const isStartOfPortion =
                  pageNumber === 1 || splitPoints.includes(pageNumber);

                const currentPartIndex = parseInt(partName.replace("part", ""));
                const displayPartName = partNames[currentPartIndex] || partName.replace("part", "Part ");

                return (
                  <div key={thumbnail.pageNumber} className="relative group">
                    <div
                      className={`relative rounded-lg overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md ${sectionColor} ${isShaded ? "opacity-50 grayscale" : ""
                        }`}>
                      <div className="aspect-[1/1.4] relative">
                        <Image
                          src={thumbnail.thumbnailUrl}
                          alt={`Page ${pageNumber}`}
                          fill
                          className="object-contain p-2"
                        />
                      </div>

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

                      <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-2 border-t flex justify-between items-center">
                        <button
                          className={`text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1 max-w-[70%] transition-colors ${isStartOfPortion
                              ? "cursor-pointer bg-gray-100 text-gray-900 hover:bg-blue-100 hover:text-blue-700"
                              : "bg-transparent text-gray-500 cursor-default"
                            }`}
                          onClick={(e) => {
                            if (isStartOfPortion) {
                              e.stopPropagation();
                              openRenameDialog(currentPartIndex, displayPartName);
                            }
                          }}
                          disabled={!isStartOfPortion}
                          aria-label={isStartOfPortion ? "Rename part" : "Section name"}
                        >
                          <span className="truncate">{displayPartName}</span>
                          {isStartOfPortion && <Edit2 size={10} className="opacity-50" />}
                        </button>
                        <span className="text-xs text-gray-500 font-mono">{pageNumber}</span>
                      </div>

                      <Button
                        className={`
                          absolute top-2 left-2 h-8 w-8 rounded-full p-0 shadow-sm transition-all duration-200
                          ${isShaded
                            ? "bg-gray-800 text-white hover:bg-gray-700"
                            : "bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100"
                          } 
                        `}
                        onClick={() => toggleShadedPage(pageNumber)}
                        title={isShaded ? "Restore page" : "Remove page"}
                        aria-label={isShaded ? "Restore page" : "Remove page"}
                      >
                        {isShaded ? <Plus size={16} /> : <X size={16} />}
                      </Button>
                    </div>

                    {index < thumbnails.length - 1 && (
                      <div
                        className={`absolute top-1/2 -right-3 w-6 h-6 -mt-3 z-10 cursor-pointer transition-all duration-200 transform hover:scale-110
                                    ${splitPoints.includes(pageNumber + 1)
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                          }`}
                        onClick={() => toggleSplitPoint(pageNumber + 1)}>
                        <div className={`w-full h-full rounded-full flex items-center justify-center shadow-sm border ${splitPoints.includes(pageNumber + 1)
                            ? "bg-blue-500 border-blue-600 text-white"
                            : "bg-white border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-500"
                          }`}>
                          <Scissors size={14} />
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

      {(splitPoints.length > 0 || shadedPages.length > 0) && (
        <div className="mt-8 bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-gray-50/50">
            <h3 className="text-lg font-semibold">Summary & Actions</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getPartStatus.map((status, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-900">{status.name}</span>
                    <span className="text-xs bg-white px-2 py-1 rounded border text-gray-500">
                      {status.pageCount} pgs
                    </span>
                  </div>
                  {status.deletions > 0 && (
                    <div className="text-xs text-red-600 flex items-center gap-1">
                      <Eraser size={12} />
                      {status.deletions} removed
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSplitPDF} size="lg" className="bg-primary hover:bg-primary/90">
                <Scissors className="mr-2 h-4 w-4" />
                Process PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {splitPDFs.length > 0 && (
        <div className="mt-8 bg-green-50 rounded-xl border border-green-100 p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
            <Download className="h-5 w-5" />
            Ready for Download
          </h3>
          <div className="flex flex-wrap gap-3">
            {splitPDFs.map((pdf, index) => {
              const partIndex = index + 1;
              const partName = partNames[partIndex]
                ? ` - ${partNames[partIndex]}`
                : "";
              const displayName = partNames[partIndex]
                ? `${partNames[partIndex].substring(0, 20)}`
                : `Part ${partIndex}`;
              const fileName = `Part ${partIndex}${partName}.pdf`;

              return (
                <Button
                  key={index}
                  variant="outline"
                  className="bg-white hover:bg-green-100 border-green-200 text-green-800 download-button"
                  onClick={(e) => {
                    e.currentTarget.classList.add("bg-green-600", "text-white", "border-green-600");
                    e.currentTarget.classList.remove("bg-white", "text-green-800");
                    handleDownload(pdf.url, fileName);
                  }}>
                  <Download className="mr-2 h-4 w-4" />
                  {displayName}
                </Button>
              );
            })}
            <Button
              onClick={handleDownloadZip}
              className={`ml-auto ${isZipDownloaded
                  ? "bg-gray-800"
                  : "bg-green-600 hover:bg-green-700"
                }`}
            >
              <Archive className="mr-2 h-4 w-4" />
              Download All (ZIP)
            </Button>
          </div>
        </div>
      )}

      {modifiedPDF && (
        <div className="mt-8 bg-blue-50 rounded-xl border border-blue-100 p-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Modified PDF Ready</h3>
            <p className="text-sm text-blue-700">Your processed file is ready to save.</p>
          </div>
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => handleDownload(modifiedPDF.url, modifiedPDF.name)}
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      )}

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
