import { validateRuleCandidate } from '../domain/ruleValidation.js'

function titleCase(value) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

/**
 * Handles the documented rule formats only when the remote parser is down.
 * It deliberately returns validation errors instead of guessing unsupported
 * product-specific or incomplete rules.
 */
export function parseRuleTextFallback(description) {
  const text = description.trim()
  const percentageMatch = text.match(/(-?\d+(?:\.\d+)?)\s*%/)
  const moneyMatches = [...text.matchAll(/(?:rs\.?|inr|₹)\s*(-?[\d,]+(?:\.\d+)?)/gi)]
  const isCartRule = /\b(?:cart|order)\b/i.test(text) && /\b(?:if|when|minimum|at least|more than|above|exceeds?)\b/i.test(text)

  let scope = ''
  let appliesTo = ''
  let type = ''
  let value
  let minCartValue

  if (percentageMatch) {
    type = 'percentage'
    value = Number(percentageMatch[1])
  } else if (moneyMatches.length > 0) {
    type = 'flat'
    value = Number(moneyMatches[0][1].replace(/,/g, ''))
  }

  if (isCartRule) {
    scope = 'cart'
    const thresholdMatch = moneyMatches.at(-1)
    minCartValue = thresholdMatch ? Number(thresholdMatch[1].replace(/,/g, '')) : undefined
  } else {
    const brandMatch = text.match(/(?:for\s+)?(.+?)\s+brand\b/i)
      || text.match(/\boff\s+(?:for\s+)?(.+?)\s+products?\b/i)
    const platformMatch = text.match(/\b(?:on|for)\s+(?:all\s+)?(.+?)\s+items?\b/i)

    if (brandMatch) {
      scope = 'brand'
      appliesTo = titleCase(brandMatch[1])
    } else if (platformMatch) {
      scope = 'platform'
      appliesTo = titleCase(platformMatch[1])
    }
  }

  const explicitlyNotStackable = /\b(?:not|non[- ]?)stackable\b/i.test(text)
  const stackable = !explicitlyNotStackable && /\bstackable\b|with other offers|combine/i.test(text)
  const validation = validateRuleCandidate({
    scope,
    appliesTo,
    type,
    value,
    stackable,
    minCartValue,
  })

  if (validation.errors.length === 0) return validation

  return {
    data: null,
    errors: [
      'Please include a positive discount value and a supported brand, platform, or cart threshold.',
    ],
  }
}
