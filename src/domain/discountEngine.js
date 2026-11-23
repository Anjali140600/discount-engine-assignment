/**
 * Pure pricing logic. This module knows nothing about React, CSV files, PDFs,
 * or remote services. Every input path must first create the plain objects
 * described below, which keeps pricing consistent and easy to test.
 *
 * Data shapes:
 *
 * DiscountRule {
 *   ruleId:    string       — e.g. "RULE-01"
 *   scope:     "brand" | "platform" | "cart"
 *   appliesTo: string       — e.g. "Natura Casa", "Amazon India"
 *   type:      "percentage" | "flat"
 *   value:     number       — percentage as integer (15 = 15%), flat in rupees
 *   stackable: boolean
 *   minCartValue?: number
 * }
 *
 * CartItem {
 *   itemId:    string       — e.g. "ITEM-01"
 *   product:   string
 *   brand:     string
 *   platform:  string
 *   basePrice: number       — in rupees
 * }
 *
 * DiscountResult {
 *   itemId:        string
 *   product:       string
 *   brand:         string
 *   platform:      string
 *   basePrice:     number
 *   finalPrice:    number
 *   totalDiscount: number
 *   appliedRules:  string[]
 *   skippedRules:  string[]
 *   reasoning:     string   — customer-readable explanation
 * }
 */

/**
 * Returns true if the rule applies to this cart item.
 */
export function ruleMatchesItem(item, rule) {
  const normalise = (s) => s.trim().toLowerCase()
  if (rule.scope === 'brand') {
    return normalise(item.brand) === normalise(rule.appliesTo)
  }
  if (rule.scope === 'platform') {
    return normalise(item.platform) === normalise(rule.appliesTo)
  }
  return false
}

/**
 * Calculates the rupee discount a rule gives on a given price.
 * Uses the provided price, not the original base price — important for stacking.
 */
export function calculateDiscountAmount(price, rule) {
  let discount = 0
  if (rule.type === 'percentage') {
    discount = Math.round(price * rule.value / 100)
  }
  if (rule.type === 'flat') {
    discount = Math.round(rule.value)
  }
  return Math.max(0, Math.min(price, discount))
}

/**
 * Builds the customer-facing reasoning string for an applied rule.
 */
function ruleToReasoning(rule) {
  const scopeLabel = rule.scope === 'brand' ? 'Brand' : 'Platform'
  if (rule.type === 'percentage') {
    return `${scopeLabel} offer: ${rule.value}% off`
  }
  if (rule.type === 'flat') {
    return `${scopeLabel} offer: Rs.${rule.value} off`
  }
  return `${scopeLabel} offer applied`
}

/**
 * Applies the active discount rules to a single cart item.
 * Returns a DiscountResult.
 *
 * Logic:
 *   1. Find all rules that match this item.
 *   2. Among non-stackable rules, pick the one giving the largest discount.
 *   3. Apply any stackable rules on top of that price.
 *   4. Build the reasoning string from what was applied.
 */
export function applyDiscounts(item, rules) {
  const matchingRules = rules.filter(
    (rule) => rule.scope !== 'cart' && ruleMatchesItem(item, rule)
  )

  // This message is customer-facing, so keep it meaningful rather than empty.
  if (matchingRules.length === 0) {
    return {
      itemId: item.itemId,
      product: item.product,
      brand: item.brand,
      platform: item.platform,
      basePrice: item.basePrice,
      finalPrice: item.basePrice,
      totalDiscount: 0,
      appliedRules: [],
      skippedRules: [],
      reasoning: 'No offers available',
    }
  }

  const nonStackable = matchingRules.filter((r) => !r.stackable)
  const stackable = matchingRules.filter((r) => r.stackable)

  // Scope does not decide the winner; only the rupee saving does.
  let winner = null
  let skipped = []

  if (nonStackable.length > 0) {
    const sorted = [...nonStackable].sort(
      (a, b) =>
        calculateDiscountAmount(item.basePrice, b) -
        calculateDiscountAmount(item.basePrice, a)
    )
    winner = sorted[0]
    skipped = sorted.slice(1)
  }

  // Stackable percentages use the remaining price, as required by the brief.
  let price = item.basePrice
  const appliedRules = []
  const reasoningParts = []

  if (winner) {
    price -= calculateDiscountAmount(price, winner)
    appliedRules.push(winner.ruleId)
    reasoningParts.push(ruleToReasoning(winner))
  }

  for (const rule of stackable) {
    price -= calculateDiscountAmount(price, rule)
    appliedRules.push(rule.ruleId)
    reasoningParts.push(ruleToReasoning(rule))
  }

  const finalPrice = Math.round(price)

  return {
    itemId: item.itemId,
    product: item.product,
    brand: item.brand,
    platform: item.platform,
    basePrice: item.basePrice,
    finalPrice,
    totalDiscount: item.basePrice - finalPrice,
    appliedRules,
    skippedRules: skipped.map((r) => r.ruleId),
    reasoning: reasoningParts.join(' + '),
  }
}

/**
 * Runs applyDiscounts across every item in the cart.
 * Returns an array of DiscountResult objects.
 */
export function processCart(cartItems, rules) {
  return cartItems.map((item) => applyDiscounts(item, rules))
}

/**
 * Sums the final prices across all results.
 */
export function cartTotal(results) {
  return results.reduce((sum, r) => sum + r.finalPrice, 0)
}

/**
 * Applies eligible cart-level rules after all item discounts.
 * The best non-stackable rule is applied first, followed by stackable rules.
 */
export function applyCartDiscounts(subtotal, rules) {
  const eligibleRules = rules.filter(
    (rule) =>
      rule.scope === 'cart' &&
      Number.isFinite(rule.minCartValue) &&
      subtotal >= rule.minCartValue
  )

  const nonStackable = eligibleRules.filter((rule) => !rule.stackable)
  const stackable = eligibleRules.filter((rule) => rule.stackable)
  const sorted = [...nonStackable].sort(
    (a, b) => calculateDiscountAmount(subtotal, b) - calculateDiscountAmount(subtotal, a)
  )
  // Reuse item-level precedence: best exclusive rule first, then stackable rules.
  const appliedRules = sorted.length > 0 ? [sorted[0], ...stackable] : stackable

  let price = subtotal
  const appliedRuleDetails = []
  for (const rule of appliedRules) {
    const saved = calculateDiscountAmount(price, rule)
    price -= saved
    appliedRuleDetails.push({
      ruleId: rule.ruleId,
      type: rule.type,
      value: rule.value,
      saved,
    })
  }

  const finalTotal = Math.round(price)
  return {
    applied: appliedRuleDetails.length > 0,
    appliedRules: appliedRuleDetails,
    skippedRules: sorted.slice(1).map((rule) => rule.ruleId),
    totalDiscount: subtotal - finalTotal,
    finalTotal,
  }
}

/**
 * Calculates a complete cart summary in the required order.
 */
export function calculateCart(cartItems, rules) {
  const items = processCart(cartItems, rules)
  const subtotal = cartTotal(items)
  const cartOffer = applyCartDiscounts(subtotal, rules)

  return {
    items,
    subtotal,
    cartOffer,
    finalTotal: cartOffer.finalTotal,
  }
}
