import Link from 'next/link'
import { Waves } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let name: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle()
    const full = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    if (full) name = full
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0d2040 50%, #0a1628 100%)' }}>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%',
            border: '1px solid rgba(34,211,238,0.06)',
            width: `${400 + i * 200}px`, height: `${400 + i * 200}px`,
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          }} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <div style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)', borderRadius: 20, padding: 18 }}>
            <Waves size={36} color="#0a1628" strokeWidth={2.5} />
          </div>
        </div>

        {name ? (
          <>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>
              Hello, {name}.
            </h1>
            <p style={{ color: '#64748b', fontSize: 15, marginBottom: 48, lineHeight: 1.6 }}>
              Ready to log your next trip?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link href="/dashboard" style={{
                display: 'block', textAlign: 'center', textDecoration: 'none',
                background: 'linear-gradient(135deg, #0891b2, #22d3ee)',
                color: '#0a1628', fontWeight: 700, padding: '15px 32px',
                borderRadius: 12, fontSize: 16,
              }}>
                Go to Dashboard
              </Link>
              <Link href="/log" style={{
                display: 'block', textAlign: 'center', textDecoration: 'none',
                background: 'transparent', color: '#94a3b8',
                border: '1px solid rgba(148,163,184,0.2)',
                fontWeight: 600, padding: '15px 32px', borderRadius: 12, fontSize: 16,
              }}>
                Log a Trip
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>
              RiverLog
            </h1>
            <p style={{ color: '#64748b', fontSize: 15, marginBottom: 48, lineHeight: 1.6 }}>
              Colorado on-river hour tracking for guides, trip leaders, and outfitters
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link href="/auth/login" style={{
                display: 'block', textAlign: 'center', textDecoration: 'none',
                background: 'linear-gradient(135deg, #0891b2, #22d3ee)',
                color: '#0a1628', fontWeight: 700, padding: '15px 32px',
                borderRadius: 12, fontSize: 16,
              }}>
                Sign In
              </Link>
              <Link href="/auth/signup" style={{
                display: 'block', textAlign: 'center', textDecoration: 'none',
                background: 'transparent', color: '#94a3b8',
                border: '1px solid rgba(148,163,184,0.2)',
                fontWeight: 600, padding: '15px 32px', borderRadius: 12, fontSize: 16,
              }}>
                Create Account
              </Link>
            </div>
          </>
        )}

        <p style={{ color: '#334155', fontSize: 12, marginTop: 48, lineHeight: 1.6 }}>
          Colorado Division of Parks & Wildlife<br />
          River Outfitter Licensing Program
        </p>
      </div>
    </main>
  )
}
