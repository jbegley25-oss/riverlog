'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Camera, ImageIcon, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BoatType, GuideRole } from '@/lib/types'

type Step = 'date' | 'river' | 'location' | 'boat' | 'role' | 'hours' | 'miles' | 'notes' | 'company' | 'review'
const STEPS: Step[] = ['date', 'river', 'location', 'boat', 'role', 'hours', 'miles', 'notes', 'company', 'review']

const STEP_LABELS: Record<Step, string> = {
  date: 'Date',
  river: 'River',
  location: 'Put-in & Take-out',
  boat: 'Boat Type',
  role: 'Your Role',
  hours: 'Hours on River',
  miles: 'Miles on River',
  notes: 'Notes & Photos',
  company: 'Company & License',
  review: 'Review & Save',
}

const COLORADO_RIVERS = [
  'Arkansas River', 'Colorado River', 'Clear Creek', 'Cache la Poudre',
  'Animas River', 'Dolores River', 'Gunnison River', 'Blue River',
  'Eagle River', 'Roaring Fork', 'Taylor River', 'Yampa River',
  'North Platte', 'Rio Grande', 'South Platte', 'Green River',
]

const ROLE_LABELS: Record<GuideRole, string> = {
  guide: 'Guide',
  trip_leader: 'Trip Leader',
  guide_instructor: 'Guide Instructor',
  private: 'Private',
}
const BOAT_LABELS: Record<BoatType, string> = {
  paddle: 'Paddle',
  oar: 'Oar',
  combined: 'Combined',
}

