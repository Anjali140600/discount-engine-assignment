# Cart import feature

This folder will own the PDF cart workflow:

1. Accept a PDF file.
2. Extract its text or table rows.
3. Convert valid rows into `CartItem` objects.
4. Report malformed rows clearly instead of failing the complete upload.
5. Replace the current cart only after usable items have been extracted.

Implementation files:

- `PdfCartUploader.jsx` — file selection, progress, and user feedback
- `pdfReader.js` — browser PDF text extraction
- `../../parsers/pdfCartParser.js` — positioned text to validated cart items

Keep extraction separate from pricing. Once this feature returns `CartItem[]`,
`src/domain/discountEngine.js` should process it exactly like a CSV cart.
