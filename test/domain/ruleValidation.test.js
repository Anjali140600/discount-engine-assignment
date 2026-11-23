import test from 'node:test'
import assert from 'node:assert/strict'
import { validateRuleCandidate } from '../../src/domain/ruleValidation.js'

test('accepts and normalises a complete brand rule', () => {
  const result = validateRuleCandidate({
    scope: ' Brand ',
    appliesTo: 'Natura Casa',
    type: 'Percentage',
    value: 20,
    stackable: true,
    minCartValue: 0,
  })

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.data, {
    scope: 'brand',
    appliesTo: 'Natura Casa',
    type: 'percentage',
    value: 20,
    stackable: true,
  })
})

test('rejects a cart rule without a threshold', () => {
  const result = validateRuleCandidate({
    scope: 'cart',
    appliesTo: '',
    type: 'percentage',
    value: 10,
    stackable: false,
    minCartValue: 0,
  })

  assert.equal(result.data, null)
  assert.match(result.errors.join(' '), /minimum cart value/i)
})

test('rejects an unsafe percentage', () => {
  const result = validateRuleCandidate({
    scope: 'platform',
    appliesTo: 'Flipkart',
    type: 'percentage',
    value: 120,
    stackable: false,
  })

  assert.equal(result.data, null)
  assert.match(result.errors.join(' '), /cannot exceed 100/i)
})
