import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { PDFDocument } from 'pdf-lib'

export const createAndDownloadZip = async (pdfFile: File, fileInfo: any, splitPoints: number[], shadedPages: number[], thumbnails: any[]) => {
  const pdfBytes = await pdfFile.arrayBuffer()
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const zip = new JSZip()

  const nonShadedPages = thumbnails
    .filter((_, index) => !shadedPages.includes(index + 1))
    .map(t => t.pageNumber)
  const effectiveSplitPoints = splitPoints.filter(sp => !shadedPages.includes(sp))

  const portions = [1, ...effectiveSplitPoints, thumbnails.length + 1].map((startPage, index, array) => {
    const endPage = array[index + 1] - 1 || thumbnails.length
    return { startPage, endPage, name: `part${index + 1}` }
  })

  for (const { startPage, endPage, name } of portions) {
    const newPdfDoc = await PDFDocument.create()
    const pages = await pdfDoc.copyPages(pdfDoc, Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i - 1))
    pages.forEach(page => newPdfDoc.addPage(page))
    const newPdfBytes = await newPdfDoc.save()
    zip.file(`${fileInfo?.name.replace('.pdf', '')}_${name}.pdf`, newPdfBytes)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  saveAs(zipBlob, `${fileInfo?.name.replace('.pdf', '')}_split.zip`)
}