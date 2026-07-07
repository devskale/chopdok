import { ChangeEvent, useState, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { toast } from "@/hooks/use-toast";

type PdfDocumentLike = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageLike>;
};

type Viewport = {
  height: number;
  width: number;
};

type RenderTask = {
  promise: Promise<void>;
};

type PdfPageLike = {
  getViewport: (params: { scale: number }) => Viewport;
  render: (args: {
    canvasContext: CanvasRenderingContext2D;
    viewport: Viewport;
  }) => RenderTask;
};

type PdfjsLike = {
  version: string;
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: ArrayBuffer | Uint8Array | { data: ArrayBuffer }) => {
    promise: PdfDocumentLike;
  };
};

let _pdfjs: PdfjsLike | null = null;
const ensurePdfjs = async (): Promise<PdfjsLike | null> => {
  if (typeof window === "undefined") return null;
  if (_pdfjs) return _pdfjs;
  const mod = await import("pdfjs-dist");
  const maybeDefault =
    (mod as unknown as Record<string, unknown>).default ?? mod;
  const candidate = maybeDefault as unknown;
  const isPdfjs = (obj: unknown): obj is PdfjsLike => {
    if (!obj || typeof obj !== "object") return false;
    const o = obj as {
      GlobalWorkerOptions?: unknown;
      getDocument?: unknown;
      version?: unknown;
    };
    return (
      typeof o.version === "string" &&
      o.GlobalWorkerOptions !== undefined &&
      typeof o.getDocument === "function"
    );
  };
  if (!isPdfjs(candidate)) return null;
  const pdfjs = candidate;
  // Local worker (copied from the installed pdfjs-dist) — no CDN runtime dep,
  // version-matched, and honours the "local processing only" claim.
  pdfjs.GlobalWorkerOptions.workerSrc = "/chopdok/pdf.worker.min.js";
  _pdfjs = pdfjs;
  return _pdfjs;
};

export interface FileInfo {
  name: string;
  size: string;
  type: string;
  lastModified: string;
  pageCount: number;
}

