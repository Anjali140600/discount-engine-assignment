# Rule entry feature

This folder will own the natural-language rule workflow:

1. Accept a plain-language description.
2. Send it through a small rule-parsing service.
3. Validate the returned object before displaying it.
4. Let the user confirm or discard the proposed rule.
5. Pass only a confirmed `DiscountRule` to the page state.

Implementation files:

- `RuleInput.jsx` — text entry, loading state, and request errors
- `ruleService.js` — the only module that knows how the remote endpoint works
- `../../domain/ruleValidation.js` — validates untrusted parsed data before pricing

Do not calculate discounts in this feature. The confirmed rule should be passed
to `src/domain/discountEngine.js` with the rest of the active rules.
