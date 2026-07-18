'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Waves } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    // Implicit flow: the reset link delivers session tokens directly (as a URL
    // hash fragment), so it works even if opened in a different browser/device
    // than where it was requested — no server-side code exchange needed.
    const supabase = createClient({ flowType: 'implicit' })
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0d2040 50%, #0a1628 100%)' }}>

      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)', borderRadius: 12, padding: 10 }}>
              <Waves size={22} color="#0a1628" strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 20, color: '#fff' }}>RiverLog</span>
          </Link>
        </div>

        <div className="glass" style={{ borderRadius: 20, padding: 32 }}>
          {sent ? (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Check your email</h2>
              <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                If an account exists for <strong style={{ color: '#e2e8f0' }}>{email}</strong>, we&apos;ve sent a
                link to reset your password. Open it on this device to set a new password.
              </p>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Reset password</h2>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>
                Enter your email and we&apos;ll send you a reset link
              </p>

              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-river"
                  />
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>
                    {error}
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#475569' }}>
          Remembered it?{' '}
          <Link href="/auth/login" style={{ color: '#22d3ee', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