export interface ThumbnailInfo {
  pageNumber: number;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export interface SplitPDFInfo {
  name: string;
  url: string;
}

export interface SimplePdfUploaderHook {
  pdfFile: File | null;
  fileInfo: FileInfo | null;
  thumbnails: ThumbnailInfo[];
  splitPDFs: SplitPDFInfo[];
  thumbnailProgress: number;
  isGeneratingThumbnails: boolean;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  loadFile: (file: File) => Promise<void>;
  generateThumbnails: (file: File, scale: number) => Promise<void>;
  splitPDF: (splitPoints: number[], shadedPages: number[]) => Promise<void>;
  clearAll: () => void;
}

export function useSimplePdfUploader(): SimplePdfUploaderHook {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [thumbnails, setThumbnails] = useState<ThumbnailInfo[]>([]);
  const [splitPDFs, setSplitPDFs] = useState<SplitPDFInfo[]>([]);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const renderTokenRef = useRef(0);

  const generateThumbnails = useCallback(async (file: File, scale: number) => {
    // Token: a newer call cancels any in-flight render (its stale result is dropped).
    const myToken = ++renderTokenRef.current;
    const pdfjs = await ensurePdfjs();
    if (!pdfjs || myToken !== renderTokenRef.current) return;

    setIsGeneratingThumbnails(true);
    setThumbnailProgress(0);
    try {
      const fileArrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(fileArrayBuffer).promise;
      if (myToken !== renderTokenRef.current) return;

      const total = pdf.numPages;
      const thumbnails: ThumbnailInfo[] = [];

      for (let pageNum = 1; pageNum <= total; pageNum++) {
        if (myToken !== renderTokenRef.current) return; // cancelled mid-render

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const thumbnailUrl = canvas.toDataURL();
        thumbnails.push({
          pageNumber: pageNum,
          thumbnailUrl,
          width: canvas.width,
          height: canvas.height,
        });

        setThumbnailProgress(Math.round((pageNum / total) * 100));
        // Yield to the event loop so the tab stays responsive and progress paints.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (myToken !== renderTokenRef.current) return; // final guard
      setThumbnails(thumbnails);
      setThumbnailProgress(100);
    } finally {
      // Only clear "generating" if no newer render has taken over.
      if (myToken === renderTokenRef.current) {
        setIsGeneratingThumbnails(false);
      }
    }
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      // Guard: PDF only.
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        toast({
          variant: "destructive",
          title: "Not a PDF",
          description: `"${file.name}" — ChopDok can only open PDF files.`,
        });
        return;
      }

      const pdfjs = await ensurePdfjs();
      if (!pdfjs) {
        toast({
          variant: "destructive",
          title: "Couldn't start the PDF engine",
          description: "Please reload the page and try again.",
        });
        return;
      }

      try {
        const fileArrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(fileArrayBuffer).promise;

        setPdfFile(file);
        setFileInfo({
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2), // size in MB
          type: file.type,
          lastModified: new Date(file.lastModified).toLocaleString(),
          pageCount: pdf.numPages,
        });

        // Render once at scale 1.0 (A4 ≈ 595×842px). This is >= the largest
        // display size (max-w-5xl / 2 cols ≈ 480px), so every zoom level is a
        // crisp CSS *downscale* — no re-render needed when zooming.
        await generateThumbnails(file, 1.0);
      } catch (err) {
        console.error("Failed to load PDF:", err);
        toast({
          variant: "destructive",
          title: "Couldn't open this PDF",
          description:
            "The file may be corrupt or password-protected. Remove any password and try again.",
        });
        setPdfFile(null);
        setFileInfo(null);
        setThumbnails([]);
        setThumbnailProgress(0);
      }
    },
    [generateThumbnails]
  );

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) await loadFile(file);
    },
    [loadFile]
  );

  const splitPDF = useCallback(
    async (splitPoints: number[], shadedPages: number[]) => {
      if (!pdfFile) return;

      try {
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const splitDocs: PDFDocument[] = [];

        let startPage = 0;
        for (const splitPoint of [...splitPoints, pdfDoc.getPageCount()]) {
          const newDoc = await PDFDocument.create();

          const pagesToCopy = Array.from(
            { length: splitPoint - startPage },
            (_, i) => startPage + i
          ).filter((pageNum) => !shadedPages.includes(pageNum));

          const copiedPages = await newDoc.copyPages(pdfDoc, pagesToCopy);
          copiedPages.forEach((page) => newDoc.addPage(page));
          splitDocs.push(newDoc);
          startPage = splitPoint;
        }

        const splitPDFInfos: SplitPDFInfo[] = await Promise.all(
          splitDocs.map(async (doc, index) => {
            const pdfBytes = await doc.save();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const file = new File([pdfBytes as any], `Split_${index + 1}.pdf`, { type: "application/pdf" });
            const url = URL.createObjectURL(file);
            return { name: `Split_${index + 1}.pdf`, url };
          })
        );

        // Revoke previous result URLs on re-process before replacing.
        // revokeObjectURL() is idempotent, so React StrictMode's double-invoke is safe.
        setSplitPDFs((prev) => {
          for (const p of prev) {
            try {
              URL.revokeObjectURL(p.url);
            } catch {}
          }
          return splitPDFInfos;
        });
      } catch (err) {
        console.error("Failed to split PDF:", err);
        toast({
          variant: "destructive",
          title: "Couldn't process the PDF",
          description: "Something went wrong while splitting. Please try again.",
        });
      }
    },
    [pdfFile]
  );

  const clearAll = useCallback(() => {
    if (splitPDFs.length) {
      for (const pdf of splitPDFs) {
        try {
          URL.revokeObjectURL(pdf.url);
        } catch { }
      }
    }
    setThumbnails([]);
    setSplitPDFs([]);
    setFileInfo(null);
    setPdfFile(null);
  }, [splitPDFs]);

  return {
    pdfFile,
    fileInfo,
    thumbnails,
    splitPDFs,
    thumbnailProgress,
    isGeneratingThumbnails,
    handleFileChange,
    loadFile,
    generateThumbnails,
    splitPDF,
    clearAll,
  };
}
