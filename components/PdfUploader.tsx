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
  Scissors,
  Plus,
  Minus,
  Upload,
  X,
  Download,
  Archive,
  Eraser,
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

  return (
    <div className="container mx-auto p-4">
      <div
        className={`flex items-center p-4 border rounded-lg ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}>
        <div className="flex-shrink-0 mr-4">
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="text-gray-400" size={24} />
          </label>
          <Input
            id="file-upload"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        {fileInfo ? (
          <div className="flex-grow">
            <p className="font-semibold">{fileInfo.name}</p>
            <p className="text-sm text-gray-500">
              {fileInfo.size} MB | {fileInfo.pageCount} pages | Last modified:{" "}
              {fileInfo.lastModified}
            </p>
          </div>
        ) : (
          <p className="text-gray-500">
            Drag and drop a PDF here, or click to select
          </p>
        )}
      </div>
      {thumbnails.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Thumbnails</h2>
            <div className="flex items-center space-x-2">
              <Button
                onClick={decreaseThumbnailSize}
                size="sm"
                variant="outline"
                title="Zoom Out (or use '-' key)">
                <Minus size={16} />
              </Button>
              <span className="text-sm font-medium">{thumbnailSize}/4</span>
              <Button
                onClick={increaseThumbnailSize}
                size="sm"
                variant="outline"
                title="Zoom In (or use '+' key)">
                <Plus size={16} />
              </Button>
              <Button
                onClick={handleClearAll}
                size="sm"
                variant="outline"
                title="Clear all thumbnails and memory">
                <Eraser size={16} />
              </Button>
            </div>
          </div>
          <div
            ref={scrollContainerRef}
            className="overflow-y-auto max-h-[600px]">
            <div className={`grid ${gridCols} gap-4`}>
              {thumbnails.map((thumbnail, index) => {
                const pageNumber = index + 1;
                const isShaded = shadedPages.includes(pageNumber);
                const sectionColor = getSectionColor(pageNumber);
                const partName = getPartName(pageNumber);
                const isStartOfPortion =
                  pageNumber === 1 || splitPoints.includes(pageNumber);
                return (
                  <div key={thumbnail.pageNumber} className="relative group">
                    <div
                      className={`p-2 ${sectionColor} ${
                        isShaded ? "bg-gray-400 bg-opacity-50" : ""
                      }`}>
                      <Image
                        src={thumbnail.thumbnailUrl}
                        alt={`Page ${pageNumber}`}
                        width={thumbnail.width}
                        height={thumbnail.height}
                        className={`w-full ${isShaded ? "opacity-30" : ""}`}
                      />
                      <div className="flex justify-between items-center mt-1">
                        {isStartOfPortion && (
                          <span
                            className="text-sm font-medium bg-white px-1 rounded cursor-pointer"
                            onClick={() => {
                              const idx = parseInt(
                                partName.replace("part", "")
                              );
                              const newName = prompt(
                                "Enter name for this part:",
                                partNames[idx] ||
                                  partName.replace("part", "Part ")
                              );
                              if (newName !== null) {
                                handlePartNameChange(idx, newName);
                              }
                            }}>
                            {partNames[
                              parseInt(partName.replace("part", ""))
                            ] || partName.replace("part", "Part ")}
                          </span>
                        )}
                        <p className="text-sm ml-auto">Page {pageNumber}</p>
                      </div>
                      <Button
                        className={`
                          absolute top-2 left-2 rounded-full p-1 w-6 h-6 flex items-center justify-center transition-colors
                          ${
                            isShaded
                              ? "bg-gray-600 text-white"
                              : "bg-white text-black border border-gray-300"
                          } 
                          hover:bg-gray-200 hover:text-black
                        `}
                        onClick={() => toggleShadedPage(pageNumber)}
                        title={isShaded ? "Unshade page" : "Shade out page"}>
                        <X size={16} />
                      </Button>
                    </div>
                    {index < thumbnails.length - 1 && (
                      <div
                        className={`absolute top-0 right-0 w-1 h-full cursor-pointer transition-all duration-200 ease-in-out
                                    ${
                                      splitPoints.includes(pageNumber + 1)
                                        ? "bg-blue-500 w-2"
                                        : "bg-transparent group-hover:bg-gray-300"
                                    }`}
                        onClick={() => toggleSplitPoint(pageNumber + 1)}>
                        {splitPoints.includes(pageNumber + 1) && (
                          <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 bg-blue-500 rounded-full p-1">
                            <Scissors className="text-white" size={12} />
                          </div>
                        )}
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
        <div className="mt-4">
          {splitPoints.length > 0 && (
            <>
              <h3 className="text-lg font-semibold mb-2">Split Points</h3>
              <p>
                The PDF will be split before pages: {splitPoints.join(", ")}
              </p>
            </>
          )}
          {shadedPages.length > 0 && (
            <>
              <h3 className="text-lg font-semibold mb-2">Shaded Pages</h3>
              <p>
                The following pages will be removed: {shadedPages.join(", ")}
              </p>
            </>
          )}
          <h3 className="text-lg font-semibold mb-2 mt-4">Part Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getPartStatus.map((status, index) => (
              <div key={index} className="border p-2 rounded">
                <p>
                  <strong>{status.name}:</strong> {status.pageCount} Pages
                  {status.deletions > 0 &&
                    ` (${status.deletions} deletion${
                      status.deletions > 1 ? "s" : ""
                    })`}
                </p>
              </div>
            ))}
          </div>
          <Button onClick={handleSplitPDF} className="mt-4">
            Split/Remove PDF
          </Button>
        </div>
      )}
      {splitPDFs.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Download Split PDFs</h3>
          {splitPDFs.map((pdf, index) => {
            const partIndex = index + 1;
            const partName = partNames[partIndex]
              ? ` - ${partNames[partIndex]}`
              : "";
            const displayName = partNames[partIndex]
              ? `${partNames[partIndex].substring(0, 20)}`
              : `Part ${partIndex}`;
            return (
              <Button
                key={index}
                className="mr-2 mb-2 bg-gray-200 text-black hover:bg-gray-300 download-button"
                asChild
                onClick={(e) => {
                  e.currentTarget.classList.remove(
                    "bg-gray-200",
                    "text-black",
                    "hover:bg-gray-300"
                  );
                  e.currentTarget.classList.add("bg-gray-800", "text-white");
                }}>
                <a href={pdf.url} download={`Part ${partIndex}${partName}.pdf`}>
                  <Download className="mr-2" size={16} />
                  {displayName}
                </a>
              </Button>
            );
          })}
          <Button
            onClick={handleDownloadZip}
            className={`mt-4 ${
              isZipDownloaded
                ? "bg-gray-800 text-white"
                : "bg-gray-200 text-black hover:bg-gray-300"
            }`}>
            <Archive className="mr-2" size={16} />
            Download All as Zip
          </Button>
        </div>
      )}
      {modifiedPDF && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Download Modified PDF</h3>
          <Button asChild>
            <a href={modifiedPDF.url} download={modifiedPDF.name}>
              <Download className="mr-2" size={16} />
              Download Modified PDF
            </a>
          </Button>
        </div>
      )}
    </div>
  );
};

export default PdfUploader;
