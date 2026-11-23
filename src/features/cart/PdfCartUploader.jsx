import { useRef, useState } from 'react'
import { readCartPdf } from './pdfReader.js'

export default function PdfCartUploader({ onLoad, active }) {
  const inputRef = useRef(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return

    setLoading(true)
    try {
      const { data, errors } = await readCartPdf(file)
      onLoad(data, errors, file.name)
    } catch {
      onLoad([], ['The PDF could not be read. Check that it is a text-based, unencrypted PDF.'], file.name)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: '0.65rem' }}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        style={{
          width: '100%',
          border: `1px solid ${active ? '#1e5c2c' : '#b9b9bf'}`,
          background: active ? '#f0faf2' : '#fff',
          color: active ? '#1e5c2c' : '#131A48',
          borderRadius: 4,
          padding: '0.6rem',
          fontSize: 12,
          fontWeight: 700,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? 'Reading PDF…' : 'Or upload cart PDF'}
      </button>
    </div>
  )
}
