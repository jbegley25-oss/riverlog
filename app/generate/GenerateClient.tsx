'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Download, Loader } from 'lucide-react'
import { LogEntry, Profile } from '@/lib/types'
import { format } from 'date-fns'

const ROLE_LABELS: Record<string, string> = {
  guide: 'Guide',
  trip_leader: 'Trip Leader',
  guide_instructor: 'Guide Instructor',
  private: 'Private',
}
const BOAT_LABELS: Record<string, string> = {
  paddle: 'Paddle',
  oar: 'Oar',
  combined: 'Combined',
}

export default function GenerateClient({ profile, entries }: { profile: Profile; entries: LogEntry[] }) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(entries.map(e => e.id)))

  const selected = entries.filter(e => selectedIds.has(e.id))

  function toggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() { setSelectedIds(new Set(entries.map(e => e.id))) }
  function selectNone() { setSelectedIds(new Set()) }

  async function generate() {
    setGenerating(true)
    try {
      const { generateLogSheetPDF } = await import('@/lib/pdf/generatePDF')
      const blob = await generateLogSheetPDF(profile, selected)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `riverlog-${profile.last_name}-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('PDF generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Totals for selected
  const totals = selected.reduce((acc, e) => {
    if (e.role === 'guide') { acc.guide_h += e.hours; acc.guide_mi += e.miles }
    else if (e.role === 'trip_leader') { acc.tl_h += e.hours; acc.tl_mi += e.miles }
    else if (e.role === 'guide_instructor') { acc.gi_h += e.hours; acc.gi_mi += e.miles }
    else { acc.priv_h += e.hours; acc.priv_mi += e.miles }
    return acc
  }, { guide_h: 0, guide_mi: 0, tl_h: 0, tl_mi: 0, gi_h: 0, gi_mi: 0, priv_h: 0, priv_mi: 0 })

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628' }}>
      {/* Header */}
      <div style={{ background: 'rgba(13,31,60,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(34,211,238,0.1)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 60 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: 0 }}>
            <ArrowLeft size={18} /> Back
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>Generate Log Sheet</span>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 120px' }}>
        {/* Totals preview */}
        <div className="glass" style={{ borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Totals for Selected ({selected.length} trips)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Guide', totals.guide_h, totals.guide_mi],
              ['Trip Leader', totals.tl_h, totals.tl_mi],
              ['Guide Instructor', totals.gi_h, totals.gi_mi],
              ['Private', totals.priv_h, totals.priv_mi],
            ].filter(([, h]) => (h as number) > 0).map(([label, h, mi]) => (
              <div key={String(label)} style={{ fontSize: 13 }}>
                <span style={{ color: '#475569' }}>{String(label)}: </span>
                <span style={{ color: '#22d3ee', fontWeight: 600 }}>{(h as number).toFixed(1)}h / {(mi as number).toFixed(1)}mi</span>
              </div>
            ))}
          </div>
        </div>

        {/* Select controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Select Entries</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={selectAll} style={{ fontSize: 12, color: '#22d3ee', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>All</button>
            <span style={{ color: '#334155' }}>·</span>
            <button onClick={selectNone} style={{ fontSize: 12, color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>None</button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="glass" style={{ borderRadius: 14, padding: 32, textAlign: 'center' }}>
            <FileText size={32} color="#1a3a5c" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#475569', fontSize: 14 }}>No trips logged yet. Add some trips first.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {entries.map(entry => {
              const checked = selectedIds.has(entry.id)
              return (
                <button key={entry.id} onClick={() => toggle(entry.id)} style={{ textAlign: 'left', background: checked ? 'rgba(34,211,238,0.08)' : 'rgba(13,31,60,0.4)', border: `1px solid ${checked ? 'rgba(34,211,238,0.3)' : 'rgba(34,211,238,0.1)'}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? '#22d3ee' : '#334155'}`, background: checked ? '#22d3ee' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {checked && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="#0a1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{entry.river}</span>
                      <span style={{ fontSize: 11, color: '#0891b2', background: 'rgba(8,145,178,0.12)', borderRadius: 4, padding: '1px 6px' }}>{ROLE_LABELS[entry.role]}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                      {format(new Date(entry.date + 'T00:00:00'), 'MMM d, yyyy')} · {entry.hours}h · {entry.miles}mi · {BOAT_LABELS[entry.boat_type]}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {entries.length > 0 && selected.length > 0 && (
          <div style={{ fontSize: 12, color: '#334155', marginBottom: 16, textAlign: 'center' }}>
            Will generate {Math.ceil(selected.length / 9)} page{Math.ceil(selected.length / 9) > 1 ? 's' : ''} · 9 entries per sheet
          </div>
        )}
      </div>

      {/* Generate button */}
      {selected.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px 32px', background: 'linear-gradient(to top, #0a1628 60%, transparent)', zIndex: 40 }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <button onClick={generate} disabled={generating} className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {generating ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={18} />}
              {generating ? 'Generating PDF…' : `Download Log Sheet (${selected.length} entries)`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
