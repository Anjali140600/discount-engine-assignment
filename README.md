# Opptra Discount Engine

A customer-facing cart pricing prototype that selects the best item offer,
stacks eligible discounts, applies threshold-based cart offers, and explains
the result in plain language.

## Live deployment

Deployment URL: https://discount-engine-assignment-zeta.vercel.app/

## Run locally

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`.
3. Run `npm run dev` and open `http://localhost:5173`.

The CSV and PDF pricing paths work without a remote key. The key is required
only for interpreting rules written in plain English.

## Features

- CSV upload for discount rules and cart items
- Best-saving selection among matching non-stackable item rules
- Stackable rules applied after the winning non-stackable rule
- Cart offers evaluated after all item discounts
- Plain-English rule interpretation with validation and confirm/discard controls
- Client-side PDF cart extraction with partial-row error reporting
- Automatic recalculation after a confirmed rule or valid PDF upload
- Customer-readable offer explanations and no-offer states
- Responsive layout and keyboard-visible controls

## Try the sample data

Upload `sample-data/rules.csv`, then upload either `sample-data/cart.csv` or
`sample-data/cart.pdf`. The expected summary is:

| Result | Amount |
|---|---:|
| Cart total after item offers | Rs.5,932 |
| Cart offer saving | Rs.593 |
| Final cart total | Rs.5,339 |

The sample PDF is reproducible with `npm run sample:pdf`.

## Architecture

```text
src/
  components/common/     Reusable interface components
  domain/                Pure pricing and rule validation
  parsers/               CSV and positioned-PDF conversion
  features/rules/        Rule entry, confirmation, and endpoint client
  features/cart/         PDF upload and browser extraction
  App.jsx                Page composition and session state
api/
  parse-rule.js          Protected server endpoint
test/
  api/                   Endpoint behavior
  domain/                Pricing and validation behavior
  parsers/               CSV and PDF behavior
```

All input paths produce the same `DiscountRule` or `CartItem` shapes before
calling the pricing domain. This keeps file handling and remote calls out of the
calculator and makes another input method possible without rewriting pricing.

## Pricing decisions

- Multiple matching non-stackable rules compete by rupee saving, regardless of
  whether their scope is brand or platform.
- Every matching stackable rule is applied after the winning non-stackable rule.
- Percentage stacking uses the remaining price.
- A discount is capped at the remaining price, so totals cannot become negative.
- Values are rounded to whole rupees to match the supplied expected results.
- Cart thresholds are inclusive and evaluated against discounted item totals.
- If several cart rules exist, the best non-stackable rule wins and eligible
  stackable cart rules follow it.

## Input validation and failure behavior

- Percentages must be greater than zero and no more than 100.
- Cart rules require a positive minimum cart value.
- Brand and platform rules require an applies-to value.
- Parsed rules are treated as untrusted and validated on both sides of the
  endpoint before confirmation.
- Ambiguous descriptions are rejected with a request for missing details.
- If the remote parser is temporarily unavailable, documented rule formats use
  a narrow validated fallback; unsupported or ambiguous wording is still rejected.
- PDF rows are validated independently. Valid rows are kept and malformed rows
  are reported; if no usable rows exist, the current cart is preserved.
- Image-only or encrypted PDFs are rejected with a clear message.

## Security and privacy

The remote key is read only by the server endpoint and is never added to the
browser bundle. CSV and PDF files are processed in the browser and are not
uploaded. There is no database: rules, cart items, and results live only in the
current browser session, as allowed by the assignment.

## Commands

```bash
npm run dev        # local development, including the rule endpoint adapter
npm test           # automated tests
npm run build      # production build
npm run preview    # preview the static build (remote endpoint not included)
npm run sample:pdf # regenerate the sample PDF fixture
```

## Deployment

Deploy the repository to Vercel and add `GEMINI_API_KEY` as a server environment
variable. Do not prefix server secrets with `VITE_`, because variables with that
prefix are exposed to browser code.

## Known tradeoffs

- State is intentionally session-only; refreshing clears uploaded data.
- PDF parsing targets text-based tables with the documented four-column layout,
  not arbitrary invoices or scanned images.
- The PDF reader is a comparatively large dependency, so it is downloaded only
  when a PDF is selected.
- Rule interpretation depends on an external service and can be affected by
  availability, latency, quota, or model changes. Strict validation prevents an
  invalid response from entering the pricing engine.
