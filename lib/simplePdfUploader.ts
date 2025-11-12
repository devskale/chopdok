import { ChangeEvent, useState, useCallback } from 'react'
import { PDFDocument, PDFPage } from 'pdf-lib'

let _pdfjs: any = null
const ensurePdfjs = async () => {
  if (typeof window === 'undefined') return null
  if (_pdfjs) return _pdfjs
  const mod = await import('pdfjs-dist')
  const pdfjs = (mod as any)
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
  _pdfjs = pdfjs
  return _pdfjs
}

export interface FileInfo {
  name: string;
  size: string;
  type: string;
  lastModified: string;
  localPath: string;
  pageCount: number;
}

export interface ThumbnailInfo {
  pageNumber: number;
  thumbnailUrl: string;
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
  modifiedPDF: SplitPDFInfo | null;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  generateThumbnails: (file: File, scale: number) => Promise<void>;
  splitPDF: (splitPoints: number[], shadedPages: number[]) => Promise<void>;
  deletePages: (pageNumbers: number[]) => Promise<void>;
  clearAll: () => void;
}

export function useSimplePdfUploader(): SimplePdfUploaderHook {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [thumbnails, setThumbnails] = useState<ThumbnailInfo[]>([])
  const [splitPDFs, setSplitPDFs] = useState<SplitPDFInfo[]>([])
  const [modifiedPDF, setModifiedPDF] = useState<SplitPDFInfo | null>(null)

  const generateThumbnails = useCallback(async (file: File, scale: number) => {
    const pdfjs = await ensurePdfjs()
    if (!pdfjs) return
    const fileArrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjs.getDocument(fileArrayBuffer).promise
    const thumbnails: ThumbnailInfo[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      canvas.height = viewport.height
      canvas.width = viewport.width

      await page.render({ canvasContext: context, viewport }).promise
      const thumbnailUrl = canvas.toDataURL()
      thumbnails.push({ pageNumber: pageNum, thumbnailUrl })
    }

    setThumbnails(thumbnails)
  }, [])

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const pdfjs = await ensurePdfjs()
    if (!pdfjs) return
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0]
      const localPath = URL.createObjectURL(file)
      setPdfFile(file)

      const fileArrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument(fileArrayBuffer).promise

      setFileInfo({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2), // size in MB
        type: file.type,
        lastModified: new Date(file.lastModified).toLocaleString(),
        localPath: localPath,
        pageCount: pdf.numPages
      })

      await generateThumbnails(file, 0.5) // Initial scale
    }
  }, [generateThumbnails])

  const splitPDF = useCallback(async (splitPoints: number[], shadedPages: number[]) => {
    if (!pdfFile) return

    const pdfBytes = await pdfFile.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const splitDocs: PDFDocument[] = []

    let startPage = 0
    for (const splitPoint of [...splitPoints, pdfDoc.getPageCount()]) {
      const newDoc = await PDFDocument.create()

      const pagesToCopy = Array.from(
        { length: splitPoint - startPage },
        (_, i) => startPage + i
      ).filter(pageNum => !shadedPages.includes(pageNum ))

      const copiedPages = await newDoc.copyPages(pdfDoc, pagesToCopy)
      copiedPages.forEach(page => newDoc.addPage(page))
      splitDocs.push(newDoc)
      startPage = splitPoint
    }

    const splitPDFInfos: SplitPDFInfo[] = await Promise.all(
      splitDocs.map(async (doc, index) => {
        const pdfBytes = await doc.save()
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        return { name: `Split_${index + 1}.pdf`, url }
      })
    )

    setSplitPDFs(splitPDFInfos)
  }, [pdfFile])

  const deletePages = useCallback(async (pageNumbers: number[]) => {
    if (!pdfFile) return

    const pdfBytes = await pdfFile.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)

    const pagesToKeep = Array.from(
      { length: pdfDoc.getPageCount() },
      (_, i) => i
    ).filter(i => !pageNumbers.includes(i + 1))

    const newDoc = await PDFDocument.create()
    const copiedPages = await newDoc.copyPages(pdfDoc, pagesToKeep)
    copiedPages.forEach(page => newDoc.addPage(page))

    const modifiedPdfBytes = await newDoc.save()
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)

    setModifiedPDF({ name: 'Modified.pdf', url })
  }, [pdfFile])

  const clearAll = useCallback(() => {
    if (modifiedPDF?.url) {
      try { URL.revokeObjectURL(modifiedPDF.url) } catch {}
    }
    if (splitPDFs.length) {
      for (const pdf of splitPDFs) {
        try { URL.revokeObjectURL(pdf.url) } catch {}
      }
    }
    setThumbnails([])
    setSplitPDFs([])
    setModifiedPDF(null)
    setFileInfo(null)
    setPdfFile(null)
  }, [modifiedPDF, splitPDFs])

  return {
    pdfFile,
    fileInfo,
    thumbnails,
    splitPDFs,
    modifiedPDF,
    handleFileChange,
    generateThumbnails,
    splitPDF,
    deletePages
    , clearAll
  }
}