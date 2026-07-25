'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, MapPin, Check, AlertTriangle } from 'lucide-react'
import type { MapPoint } from '@/components/RiverRouteMap'

const RiverRouteMap = dynamic(() => import('@/components/RiverRouteMap'), {
  ssr: false,
  loading: () => <div style={{ height: 280, borderRadius: 12, background: 'rgba(10,22,40,0.6)' }} />,
})

export type LocationSelection = {
  putIn: string
  takeOut: string
  putInCoord: MapPoint | null
  takeOutCoord: MapPoint | null
  miles: number | null
  confidence: 'high' | 'medium' | 'low' | null
  confirmed: boolean
}

export const emptySelection: LocationSelection = {
  putIn: '',
  takeOut: '',
  putInCoord: null,
  takeOutCoord: null,
  miles: null,
  confidence: null,
  confirmed: false,
}

type DistanceResponse = {
  miles: number
  spreadMi: number
  confidence: 'high' | 'medium' | 'low'
  sources: { name: string; miles: number }[]
  putIn: { snapped: MapPoint; riverName: string | null }
  takeOut: { snapped: MapPoint; riverName: string | null }
  path: [number, number][]
  reversed: boolean
  warnings: string[]
  error?: string
}

type Props = {
  river: string
  putInOptions: string[]
  takeOutOptions: string[]
  value: LocationSelection
  onChange: (next: LocationSelection) => void
}

const ACCENT = '#22d3ee'
const PANEL = 'rgba(10,22,40,0.6)'
const BORDER = 'rgba(34,211,238,0.15)'

