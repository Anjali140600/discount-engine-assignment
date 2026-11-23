import { validateRuleCandidate } from '../../domain/ruleValidation.js'

export async function parseRuleDescription(description) {
  const response = await fetch('/api/parse-rule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.error || 'The rule could not be interpreted. Please try again.')
  }

  const validation = validateRuleCandidate(body.rule)
  if (validation.errors.length > 0) {
    throw new Error(`The proposed rule is invalid: ${validation.errors.join(' ')}`)
  }

  return validation.data
}
