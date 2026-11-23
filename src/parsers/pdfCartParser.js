const ROW_TOLERANCE = 3

function normaliseText(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function groupIntoRows(items) {
  const rows = []
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    if (!normaliseText(item.str)) continue
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= ROW_TOLERANCE)
    if (row) {
      row.items.push(item)
    } else {
      rows.push({ y: item.y, items: [item] })
    }
  }

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => ({ ...row, items: row.items.sort((a, b) => a.x - b.x) }))
}

function findHeader(row) {
  const product = row.items.find((item) => /product/i.test(item.str))
  const brand = row.items.find((item) => /brand/i.test(item.str))
  const platform = row.items.find((item) => /platform/i.test(item.str))
  const price = row.items.find((item) => /base\s*price|base/i.test(item.str))

  if (!product || !brand || !platform || !price) return null
  if (!(product.x < brand.x && brand.x < platform.x && platform.x < price.x)) return null

  return [product.x, brand.x, platform.x, price.x]
}

function splitColumns(row, starts) {
  const boundaries = starts.slice(0, -1).map((start, index) => (start + starts[index + 1]) / 2)
  const columns = [[], [], [], []]

  for (const item of row.items) {
    const columnIndex = boundaries.findIndex((boundary) => item.x < boundary)
    columns[columnIndex === -1 ? 3 : columnIndex].push(item.str)
  }

  return columns.map((parts) => normaliseText(parts.join(' ')))
}

function parsePrice(value) {
  const match = value.replace(/,/g, '').match(/(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d{1,2})?)/i)
  if (!match) return null
  const price = Number(match[1])
  return Number.isFinite(price) && price > 0 ? Math.round(price) : null
}

/**
 * Converts positioned PDF text into CartItem objects. Row coordinates are used
 * instead of spaces because PDF text extraction does not preserve table tabs.
 */
export function parseCartTablePages(pages) {
  const data = []
  const errors = []
  let nextItemNumber = 1

  pages.forEach((pageItems, pageIndex) => {
    const rows = groupIntoRows(pageItems)
    const headerIndex = rows.findIndex((row) => findHeader(row))
    if (headerIndex === -1) {
      errors.push(`Page ${pageIndex + 1}: table header not found.`)
      return
    }

    const starts = findHeader(rows[headerIndex])
    rows.slice(headerIndex + 1).forEach((row, rowIndex) => {
      const [product, brand, platform, priceText] = splitColumns(row, starts)
      const hasContent = product || brand || platform || priceText
      if (!hasContent || /^[-—–_]+$/.test(product)) return

      const basePrice = parsePrice(priceText)
      if (!product || !brand || !platform || !basePrice) {
        errors.push(`Page ${pageIndex + 1}, table row ${rowIndex + 1}: expected Product, Brand, Platform, and a positive Base Price.`)
        return
      }

      data.push({
        itemId: `ITEM-${String(nextItemNumber).padStart(2, '0')}`,
        product,
        brand,
        platform,
        basePrice,
      })
      nextItemNumber += 1
    })
  })

  if (data.length === 0 && errors.length === 0) {
    errors.push('No cart rows were found in the PDF.')
  }

  return { data, errors }
}
