'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2, Camera, X, ImageIcon, Pencil, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LogEntry, BoatType, GuideRole } from '@/lib/types'
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

type EditForm = {
  date: string
  river: string
  put_in: string
  take_out: string
  boat_type: BoatType
  role: GuideRole
  hours: number
  miles: number
  notes: string
  company_name: string
  rol_license: string
  cfs: string
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(34,211,238,0.2)',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 14,
  fontWeight: 600,
  padding: '9px 12px',
  outline: 'none',
  boxSizing: 'border-box',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
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
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)

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

  function startEdit() {
    if (!entry) return
    setEditForm({
      date: entry.date,
      river: entry.river,
      put_in: entry.put_in,
      take_out: entry.take_out,
      boat_type: entry.boat_type,
      role: entry.role,
      hours: entry.hours,
      miles: entry.miles,
      notes: entry.notes ?? '',
      company_name: entry.company_name,
      rol_license: entry.rol_license,
      cfs: entry.cfs != null ? String(entry.cfs) : '',
    })
    setEditing(true)
    setConfirmDelete(false)
  }

  function cancelEdit() {
    setEditing(false)
    setEditForm(null)
  }

  function setField<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setEditForm(prev => prev ? { ...prev, [key]: value } : prev)
  }

  async function handleUpdate() {
    if (!editForm) return
    setSaving(true)
    const supabase = createClient()
    const isPrivate = editForm.role === 'private'
    const updates = {
      date: editForm.date,
      river: editForm.river,
      put_in: editForm.put_in,
      take_out: editForm.take_out,
      boat_type: editForm.boat_type,
      role: editForm.role,
      hours: Number(editForm.hours),
      miles: Number(editForm.miles),
      notes: editForm.notes.trim() || null,
      company_name: isPrivate ? 'PRIVATE' : editForm.company_name,
      rol_license: isPrivate ? '' : editForm.rol_license,
      cfs: editForm.cfs.trim() ? parseFloat(editForm.cfs) : null,
    }
    const { error } = await supabase.from('log_entries').update(updates).eq('id', id)
    if (!error) {
      setEntry(prev => prev ? { ...prev, ...updates } : prev)
      setEditing(false)
      setEditForm(null)
    }
    setSaving(false)
  }

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

  const isPrivate = entry.role === 'private'
  const fields = [
    ['Date', format(new Date(entry.date + 'T00:00:00'), 'MMMM d, yyyy')],
    ['Trip Type', isPrivate ? 'Private' : 'Commercial'],
    ['River', entry.river],
    ...(entry.cfs != null ? [['River Flow', `${entry.cfs} cfs`]] : []),
    ['Put-in', entry.put_in],
    ['Take-out', entry.take_out],
    ['Boat Type', BOAT_LABELS[entry.boat_type]],
    ...(!isPrivate ? [['Role', ROLE_LABELS[entry.role]]] : []),
    ['Hours on River', `${entry.hours} hours`],
    ['River Miles', `${entry.miles} miles`],
    ...(!isPrivate ? [['Company', entry.company_name], ['ROL License', entry.rol_license]] : []),
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628' }}>
      {/* Header */}
      <div style={{ background: 'rgba(13,31,60,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(34,211,238,0.1)', position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 60 }}>
          <button
            onClick={editing ? cancelEdit : () => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: 0 }}
          >
            <ArrowLeft size={18} /> {editing ? 'Cancel' : 'Back'}
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {editing ? 'Edit Trip' : 'Trip Details'}
          </span>
          {!editing ? (
            <button
              onClick={startEdit}
              style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8, color: '#22d3ee', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, padding: '6px 12px' }}
            >
              <Pencil size={13} /> Edit
            </button>
          ) : (
            <button
              onClick={handleUpdate}
              disabled={saving}
              style={{ background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 8, color: '#22d3ee', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, padding: '6px 12px' }}
            >
              <Check size={13} /> {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 80px' }}>

        {editing && editForm ? (
          /* ── Edit Form ── */
          <div className="glass" style={{ borderRadius: 14, padding: '20px 18px', marginBottom: 20 }}>
            <Field label="Date">
              <input type="date" style={inputStyle} value={editForm.date} onChange={e => setField('date', e.target.value)} />
            </Field>

            <Field label="Trip Type">
              <select
                style={{ ...inputStyle, appearance: 'none' }}
                value={editForm.role === 'private' ? 'private' : 'commercial'}
                onChange={e => {
                  if (e.target.value === 'private') {
                    setEditForm(prev => prev ? { ...prev, role: 'private', company_name: 'PRIVATE', rol_license: '' } : prev)
                  } else {
                    setEditForm(prev => prev ? { ...prev, role: 'guide', company_name: 'Sage Outdoor Adventures', rol_license: '653' } : prev)
                  }
                }}
              >
                <option value="commercial">Commercial</option>
                <option value="private">Private</option>
              </select>
            </Field>

            {editForm.role !== 'private' && (
              <Field label="Role">
                <select style={{ ...inputStyle, appearance: 'none' }} value={editForm.role} onChange={e => setField('role', e.target.value as GuideRole)}>
                  <option value="guide">Guide</option>
                  <option value="trip_leader">Trip Leader</option>
                  <option value="guide_instructor">Guide Instructor</option>
                </select>
              </Field>
            )}

            <Field label="River">
              <input type="text" style={inputStyle} value={editForm.river} onChange={e => setField('river', e.target.value)} placeholder="River name" />
            </Field>

            <Field label="River Flow (CFS)">
              <input type="number" style={inputStyle} value={editForm.cfs} onChange={e => setField('cfs', e.target.value)} placeholder="Optional" />
            </Field>

            <Field label="Put-in">
              <input type="text" style={inputStyle} value={editForm.put_in} onChange={e => setField('put_in', e.target.value)} placeholder="Put-in location" />
            </Field>

            <Field label="Take-out">
              <input type="text" style={inputStyle} value={editForm.take_out} onChange={e => setField('take_out', e.target.value)} placeholder="Take-out location" />
            </Field>

            <Field label="Boat Type">
              <select style={{ ...inputStyle, appearance: 'none' }} value={editForm.boat_type} onChange={e => setField('boat_type', e.target.value as BoatType)}>
                <option value="paddle">Paddle</option>
                <option value="oar">Oar</option>
                <option value="combined">Combined</option>
              </select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Hours</div>
                <input type="number" min="0" step="0.25" style={inputStyle} value={editForm.hours} onChange={e => setField('hours', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Miles</div>
                <input type="number" min="0" step="0.1" style={inputStyle} value={editForm.miles} onChange={e => setField('miles', parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            {editForm.role !== 'private' && (
              <>
                <Field label="Company">
                  <input type="text" style={inputStyle} value={editForm.company_name} onChange={e => setField('company_name', e.target.value)} />
                </Field>
                <Field label="ROL License #">
                  <input type="text" style={inputStyle} value={editForm.rol_license} onChange={e => setField('rol_license', e.target.value)} />
                </Field>
              </>
            )}

            <Field label="Notes">
              <textarea
                style={{ ...inputStyle, minHeight: 90, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                value={editForm.notes}
                onChange={e => setField('notes', e.target.value)}
                placeholder="Trip notes…"
              />
            </Field>

            <button
              onClick={handleUpdate}
              disabled={saving}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0891b2, #22d3ee)', color: '#0a1628', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4 }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        ) : (
          /* ── Read View ── */
          <>
            {/* Title */}
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{entry.river}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isPrivate ? '#94a3b8' : '#22d3ee', background: isPrivate ? 'rgba(148,163,184,0.12)' : 'rgba(34,211,238,0.12)', borderRadius: 4, padding: '3px 8px' }}>
                  {isPrivate ? 'Private' : 'Commercial'}
                </span>
                {!isPrivate && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0891b2', background: 'rgba(8,145,178,0.15)', borderRadius: 4, padding: '3px 8px' }}>
                    {ROLE_LABELS[entry.role]}
                  </span>
                )}
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
          </>
        )}

        {/* Photos — always visible */}
        {!editing && (
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
        )}

        {/* Delete — always visible */}
        {!editing && (
          <button onClick={handleDelete} disabled={deleting}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: confirmDelete ? 'rgba(239,68,68,0.15)' : 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
            <Trash2 size={16} />
            {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm delete' : 'Delete Entry'}
          </button>
        )}
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
