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

type Candidate = { label: string; lat: number; lng: number; nameMatch?: boolean }

// Rough relative distance for ranking candidate pairs — doesn't need to be
// geodesically precise, just consistent enough to find the closest pair.
function approxMi(a: Candidate, b: Candidate): number {
  const dLat = a.lat - b.lat
  const dLng = (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng) * 69

}

export default function LocationDistanceStep({ river, putInOptions, takeOutOptions, value, onChange }: Props) {
  const [locating, setLocating] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [result, setResult] = useState<DistanceResponse | null>(null)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const [putInCandidates, setPutInCandidates] = useState<Candidate[]>([])
  const [takeOutCandidates, setTakeOutCandidates] = useState<Candidate[]>([])
  const [putInLabel, setPutInLabel] = useState('')
  const [takeOutLabel, setTakeOutLabel] = useState('')
  const [pickerOpen, setPickerOpen] = useState<'putIn' | 'takeOut' | null>(null)

  const { putIn, takeOut, putInCoord, takeOutCoord } = value

  const patch = useCallback(
    (next: Partial<LocationSelection>) => onChange({ ...value, ...next }),
    [onChange, value]
  )

  // Editing either name invalidates everything downstream of it.
  function setName(which: 'putIn' | 'takeOut', name: string) {
    setResult(null)
    setError('')
    setPutInCandidates([])
    setTakeOutCandidates([])
    setPutInLabel('')
    setTakeOutLabel('')
    setPickerOpen(null)
    patch({
      [which]: name,
      [which === 'putIn' ? 'putInCoord' : 'takeOutCoord']: null,
      miles: null,
      confidence: null,
      confirmed: false,
    } as Partial<LocationSelection>)
  }

  function pickCandidate(which: 'putIn' | 'takeOut', c: Candidate) {
    if (which === 'putIn') setPutInLabel(c.label)
    else setTakeOutLabel(c.label)
    setPickerOpen(null)
    patch({
      [which === 'putIn' ? 'putInCoord' : 'takeOutCoord']: { lat: c.lat, lng: c.lng },
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
        const search = async (query: string): Promise<Candidate[]> => {
          const params = new URLSearchParams({ q: query, river })
          const res = await fetch(`/api/geocode?${params}`)
          if (!res.ok) return []
          const data = await res.json()
          return (data.results ?? []) as Candidate[]
        }
        const [pCands, tCands] = await Promise.all([
          putInCoord ? Promise.resolve<Candidate[]>([{ label: putIn, ...putInCoord }]) : search(putIn),
          takeOutCoord ? Promise.resolve<Candidate[]>([{ label: takeOut, ...takeOutCoord }]) : search(takeOut),
        ])
        if (id !== requestId.current) return
        if (!pCands.length || !tCands.length) {
          setError(
            `Could not find ${!pCands.length ? `"${putIn}"` : `"${takeOut}"`} on the map. Try a nearby landmark, or paste coordinates as "lat, lng".`
          )
          return
        }

        // A real put-in and take-out sit on the same stretch of river. The API
        // already flags which candidates actually snap onto the named river
        // (nameMatch) — prefer a pair that both do, and only among those use
        // proximity as the tie-break, so an unrelated but nearby "Two Rivers
        // Lake" can't beat the real access point just for being closer.
        let best = { p: pCands[0], t: tCands[0], d: Infinity, matched: false }
        for (const p of pCands) {
          for (const t of tCands) {
            const matched = !!p.nameMatch && !!t.nameMatch
            const d = approxMi(p, t)
            const better = matched && !best.matched ? true : matched === best.matched && d < best.d
            if (better) best = { p, t, d, matched }
          }
        }

        setPutInCandidates(pCands)
        setTakeOutCandidates(tCands)
        setPutInLabel(best.p.label)
        setTakeOutLabel(best.t.label)
        patch({
          putInCoord: { lat: best.p.lat, lng: best.p.lng },
          takeOutCoord: { lat: best.t.lat, lng: best.t.lng },
          confirmed: false,
        })
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
      {putInCoord && putInCandidates.length > 1 && (
        <CandidatePicker
          label={putInLabel}
          candidates={putInCandidates}
          open={pickerOpen === 'putIn'}
          onToggle={() => setPickerOpen(pickerOpen === 'putIn' ? null : 'putIn')}
          onPick={c => pickCandidate('putIn', c)}
        />
      )}

      <Field label="Take-out Location" options={takeOutOptions} value={takeOut} onChange={v => setName('takeOut', v)}
        placeholder="e.g. Hecla Junction" />
      {takeOutCoord && takeOutCandidates.length > 1 && (
        <CandidatePicker
          label={takeOutLabel}
          candidates={takeOutCandidates}
          open={pickerOpen === 'takeOut'}
          onToggle={() => setPickerOpen(pickerOpen === 'takeOut' ? null : 'takeOut')}
          onPick={c => pickCandidate('takeOut', c)}
        />
      )}

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

function CandidatePicker({ label, candidates, open, onToggle, onPick }: {
  label: string
  candidates: Candidate[]
  open: boolean
  onToggle: () => void
  onPick: (c: Candidate) => void
}) {
  return (
    <div style={{ marginTop: -10 }}>
      <p style={{ fontSize: 12, color: '#64748b' }}>
        Matched: <span style={{ color: '#94a3b8' }}>{label}</span>{' '}
        <button type="button" onClick={onToggle}
          style={{ background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', fontSize: 12, padding: 0 }}>
          not this?
        </button>
      </p>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {candidates.map(c => (
            <button key={c.label} type="button" onClick={() => onPick(c)}
              style={{ textAlign: 'left', background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>
              {c.label}
            </button>
          ))}
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
