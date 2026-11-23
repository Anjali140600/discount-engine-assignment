# Feature folders

Feature folders contain complete user workflows. A feature may compose common
components and call a parser, but it should not duplicate pricing rules.

Planned folders:

- `rules/` — natural-language rule entry, validation, confirmation, and discard
- `cart/` — PDF upload, extracted-row review, and cart replacement

Each feature should expose one main component to `App.jsx`. Keep provider calls
behind a small service module so the interface is not tied to one vendor.
