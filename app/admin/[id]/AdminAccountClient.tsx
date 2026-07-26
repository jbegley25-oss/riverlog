'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Download, Loader } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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

export default function AdminAccountClient({ profile, entries }: { profile: Profile; entries: LogEntry[] }) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [onlyNew, setOnlyNew] = useState(true)

  const newEntries = useMemo(() => entries.filter(e => !e.exported_at), [entries])
  const lastExportedAt = useMemo(
    () => entries.reduce<string | null>((latest, e) => (e.exported_at && (!latest || e.exported_at > latest) ? e.exported_at : latest), null),
    [entries]
  )

  const hasNew = newEntries.length > 0
  const selected = onlyNew && hasNew ? newEntries : entries

  async function generate() {
    if (!selected.length) return
    setGenerating(true)
    try {
      const { generateLogSheetPDF } = await import('@/lib/pdf/generatePDF')
      const blob = await generateLogSheetPDF(profile, selected)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const first = (profile.first_name || 'Unknown').trim().replace(/\s+/g, '_')
      const last = (profile.last_name || 'Unknown').trim().replace(/\s+/g, '_')
      a.download = `${first}_${last}_RiverLog2026.pdf`
      a.click()
      URL.revokeObjectURL(url)

      const supabase = createClient()
      await supabase.from('log_entries').update({ exported_at: new Date().toISOString() }).in('id', selected.map(e => e.id))
      router.refresh()
    } catch (e) {
      console.error(e)
      alert('PDF generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628' }}>
      <div style={{ background: 'rgba(13,31,60,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(34,211,238,0.1)', position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 60 }}>
          <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: 0 }}>
            <ArrowLeft size={18} /> Back
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {profile.first_name} {profile.last_name}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 120px' }}>
        <div className="glass" style={{ borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {lastExportedAt
              ? `Last exported ${format(new Date(lastExportedAt), 'MMM d, yyyy')}`
              : 'Never exported'}
            {' · '}
            {newEntries.length} new / {entries.length} total {entries.length === 1 ? 'trip' : 'trips'}
          </div>
        </div>

        {hasNew && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setOnlyNew(true)}
              style={{ flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: onlyNew ? 'rgba(34,211,238,0.15)' : 'rgba(13,31,60,0.4)',
                border: `1px solid ${onlyNew ? '#22d3ee' : 'rgba(34,211,238,0.15)'}`,
                color: onlyNew ? '#22d3ee' : '#94a3b8' }}>
              New Only ({newEntries.length})
            </button>
            <button onClick={() => setOnlyNew(false)}
              style={{ flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: !onlyNew ? 'rgba(34,211,238,0.15)' : 'rgba(13,31,60,0.4)',
                border: `1px solid ${!onlyNew ? '#22d3ee' : 'rgba(34,211,238,0.15)'}`,
                color: !onlyNew ? '#22d3ee' : '#94a3b8' }}>
              All Trips ({entries.length})
            </button>
          </div>
        )}

        {entries.length === 0 ? (
          <div className="glass" style={{ borderRadius: 14, padding: 32, textAlign: 'center' }}>
            <FileText size={32} color="#1a3a5c" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#475569', fontSize: 14 }}>No trips logged yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {selected.map(entry => (
              <div key={entry.id} style={{ background: 'rgba(13,31,60,0.4)', border: '1px solid rgba(34,211,238,0.1)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{entry.river}</span>
                  <span style={{ fontSize: 11, color: '#0891b2', background: 'rgba(8,145,178,0.12)', borderRadius: 4, padding: '1px 6px' }}>{ROLE_LABELS[entry.role]}</span>
                  {!entry.exported_at && (
                    <span style={{ fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.12)', borderRadius: 4, padding: '1px 6px' }}>New</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  {format(new Date(entry.date + 'T00:00:00'), 'MMM d, yyyy')} · {entry.hours}h · {entry.miles}mi · {BOAT_LABELS[entry.boat_type]}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px 32px', background: 'linear-gradient(to top, #0a1628 60%, transparent)', zIndex: 40 }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <button onClick={generate} disabled={generating} className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {generating ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={18} />}
              {generating ? 'Generating…' : `Generate PDF (${selected.length} ${selected.length === 1 ? 'trip' : 'trips'})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
