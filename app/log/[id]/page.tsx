'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2, Camera, X, ImageIcon } from 'lucide-react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [entry, setEntry] = useState<LogEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      const [{ data: entryData }, { data: photoData }] = await Promise.all([
        supabase.from('log_entries').select('*').eq('id', id).single(),
        supabase.storage.from('trip-photos').list(`${user.id}/${id}`, { sortBy: { column: 'created_at', order: 'asc' } }),
      ])

      setEntry(entryData)
      if (photoData) {
        const urls = await Promise.all(
          photoData.map(async (f) => {
            const { data } = await supabase.storage
              .from('trip-photos')
              .createSignedUrl(`${user.id}/${id}/${f.name}`, 3600)
            return data?.signedUrl ?? null
          })
        )
        setPhotos(urls.filter(Boolean) as string[])
      }
      setLoading(false)
    })
  }, [id])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !userId) return
    setUploading(true)
    const supabase = createClient()

    const newUrls: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('trip-photos').upload(path, file, { contentType: file.type })
      if (!error) {
        const { data } = await supabase.storage.from('trip-photos').createSignedUrl(path, 3600)
        if (data?.signedUrl) newUrls.push(data.signedUrl)
      }
    }
    setPhotos(prev => [...prev, ...newUrls])
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const supabase = createClient()
    if (userId) {
      const { data: photoFiles } = await supabase.storage.from('trip-photos').list(`${userId}/${id}`)
      if (photoFiles?.length) {
        await supabase.storage.from('trip-photos').remove(photoFiles.map(f => `${userId}/${id}/${f.name}`))
      }
    }
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
      {/* Header */}
      <div style={{ background: 'rgba(13,31,60,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(34,211,238,0.1)', position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 60 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: 0 }}>
            <ArrowLeft size={18} /> Back
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>Trip Details</span>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{entry.river}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0891b2', background: 'rgba(8,145,178,0.15)', borderRadius: 4, padding: '3px 8px' }}>
              {ROLE_LABELS[entry.role]}
            </span>
            <span style={{ fontSize: 12, color: '#475569', background: 'rgba(71,85,105,0.2)', borderRadius: 4, padding: '3px 8px' }}>
              {BOAT_LABELS[entry.boat_type]}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="glass" style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
          {fields.map(([label, value], i) => (
            <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: i < fields.length - 1 ? '1px solid rgba(34,211,238,0.08)' : 'none' }}>
              <span style={{ fontSize: 13, color: '#475569' }}>{String(label)}</span>
              <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>{String(value)}</span>
            </div>
          ))}
        </div>

        {/* Notes */}
        {entry.notes && (
          <div className="glass" style={{ borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Trip Notes</div>
            <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{entry.notes}</p>
          </div>
        )}

        {/* Photos */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Photos {photos.length > 0 && `(${photos.length})`}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#22d3ee', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
            >
              <Camera size={14} />
              {uploading ? 'Uploading…' : 'Add Photos'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
          </div>

          {photos.length === 0 ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', border: '1px dashed rgba(34,211,238,0.2)', borderRadius: 14, padding: '32px 20px', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#334155' }}
            >
              <ImageIcon size={28} color="#1a3a5c" />
              <span style={{ fontSize: 13 }}>Tap to add photos from this trip</span>
            </button>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {photos.map((url, i) => (
                <button key={i} onClick={() => setLightbox(url)} style={{ padding: 0, border: 'none', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1', background: '#0d1f3c' }}>
                  <img src={url} alt={`Trip photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ aspectRatio: '1', border: '1px dashed rgba(34,211,238,0.2)', borderRadius: 10, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}
              >
                <Camera size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Delete */}
        <button onClick={handleDelete} disabled={deleting}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: confirmDelete ? 'rgba(239,68,68,0.15)' : 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
          <Trash2 size={16} />
          {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm delete' : 'Delete Entry'}
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={20} />
          </button>
          <img src={lightbox} alt="Trip photo" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </div>
  )
}
