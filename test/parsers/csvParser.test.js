import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRulesCSV } from '../../src/parsers/csvParser.js'

test('parses a cart rule with an empty applies_to value', () => {
  const csv = [
    'rule_id,scope,applies_to,type,value,stackable,min_cart_value',
    'RULE-04,cart,,percentage,10,false,4000',
  ].join('\n')

  const result = parseRulesCSV(csv)

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.data[0], {
    ruleId: 'RULE-04',
    scope: 'cart',
    appliesTo: '',
    type: 'percentage',
    value: 10,
    stackable: false,
    minCartValue: 4000,
  })
})

test('rejects a cart rule without a usable threshold', () => {
  const csv = [
    'rule_id,scope,applies_to,type,value,stackable,min_cart_value',
    'RULE-04,cart,,percentage,10,false,',
  ].join('\n')

  const result = parseRulesCSV(csv)

  assert.equal(result.data.length, 0)
  assert.match(result.errors[0], /min_cart_value/)
})
