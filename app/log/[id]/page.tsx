'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LogEntry } from '@/lib/types'
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

export default function EntryPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [entry, setEntry] = useState<LogEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('log_entries').select('*').eq('id', id).single().then(({ data }) => {
      setEntry(data)
      setLoading(false)
    })
  }, [id])

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('log_entries').delete().eq('id', id)
    router.push('/dashboard')
    router.refresh()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#475569' }}>Loading…</div>
    </div>
  )
  if (!entry) return null

  const fields = [
    ['Date', format(new Date(entry.date + 'T00:00:00'), 'MMMM d, yyyy')],
    ['River', entry.river],
    ['Put-in', entry.put_in],
    ['Take-out', entry.take_out],
    ['Boat Type', BOAT_LABELS[entry.boat_type]],
    ['Role', ROLE_LABELS[entry.role]],
    ['Hours on River', `${entry.hours} hours`],
    ['River Miles', `${entry.miles} miles`],
    ['Company', entry.company_name],
    ['ROL License', entry.rol_license],
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628' }}>
      <div style={{ background: 'rgba(13,31,60,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(34,211,238,0.1)', position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 60 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: 0 }}>
            <ArrowLeft size={18} /> Back
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>Trip Details</span>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 80px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{entry.river}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0891b2', background: 'rgba(8,145,178,0.15)', borderRadius: 4, padding: '3px 8px' }}>
              {ROLE_LABELS[entry.role]}
            </span>
            <span style={{ fontSize: 12, color: '#475569', background: 'rgba(71,85,105,0.2)', borderRadius: 4, padding: '3px 8px' }}>
              {BOAT_LABELS[entry.boat_type]}
            </span>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
          {fields.map(([label, value], i) => (
            <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: i < fields.length - 1 ? '1px solid rgba(34,211,238,0.08)' : 'none' }}>
              <span style={{ fontSize: 13, color: '#475569' }}>{String(label)}</span>
              <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>{String(value)}</span>
            </div>
          ))}
        </div>

        <button onClick={handleDelete} disabled={deleting}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: confirmDelete ? 'rgba(239,68,68,0.15)' : 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
          <Trash2 size={16} />
          {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm delete' : 'Delete Entry'}
        </button>
      </div>
    </div>
  )
}
