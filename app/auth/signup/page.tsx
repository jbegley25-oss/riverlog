'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'account' | 'profile'>('account')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [dob, setDob] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [rolLicense, setRolLicense] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: signupError } = await supabase.auth.signUp({ email, password })

    if (signupError || !data.user) {
      setError(signupError?.message ?? 'Signup failed')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName || null,
        date_of_birth: dob || null,
        company_name: companyName,
        rol_license: rolLicense,
      }, { onConflict: 'id' })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0d2040 50%, #0a1628 100%)' }}>

      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/icons/icon-192.png" alt="RiverLog" width={42} height={42} style={{ borderRadius: 12 }} />
            <span style={{ fontWeight: 800, fontSize: 20, color: '#fff' }}>RiverLog</span>
          </Link>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          <div className={`step-dot ${step === 'account' ? 'active' : 'done'}`} />
          <div className={`step-dot ${step === 'profile' ? 'active' : ''}`} />
        </div>

        <div className="glass" style={{ borderRadius: 20, padding: 32 }}>
          {step === 'account' ? (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Create account</h2>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>Step 1 of 2 — Account credentials</p>

              <form onSubmit={e => { e.preventDefault(); if (email && password.length >= 6) setStep('profile') }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" className="input-river" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} required minLength={6}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 6 characters" className="input-river" style={{ paddingRight: 48 }} />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#475569',
                    }}>
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>Continue</button>
              </form>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Your guide info</h2>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>Step 2 of 2 — This appears on your log sheets</p>

              <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>First Name *</label>
                    <input required value={firstName} onChange={e => setFirstName(e.target.value)} className="input-river" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Last Name *</label>
                    <input required value={lastName} onChange={e => setLastName(e.target.value)} className="input-river" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Middle Name</label>
                  <input value={middleName} onChange={e => setMiddleName(e.target.value)} className="input-river" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Date of Birth</label>
                  <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="input-river" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Company Name *</label>
                  <input required value={companyName} onChange={e => setCompanyName(e.target.value)}
                    placeholder="Your outfitter company" className="input-river" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>ROL License # *</label>
                  <input required value={rolLicense} onChange={e => setRolLicense(e.target.value)}
                    placeholder="e.g. ROL-12345" className="input-river" />
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button type="button" className="btn-ghost" onClick={() => setStep('account')} style={{ padding: '14px 16px' }}>
                    Back
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Creating…' : 'Create Account'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#475569' }}>
          Have an account?{' '}
          <Link href="/auth/login" style={{ color: '#22d3ee', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </main>
  )
}
