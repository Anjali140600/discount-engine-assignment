import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCartTablePages } from '../../src/parsers/pdfCartParser.js'

const header = [
  { str: 'Product', x: 40, y: 700 },
  { str: 'Brand', x: 210, y: 700 },
  { str: 'Platform', x: 340, y: 700 },
  { str: 'Base Price', x: 470, y: 700 },
]

test('reconstructs cart items from positioned PDF text', () => {
  const page = [
    ...header,
    { str: 'Cushion Cover', x: 40, y: 680 },
    { str: 'Natura Casa', x: 210, y: 680 },
    { str: 'Amazon India', x: 340, y: 680 },
    { str: 'Rs.1,299', x: 470, y: 680 },
    { str: 'Bed Sheet Set', x: 40, y: 660 },
    { str: 'Natura Casa', x: 210, y: 660 },
    { str: 'Flipkart', x: 340, y: 660 },
    { str: '₹849', x: 470, y: 660 },
  ]

  const result = parseCartTablePages([page])

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.data, [
    { itemId: 'ITEM-01', product: 'Cushion Cover', brand: 'Natura Casa', platform: 'Amazon India', basePrice: 1299 },
    { itemId: 'ITEM-02', product: 'Bed Sheet Set', brand: 'Natura Casa', platform: 'Flipkart', basePrice: 849 },
  ])
})

test('keeps valid rows and reports malformed rows', () => {
  const page = [
    ...header,
    { str: 'Valid Product', x: 40, y: 680 },
    { str: 'Good Brand', x: 210, y: 680 },
    { str: 'Shop', x: 340, y: 680 },
    { str: 'Rs.500', x: 470, y: 680 },
    { str: 'Broken Product', x: 40, y: 660 },
    { str: 'Good Brand', x: 210, y: 660 },
    { str: 'Shop', x: 340, y: 660 },
  ]

  const result = parseCartTablePages([page])

  assert.equal(result.data.length, 1)
  assert.equal(result.errors.length, 1)
  assert.match(result.errors[0], /table row 2/i)
})

test('reports a missing table header', () => {
  const result = parseCartTablePages([[{ str: 'Not a cart', x: 10, y: 10 }]])

  assert.equal(result.data.length, 0)
  assert.match(result.errors[0], /header not found/i)
})
