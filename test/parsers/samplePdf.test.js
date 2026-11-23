import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { parseCartTablePages } from '../../src/parsers/pdfCartParser.js'

test('extracts all expected rows from the real sample PDF', async () => {
  const bytes = new Uint8Array(await readFile('sample-data/cart.pdf'))
  const document = await getDocument({ data: bytes, verbosity: 0 }).promise
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

  const result = parseCartTablePages(pages)

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.length, 6)
  assert.equal(result.data[0].product, 'Cushion Cover')
  assert.equal(result.data[5].basePrice, 899)
})
