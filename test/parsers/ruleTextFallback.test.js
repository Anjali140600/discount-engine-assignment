import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRuleTextFallback } from '../../src/parsers/ruleTextFallback.js'

test('parses the documented flat platform format', () => {
  const result = parseRuleTextFallback('Rs.100 flat discount on all Flipkart items')

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.data, {
    scope: 'platform',
    appliesTo: 'Flipkart',
    type: 'flat',
    value: 100,
    stackable: false,
  })
})

test('parses a stackable percentage brand format', () => {
  const result = parseRuleTextFallback('20% off Natura Casa products, stackable with other offers')

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.data, {
    scope: 'brand',
    appliesTo: 'Natura Casa',
    type: 'percentage',
    value: 20,
    stackable: true,
  })
})

test('parses a percentage cart threshold format', () => {
  const result = parseRuleTextFallback('10% off if cart value is more than Rs.5,000')

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.data, {
    scope: 'cart',
    appliesTo: '',
    type: 'percentage',
    value: 10,
    stackable: false,
    minCartValue: 5000,
  })
})

test('rejects an ambiguous rule instead of guessing', () => {
  const result = parseRuleTextFallback('Give a discount for big orders')

  assert.equal(result.data, null)
  assert.match(result.errors[0], /positive discount value/i)
})