export default function LogPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Pre-generate entry ID so photos can upload before save
  const [entryId] = useState(() => crypto.randomUUID())
  const [userId, setUserId] = useState<string | null>(null)
  const [photos, setPhotos] = useState<{ path: string; url: string }[]>([])
  const [uploading, setUploading] = useState(false)

  // Form state
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [river, setRiver] = useState('')
  const [riverSearch, setRiverSearch] = useState('')
  const [putIn, setPutIn] = useState('')
  const [takeOut, setTakeOut] = useState('')
  const [boatType, setBoatType] = useState<BoatType | ''>('')
  const [role, setRole] = useState<GuideRole | ''>('')
  const [hours, setHours] = useState('')
  const [miles, setMiles] = useState('')
  const [notes, setNotes] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [rolLicense, setRolLicense] = useState('')

  // Prefill company/license from profile + grab userId
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('company_name, rol_license').eq('id', user.id).single()
      if (data) {
        setCompanyName(data.company_name ?? '')
        setRolLicense(data.rol_license ?? '')
      }
    })
  }, [])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !userId) return
    setUploading(true)
    const supabase = createClient()
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${entryId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('trip-photos').upload(path, file, { contentType: file.type })
      if (!error) {
        const { data } = await supabase.storage.from('trip-photos').createSignedUrl(path, 3600)
        if (data?.signedUrl) setPhotos(prev => [...prev, { path, url: data.signedUrl }])
      }
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function removePhoto(path: string) {
    const supabase = createClient()
    await supabase.storage.from('trip-photos').remove([path])
    setPhotos(prev => prev.filter(p => p.path !== path))
  }

  const filteredRivers = COLORADO_RIVERS.filter(r => r.toLowerCase().includes(riverSearch.toLowerCase()))

  function canAdvance() {
    switch (step) {
      case 'date': return !!date
      case 'river': return !!river
      case 'location': return !!putIn && !!takeOut
      case 'boat': return !!boatType
      case 'role': return !!role
      case 'hours': return !!hours && parseFloat(hours) > 0
      case 'miles': return !!miles && parseFloat(miles) >= 0
      case 'notes': return true  // optional
      case 'company': return !!companyName && !!rolLicense
      default: return true
    }
  }

  function next() { if (stepIndex < STEPS.length - 1) setStepIndex(i => i + 1) }
  function back() { if (stepIndex > 0) setStepIndex(i => i - 1) }

  async function handleSave() {
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { error } = await supabase.from('log_entries').insert({
      id: entryId,
      user_id: user.id,
      date,
      river,
      put_in: putIn,
      take_out: takeOut,
      boat_type: boatType,
      role,
      hours: parseFloat(hours),
      miles: parseFloat(miles),
      company_name: companyName,
      rol_license: rolLicense,
      notes: notes.trim() || null,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'rgba(13,31,60,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(34,211,238,0.1)', position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 60 }}>
          <button onClick={() => stepIndex === 0 ? router.push('/dashboard') : back()} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: 0 }}>
            <ArrowLeft size={18} /> Back
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>
            Log a Trip
          </span>
          <span style={{ fontSize: 13, color: '#475569' }}>{stepIndex + 1}/{STEPS.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#0d1f3c' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, #0891b2, #22d3ee)', width: `${((stepIndex + 1) / STEPS.length) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingTop: 20, paddingBottom: 4 }}>
        {STEPS.map((s, i) => (
          <div key={s} className={`step-dot ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`} />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 480, width: '100%', margin: '0 auto', padding: '24px 20px 120px' }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{STEP_LABELS[step]}</h2>

        {step === 'date' && (
          <div style={{ marginTop: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>Trip Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-river"
              style={{ fontSize: 18, padding: '16px' }} max={today} />
          </div>
        )}

        {step === 'river' && (
          <div style={{ marginTop: 28 }}>
            <input
              value={riverSearch || river}
              onChange={e => { setRiverSearch(e.target.value); setRiver(e.target.value) }}
              placeholder="Search or type river name…"
              className="input-river"
              style={{ marginBottom: 14 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredRivers.map(r => (
                <button key={r} onClick={() => { setRiver(r); setRiverSearch('') }}
                  style={{ textAlign: 'left', background: river === r ? 'rgba(34,211,238,0.15)' : 'rgba(10,22,40,0.6)', border: `1px solid ${river === r ? '#22d3ee' : 'rgba(34,211,238,0.15)'}`, borderRadius: 10, padding: '12px 16px', color: river === r ? '#22d3ee' : '#94a3b8', cursor: 'pointer', fontSize: 15, fontWeight: river === r ? 600 : 400 }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'location' && (
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>Put-in Location</label>
              <input value={putIn} onChange={e => setPutIn(e.target.value)}
                placeholder="e.g. Browns Canyon, Nathrop" className="input-river" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>Take-out Location</label>
              <input value={takeOut} onChange={e => setTakeOut(e.target.value)}
                placeholder="e.g. Hecla Junction" className="input-river" />
            </div>
          </div>
        )}

        {step === 'boat' && (
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>Select the type of watercraft used</p>
            {(['paddle', 'oar', 'combined'] as BoatType[]).map(b => (
              <button key={b} onClick={() => setBoatType(b)}
                className={`pill-option ${boatType === b ? 'selected' : ''}`}
                style={{ borderRadius: 12, padding: '16px 20px', textAlign: 'left', fontSize: 16 }}>
                <div style={{ fontWeight: 600 }}>{BOAT_LABELS[b]}</div>
                <div style={{ fontSize: 12, color: boatType === b ? '#0891b2' : '#334155', marginTop: 2 }}>
                  {b === 'paddle' ? 'Kayak, canoe, or raft with paddle propulsion' : b === 'oar' ? 'Raft or dory with oar propulsion' : 'Mixed paddle and oar craft'}
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 'role' && (
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>Your role on this trip</p>
            {(['guide', 'trip_leader', 'guide_instructor', 'private'] as GuideRole[]).map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`pill-option ${role === r ? 'selected' : ''}`}
                style={{ borderRadius: 12, padding: '16px 20px', textAlign: 'left', fontSize: 16 }}>
                <div style={{ fontWeight: 600 }}>{ROLE_LABELS[r]}</div>
                <div style={{ fontSize: 12, color: role === r ? '#0891b2' : '#334155', marginTop: 2 }}>
                  {r === 'guide' ? 'Leading clients on the river' : r === 'trip_leader' ? 'Leading the overall trip' : r === 'guide_instructor' ? 'Training and instructing other guides' : 'Private non-commercial run'}
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 'hours' && (
          <div style={{ marginTop: 28 }}>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>Total time spent on the water</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input type="number" value={hours} onChange={e => setHours(e.target.value)}
                placeholder="0.0" min="0.5" step="0.5" className="input-river"
                style={{ fontSize: 32, fontWeight: 700, textAlign: 'center', padding: '20px' }} />
              <span style={{ fontSize: 24, color: '#475569', fontWeight: 600 }}>hrs</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                <button key={h} onClick={() => setHours(String(h))}
                  style={{ flex: '1 0 calc(25% - 6px)', minWidth: 0, padding: '12px 8px', borderRadius: 10, background: hours === String(h) ? 'rgba(34,211,238,0.15)' : 'rgba(10,22,40,0.6)', border: `1px solid ${hours === String(h) ? '#22d3ee' : 'rgba(34,211,238,0.15)'}`, color: hours === String(h) ? '#22d3ee' : '#64748b', cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'miles' && (
          <div style={{ marginTop: 28 }}>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>Distance traveled on the river</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input type="number" value={miles} onChange={e => setMiles(e.target.value)}
                placeholder="0.0" min="0" step="0.5" className="input-river"
                style={{ fontSize: 32, fontWeight: 700, textAlign: 'center', padding: '20px' }} />
              <span style={{ fontSize: 24, color: '#475569', fontWeight: 600 }}>mi</span>
            </div>
          </div>
        )}

        {step === 'notes' && (
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                Trip Notes <span style={{ color: '#334155', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Conditions, highlights, client details…"
                rows={5}
                className="input-river"
                style={{ resize: 'none', lineHeight: 1.6 }}
              />
            </div>

            {/* Photos */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
                  Photos <span style={{ color: '#334155', fontWeight: 400 }}>(optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#22d3ee', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
                >
                  <Camera size={13} />
                  {uploading ? 'Uploading…' : 'Add'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </div>

              {photos.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ width: '100%', border: '1px dashed rgba(34,211,238,0.2)', borderRadius: 12, padding: '24px 20px', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#334155' }}
                >
                  <ImageIcon size={24} color="#1a3a5c" />
                  <span style={{ fontSize: 13 }}>Tap to add photos</span>
                </button>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {photos.map((p, i) => (
                    <div key={p.path} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden' }}>
                      <img src={p.url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <button
                        type="button"
                        onClick={() => removePhoto(p.path)}
                        style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ aspectRatio: '1', border: '1px dashed rgba(34,211,238,0.2)', borderRadius: 10, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}
                  >
                    <Camera size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'company' && (
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>Company Name</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                placeholder="Your outfitter company" className="input-river" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>ROL License #</label>
              <input value={rolLicense} onChange={e => setRolLicense(e.target.value)}
                placeholder="e.g. ROL-12345" className="input-river" />
            </div>
            <p style={{ fontSize: 12, color: '#334155' }}>These are pre-filled from your profile. Edit if needed for this trip.</p>
          </div>
        )}

        {step === 'review' && (
          <div style={{ marginTop: 20 }}>
            <div className="glass" style={{ borderRadius: 14, overflow: 'hidden' }}>
              {[
                ['Date', date],
                ['River', river],
                ['Put-in', putIn],
                ['Take-out', takeOut],
                ['Boat Type', BOAT_LABELS[boatType as BoatType]],
                ['Role', ROLE_LABELS[role as GuideRole]],
                ['Hours', `${hours} hours`],
                ['Miles', `${miles} miles`],
                ['Company', companyName],
                ['ROL License', rolLicense],
                ...(notes.trim() ? [['Notes', notes.trim()]] : []),
                ...(photos.length ? [['Photos', `${photos.length} photo${photos.length > 1 ? 's' : ''}`]] : []),
              ].map(([label, value], i, arr) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 18px', borderBottom: i < arr.length - 1 ? '1px solid rgba(34,211,238,0.08)' : 'none' }}>
                  <span style={{ fontSize: 13, color: '#475569' }}>{String(label)}</span>
                  <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{String(value)}</span>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginTop: 16 }}>
                {error}
              </div>
            )}

            <button onClick={handleSave} className="btn-primary" disabled={saving}
              style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Check size={20} />
              {saving ? 'Saving…' : 'Save Trip'}
            </button>
          </div>
        )}
      </div>

      {/* Next button (non-review steps) */}
      {step !== 'review' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px 32px', background: 'linear-gradient(to top, #0a1628 60%, transparent)', zIndex: 40 }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <button onClick={next} disabled={!canAdvance()} className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Continue <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
