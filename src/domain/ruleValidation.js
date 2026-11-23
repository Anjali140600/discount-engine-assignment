const VALID_SCOPES = new Set(['brand', 'platform', 'cart'])
const VALID_TYPES = new Set(['percentage', 'flat'])

/**
 * Treat model output as untrusted input. This validator is shared by the
 * server endpoint and browser confirmation flow so invalid rules can never
 * reach the pricing engine accidentally.
 */
export function validateRuleCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { data: null, errors: ['The parsed rule is not an object.'] }
  }

  const errors = []
  const scope = typeof candidate.scope === 'string' ? candidate.scope.trim().toLowerCase() : ''
  const type = typeof candidate.type === 'string' ? candidate.type.trim().toLowerCase() : ''
  const appliesTo = typeof candidate.appliesTo === 'string' ? candidate.appliesTo.trim() : ''
  const value = Number(candidate.value)

  if (!VALID_SCOPES.has(scope)) errors.push('Scope must be brand, platform, or cart.')
  if (!VALID_TYPES.has(type)) errors.push('Discount type must be percentage or flat.')
  if (!Number.isFinite(value) || value <= 0) errors.push('Discount value must be a positive number.')
  if (type === 'percentage' && value > 100) errors.push('Percentage discount cannot exceed 100%.')
  if (scope !== 'cart' && !appliesTo) errors.push('Brand and platform rules require an applies-to value.')
  if (typeof candidate.stackable !== 'boolean') errors.push('Stackable must be either true or false.')

  let minCartValue
  if (scope === 'cart') {
    minCartValue = Number(candidate.minCartValue)
    if (!Number.isFinite(minCartValue) || minCartValue <= 0) {
      errors.push('Cart rules require a positive minimum cart value.')
    }
  }

  if (errors.length > 0) return { data: null, errors }

  return {
    errors: [],
    data: {
      scope,
      appliesTo: scope === 'cart' ? '' : appliesTo,
      type,
      value,
      stackable: candidate.stackable,
      ...(scope === 'cart' ? { minCartValue } : {}),
    },
  }
}
