import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyCartDiscounts,
  applyDiscounts,
  calculateCart,
} from '../../src/domain/discountEngine.js'

const rules = [
  { ruleId: 'RULE-01', scope: 'platform', appliesTo: 'Amazon India', type: 'percentage', value: 15, stackable: false },
  { ruleId: 'RULE-02', scope: 'brand', appliesTo: 'Natura Casa', type: 'flat', value: 150, stackable: false },
  { ruleId: 'RULE-03', scope: 'platform', appliesTo: 'Flipkart', type: 'percentage', value: 10, stackable: true },
  { ruleId: 'RULE-04', scope: 'cart', appliesTo: '', type: 'percentage', value: 10, stackable: false, minCartValue: 4000 },
]

const cart = [
  { itemId: 'ITEM-01', product: 'Cushion Cover', brand: 'Natura Casa', platform: 'Amazon India', basePrice: 1299 },
  { itemId: 'ITEM-02', product: 'Bed Sheet Set', brand: 'Natura Casa', platform: 'Flipkart', basePrice: 849 },
  { itemId: 'ITEM-03', product: 'Wall Shelf', brand: 'LivSpace Pro', platform: 'Amazon India', basePrice: 599 },
  { itemId: 'ITEM-04', product: 'Ceramic Vase', brand: 'LivSpace Pro', platform: 'Noon', basePrice: 2499 },
  { itemId: 'ITEM-05', product: 'Cutting Board', brand: 'Nordic Basics', platform: 'Amazon India', basePrice: 449 },
  { itemId: 'ITEM-06', product: 'Desk Organiser', brand: 'Nordic Basics', platform: 'Flipkart', basePrice: 899 },
]

test('calculates the assignment sample including the cart offer', () => {
  const summary = calculateCart(cart, rules)

  assert.deepEqual(summary.items.map((item) => item.finalPrice), [1104, 629, 509, 2499, 382, 809])
  assert.equal(summary.subtotal, 5932)
  assert.equal(summary.cartOffer.totalDiscount, 593)
  assert.equal(summary.finalTotal, 5339)
})

test('does not show a cart offer below its threshold', () => {
  const result = applyCartDiscounts(3999, rules)

  assert.equal(result.applied, false)
  assert.equal(result.totalDiscount, 0)
  assert.equal(result.finalTotal, 3999)
})

test('applies a cart offer when the subtotal exactly meets its threshold', () => {
  const result = applyCartDiscounts(4000, rules)

  assert.equal(result.applied, true)
  assert.equal(result.totalDiscount, 400)
  assert.equal(result.finalTotal, 3600)
})

test('prevents flat discounts from producing a negative item price', () => {
  const item = { itemId: 'ITEM-X', product: 'Cup', brand: 'Example', platform: 'Shop', basePrice: 80 }
  const largeFlatRule = { ruleId: 'RULE-X', scope: 'brand', appliesTo: 'Example', type: 'flat', value: 100, stackable: false }

  assert.equal(applyDiscounts(item, [largeFlatRule]).finalPrice, 0)
})
