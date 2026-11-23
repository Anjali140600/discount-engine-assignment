import { parseCartTablePages } from '../../parsers/pdfCartParser.js'

export async function readCartPdf(file) {
  // PDF support is optional, so defer its large browser bundle until upload.
  const [{ getDocument, GlobalWorkerOptions }, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  GlobalWorkerOptions.workerSrc = workerUrl

  const bytes = new Uint8Array(await file.arrayBuffer())
  const document = await getDocument({ data: bytes }).promise
  const pages = []

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
    })))
  }

  return parseCartTablePages(pages)
}
