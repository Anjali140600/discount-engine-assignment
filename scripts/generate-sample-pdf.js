import { mkdirSync, writeFileSync } from 'node:fs'

const rows = [
  ['Product', 'Brand', 'Platform', 'Base Price'],
  ['Cushion Cover', 'Natura Casa', 'Amazon India', 'Rs.1,299'],
  ['Bed Sheet Set', 'Natura Casa', 'Flipkart', 'Rs.849'],
  ['Wall Shelf', 'LivSpace Pro', 'Amazon India', 'Rs.599'],
  ['Ceramic Vase', 'LivSpace Pro', 'Noon', 'Rs.2,499'],
  ['Cutting Board', 'Nordic Basics', 'Amazon India', 'Rs.449'],
  ['Desk Organiser', 'Nordic Basics', 'Flipkart', 'Rs.899'],
]

const escapePdfText = (value) => value.replace(/([\\()])/g, '\\$1')
const text = [
  'BT',
  '/F1 11 Tf',
  '40 760 Td',
  '(Order #OP-9921) Tj',
  ...rows.flatMap((row, index) => {
    const y = 720 - (index * 24)
    return row.map((cell, column) => {
      const x = [40, 220, 350, 470][column]
      return `1 0 0 1 ${x} ${y} Tm (${escapePdfText(cell)}) Tj`
    })
  }),
  'ET',
].join('\n')

const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
  `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
]

let pdf = '%PDF-1.4\n'
const offsets = [0]
objects.forEach((object, index) => {
  offsets.push(Buffer.byteLength(pdf))
  pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
})

const xrefOffset = Buffer.byteLength(pdf)
pdf += `xref\n0 ${objects.length + 1}\n`
pdf += '0000000000 65535 f \n'
offsets.slice(1).forEach((offset) => {
  pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
})
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

mkdirSync('sample-data', { recursive: true })
writeFileSync('sample-data/cart.pdf', pdf)
