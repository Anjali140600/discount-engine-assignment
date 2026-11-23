import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../../api/parse-rule.js'

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

function providerPayload(value) {
  return {
    steps: [{
      type: 'model_output',
      content: [{ type: 'text', text: JSON.stringify(value) }],
    }],
  }
}

test('reports missing server configuration without calling the provider', async () => {
  const previousKey = process.env.GEMINI_API_KEY
  delete process.env.GEMINI_API_KEY
  const response = createResponse()

  await handler({ method: 'POST', body: { description: '10% off Amazon items' } }, response)

  assert.equal(response.statusCode, 503)
  assert.match(response.body.error, /not configured/i)
  if (previousKey) process.env.GEMINI_API_KEY = previousKey
})

test('returns a validated rule from a valid structured response', async () => {
  const previousFetch = globalThis.fetch
  const previousKey = process.env.GEMINI_API_KEY
  process.env.GEMINI_API_KEY = 'test-key'
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => providerPayload({
      resolved: true,
      error: '',
      scope: 'brand',
      appliesTo: 'Natura Casa',
      type: 'percentage',
      value: 20,
      stackable: true,
      minCartValue: 0,
    }),
  })
  const response = createResponse()

  await handler({ method: 'POST', body: { description: '20% off Natura Casa, stackable' } }, response)

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body.rule, {
    scope: 'brand',
    appliesTo: 'Natura Casa',
    type: 'percentage',
    value: 20,
    stackable: true,
  })
  globalThis.fetch = previousFetch
  if (previousKey) process.env.GEMINI_API_KEY = previousKey
  else delete process.env.GEMINI_API_KEY
})

test('returns a useful error for an ambiguous description', async () => {
  const previousFetch = globalThis.fetch
  const previousKey = process.env.GEMINI_API_KEY
  process.env.GEMINI_API_KEY = 'test-key'
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => providerPayload({
      resolved: false,
      error: 'Add a discount value and minimum cart amount.',
      scope: 'unknown',
      appliesTo: '',
      type: 'unknown',
      value: 0,
      stackable: false,
      minCartValue: 0,
    }),
  })
  const response = createResponse()

  await handler({ method: 'POST', body: { description: 'Give a discount for big orders' } }, response)

  assert.equal(response.statusCode, 422)
  assert.match(response.body.error, /discount value/i)
  globalThis.fetch = previousFetch
  if (previousKey) process.env.GEMINI_API_KEY = previousKey
  else delete process.env.GEMINI_API_KEY
})

test('rejects malformed JSON before any provider call', async () => {
  const response = createResponse()

  await handler({ method: 'POST', body: '{invalid' }, response)

  assert.equal(response.statusCode, 400)
  assert.match(response.body.error, /valid JSON/i)
})
