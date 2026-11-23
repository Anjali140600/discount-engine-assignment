import { useState } from 'react'
import { parseRuleDescription } from './ruleService.js'

const fieldStyle = {
  width: '100%',
  minHeight: 82,
  padding: '0.7rem',
  border: '1px solid #b9b9bf',
  borderRadius: 4,
  resize: 'vertical',
  font: 'inherit',
  color: '#131A48',
}

const buttonStyle = {
  border: 'none',
  borderRadius: 4,
  padding: '0.6rem 1rem',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ marginTop: 2, fontWeight: 700, color: '#131A48' }}>{value}</div>
    </div>
  )
}

export default function RuleInput({ onConfirm }) {
  const [description, setDescription] = useState('')
  const [candidate, setCandidate] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleParse(event) {
    event.preventDefault()
    const trimmed = description.trim()
    if (!trimmed) {
      setError('Describe the discount rule before parsing it.')
      return
    }

    setLoading(true)
    setError('')
    setCandidate(null)
    try {
      setCandidate(await parseRuleDescription(trimmed))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    onConfirm(candidate)
    setCandidate(null)
    setDescription('')
    setError('')
  }

  return (
    <form onSubmit={handleParse}>
      <label htmlFor="rule-description" style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 6 }}>
        Describe a discount rule in plain English
      </label>
      <textarea
        id="rule-description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Example: 20% off Natura Casa products, stackable with other offers"
        style={fieldStyle}
        disabled={loading}
      />
      <div style={{ marginTop: '0.65rem' }}>
        <button
          type="submit"
          disabled={loading}
          style={{ ...buttonStyle, background: loading ? '#CECECE' : '#FF5800', color: '#fff' }}
        >
          {loading ? 'Interpreting…' : 'Interpret rule'}
        </button>
      </div>

      {error && (
        <div role="alert" style={{ marginTop: '0.75rem', padding: '0.65rem', color: '#8a1a1a', background: '#fce8e8', borderRadius: 4, fontSize: 12 }}>
          {error}
        </div>
      )}

      {candidate && (
        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #a8d5b2', background: '#f5fbf6', borderRadius: 4 }}>
          <div style={{ fontWeight: 700, color: '#1e5c2c', marginBottom: '0.75rem' }}>
            Confirm the interpreted rule
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
            <Field label="Scope" value={candidate.scope} />
            {candidate.scope !== 'cart' && <Field label="Applies to" value={candidate.appliesTo} />}
            <Field label="Type" value={candidate.type} />
            <Field label="Value" value={candidate.type === 'percentage' ? `${candidate.value}%` : `Rs.${candidate.value}`} />
            <Field label="Stackable" value={candidate.stackable ? 'Yes' : 'No'} />
            {candidate.scope === 'cart' && <Field label="Minimum cart" value={`Rs.${candidate.minCartValue.toLocaleString('en-IN')}`} />}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" onClick={handleConfirm} style={{ ...buttonStyle, background: '#1e5c2c', color: '#fff' }}>
              Confirm and add
            </button>
            <button type="button" onClick={() => setCandidate(null)} style={{ ...buttonStyle, background: '#fff', color: '#555', border: '1px solid #aaa' }}>
              Discard
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
