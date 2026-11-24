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
    candidates: [{
      content: {
        parts: [{ text: JSON.stringify(value) }],
      },
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
  globalThis.fetch = async (url, options) => {
    assert.match(url, /gemini-3\.5-flash-lite:generateContent$/)
    const requestBody = JSON.parse(options.body)
    assert.equal(requestBody.generationConfig.responseMimeType, 'application/json')
    return {
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
    }
  }
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

test('accepts valid structured output wrapped in markdown fences', async () => {
  const previousFetch = globalThis.fetch
  const previousKey = process.env.GEMINI_API_KEY
  process.env.GEMINI_API_KEY = 'test-key'
  const candidate = {
    resolved: true,
    error: '',
    scope: 'platform',
    appliesTo: 'Flipkart',
    type: 'flat',
    value: 100,
    stackable: false,
    minCartValue: 0,
  }
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: `\`\`\`json\n${JSON.stringify(candidate)}\n\`\`\`` }] } }],
    }),
  })
  const response = createResponse()

  await handler({ method: 'POST', body: { description: 'Rs.100 off all Flipkart items' } }, response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.rule.value, 100)
  globalThis.fetch = previousFetch
  if (previousKey) process.env.GEMINI_API_KEY = previousKey
  else delete process.env.GEMINI_API_KEY
})

test('retries one transient provider failure and returns the valid rule', async () => {
  const previousFetch = globalThis.fetch
  const previousKey = process.env.GEMINI_API_KEY
  process.env.GEMINI_API_KEY = 'test-key'
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    if (calls === 1) return { ok: false, status: 503 }
    return {
      ok: true,
      status: 200,
      json: async () => providerPayload({
        resolved: true,
        error: '',
        scope: 'platform',
        appliesTo: 'Flipkart',
        type: 'flat',
        value: 100,
        stackable: false,
        minCartValue: 0,
      }),
    }
  }
  const response = createResponse()

  await handler({ method: 'POST', body: { description: 'Rs.100 off all Flipkart items' } }, response)

  assert.equal(calls, 2)
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.rule.value, 100)
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