export default function LocationDistanceStep({ river, putInOptions, takeOutOptions, value, onChange }: Props) {
  const [locating, setLocating] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [result, setResult] = useState<DistanceResponse | null>(null)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const { putIn, takeOut, putInCoord, takeOutCoord } = value

  const patch = useCallback(
    (next: Partial<LocationSelection>) => onChange({ ...value, ...next }),
    [onChange, value]
  )

  // Editing either name invalidates everything downstream of it.
  function setName(which: 'putIn' | 'takeOut', name: string) {
    setResult(null)
    setError('')
    patch({
      [which]: name,
      [which === 'putIn' ? 'putInCoord' : 'takeOutCoord']: null,
      miles: null,
      confidence: null,
      confirmed: false,
    } as Partial<LocationSelection>)
  }

  // Resolve typed names to coordinates once both sides are filled in.
  useEffect(() => {
    if (!putIn.trim() || !takeOut.trim()) return
    if (putInCoord && takeOutCoord) return

    const id = ++requestId.current
    const timer = setTimeout(async () => {
      setLocating(true)
      setError('')
      try {
        const lookup = async (query: string): Promise<MapPoint | null> => {
          const params = new URLSearchParams({ q: query, river })
          const res = await fetch(`/api/geocode?${params}`)
          if (!res.ok) return null
          const data = await res.json()
          const first = data.results?.[0]
          return first ? { lat: first.lat, lng: first.lng } : null
        }
        const [p, t] = await Promise.all([
          putInCoord ?? lookup(putIn),
          takeOutCoord ?? lookup(takeOut),
        ])
        if (id !== requestId.current) return
        if (!p || !t) {
          setError(
            `Could not find ${!p ? `"${putIn}"` : `"${takeOut}"`} on the map. Try a nearby landmark, or paste coordinates as "lat, lng".`
          )
          return
        }
        patch({ putInCoord: p, takeOutCoord: t, confirmed: false })
      } finally {
        if (id === requestId.current) setLocating(false)
      }
    }, 600)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [putIn, takeOut, putInCoord, takeOutCoord, river])

  // Recompute river miles whenever either pin lands somewhere new.
  useEffect(() => {
    if (!putInCoord || !takeOutCoord) return
    const id = ++requestId.current
    setCalculating(true)
    setError('')

    fetch('/api/river-miles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ putIn: putInCoord, takeOut: takeOutCoord, river }),
    })
      .then(async res => ({ ok: res.ok, data: (await res.json()) as DistanceResponse }))
      .then(({ ok, data }) => {
        if (id !== requestId.current) return
        if (!ok || data.error) {
          setResult(null)
          setError(data.error ?? 'Could not calculate river miles.')
          patch({ miles: null, confidence: null })
          return
        }
        setResult(data)
        patch({ miles: data.miles, confidence: data.confidence })
      })
      .catch(() => {
        if (id === requestId.current) setError('Could not reach the mapping service.')
      })
      .finally(() => {
        if (id === requestId.current) setCalculating(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [putInCoord, takeOutCoord, river])

  const handleMove = useCallback(
    (which: 'putIn' | 'takeOut', point: MapPoint) => {
      onChange({
        ...value,
        [which === 'putIn' ? 'putInCoord' : 'takeOutCoord']: point,
        confirmed: false,
      })
    },
    [onChange, value]
  )

  const confidenceCopy = {
    high: { color: '#4ade80', text: 'Cross-checked against three USGS datasets' },
    medium: { color: '#fbbf24', text: 'Datasets agree closely, but check the pins below' },
    low: { color: '#fca5a5', text: 'Datasets disagree — please confirm the pins are on the water' },
  }

  return (
    <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Field label="Put-in Location" options={putInOptions} value={putIn} onChange={v => setName('putIn', v)}
        placeholder="e.g. Ruby Mountain, Nathrop" />
      <Field label="Take-out Location" options={takeOutOptions} value={takeOut} onChange={v => setName('takeOut', v)}
        placeholder="e.g. Hecla Junction" />

      {(locating || calculating) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          {locating ? 'Finding these places on the map…' : 'Measuring the river between them…'}
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 14px' }}>
          <AlertTriangle size={16} color="#fca5a5" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: '#fca5a5', fontSize: 13 }}>{error}</span>
        </div>
      )}

      {putInCoord && takeOutCoord && result && (
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
            Are these the two points you travelled?
          </p>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
            Drag either pin onto the exact spot you launched or landed and the distance updates.
          </p>

          <RiverRouteMap putIn={putInCoord} takeOut={takeOutCoord} path={result.path} onMove={handleMove} />

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 16 }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: ACCENT }}>{result.miles}</span>
            <span style={{ fontSize: 16, color: '#475569', fontWeight: 600 }}>river miles</span>
          </div>
          <p style={{ fontSize: 12, color: confidenceCopy[result.confidence].color, marginTop: 4 }}>
            {confidenceCopy[result.confidence].text}
            {result.sources.length > 1 && ` (±${result.spreadMi} mi across sources)`}
          </p>

          {result.reversed && (
            <p style={{ fontSize: 12, color: '#fbbf24', marginTop: 6 }}>
              Your take-out was upstream of your put-in, so we swapped them.
            </p>
          )}
          {result.warnings.map(w => (
            <p key={w} style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{w}</p>
          ))}

          <details style={{ marginTop: 10 }}>
            <summary style={{ fontSize: 12, color: '#475569', cursor: 'pointer' }}>How this was measured</summary>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#64748b', fontSize: 12, lineHeight: 1.7 }}>
              {result.sources.map(s => (
                <li key={s.name}>{s.name}: {s.miles} mi</li>
              ))}
            </ul>
          </details>

          <button
            type="button"
            onClick={() => patch({ confirmed: true, miles: result.miles, confidence: result.confidence })}
            style={{
              marginTop: 14, width: '100%', padding: '14px', borderRadius: 10, cursor: 'pointer',
              fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: value.confirmed ? 'rgba(74,222,128,0.15)' : ACCENT,
              border: `1px solid ${value.confirmed ? '#4ade80' : ACCENT}`,
              color: value.confirmed ? '#4ade80' : '#04121f',
            }}
          >
            {value.confirmed ? <><Check size={16} /> Confirmed</> : <><MapPin size={16} /> Yes, these are correct</>}
          </button>
        </div>
      )}
    </div>
  )
}

function Field({ label, options, value, onChange, placeholder }: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const isOther = value !== '' && !options.includes(value)
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
        {label}
      </label>
      {options.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {options.map(opt => (
            <button key={opt} type="button" onClick={() => onChange(opt)}
              style={{
                padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 14,
                background: value === opt ? 'rgba(34,211,238,0.15)' : PANEL,
                border: `1px solid ${value === opt ? ACCENT : BORDER}`,
                color: value === opt ? ACCENT : '#94a3b8',
                fontWeight: value === opt ? 600 : 400,
              }}>
              {opt}
            </button>
          ))}
          <button type="button" onClick={() => onChange('')}
            style={{
              padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 14,
              background: isOther ? 'rgba(34,211,238,0.15)' : PANEL,
              border: `1px solid ${isOther ? ACCENT : BORDER}`,
              color: isOther ? ACCENT : '#94a3b8',
              fontWeight: isOther ? 600 : 400,
            }}>
            Other
          </button>
        </div>
      )}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input-river" />
    </div>
  )
}
