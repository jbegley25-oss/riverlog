'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Partial<Profile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (data) setProfile(data)
      setLoading(false)
    })
  }, [router])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').update({
      first_name: profile.first_name,
      last_name: profile.last_name,
      middle_name: profile.middle_name || null,
      date_of_birth: profile.date_of_birth || null,
      company_name: profile.company_name,
      rol_license: profile.rol_license,
    }).eq('id', user.id)

    if (error) setError(error.message)
    else { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    setSaving(false)
  }

  function set(key: keyof Profile, val: string) {
    setProfile(p => ({ ...p, [key]: val }))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#475569' }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628' }}>
      <div style={{ background: 'rgba(13,31,60,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(34,211,238,0.1)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 60 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: 0 }}>
            <ArrowLeft size={18} /> Back
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>Profile Settings</span>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 20px 80px' }}>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>First Name</label>
              <input value={profile.first_name ?? ''} onChange={e => set('first_name', e.target.value)} className="input-river" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Last Name</label>
              <input value={profile.last_name ?? ''} onChange={e => set('last_name', e.target.value)} className="input-river" required />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Middle Name</label>
            <input value={profile.middle_name ?? ''} onChange={e => set('middle_name', e.target.value)} className="input-river" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Date of Birth</label>
            <input type="date" value={profile.date_of_birth ?? ''} onChange={e => set('date_of_birth', e.target.value)} className="input-river" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Company Name</label>
            <input value={profile.company_name ?? ''} onChange={e => set('company_name', e.target.value)} className="input-river" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>ROL License #</label>
            <input value={profile.rol_license ?? ''} onChange={e => set('rol_license', e.target.value)} className="input-river" required placeholder="e.g. ROL-12345" />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={saving}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saved ? '✓ Saved!' : saving ? 'Saving…' : <><Save size={16} /> Save Changes</>}
          </button>
        </form>
      </div>
    </div>
  )
}
