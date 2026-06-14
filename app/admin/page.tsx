import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogEntry, Profile } from '@/lib/types'
import { format } from 'date-fns'
import AdminDownload from './AdminDownload'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Check admin
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/dashboard')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, log_entries(*)')
    .order('last_name')

  const allEntries: (LogEntry & { profiles: Profile })[] = (profiles ?? []).flatMap((p: Profile & { log_entries: LogEntry[] }) =>
    (p.log_entries ?? []).map(e => ({ ...e, profiles: p }))
  )

  const totals = allEntries.reduce((acc, e) => ({
    hours: acc.hours + e.hours,
    miles: acc.miles + e.miles,
    trips: acc.trips + 1,
  }), { hours: 0, miles: 0, trips: 0 })

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628' }}>
      <div style={{ background: 'rgba(13,31,60,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(34,211,238,0.1)', position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <Link href="/dashboard" style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Dashboard
          </Link>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Admin — All Guides</span>
          <AdminDownload profiles={(profiles ?? []) as (Profile & { log_entries: LogEntry[] })[]} />
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Org totals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
          {[
            ['Total Trips', totals.trips],
            ['Total Hours', totals.hours.toFixed(1)],
            ['Total Miles', totals.miles.toFixed(1)],
          ].map(([label, val]) => (
            <div key={String(label)} className="glass" style={{ borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{String(label)}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#22d3ee' }}>{String(val)}</div>
            </div>
          ))}
        </div>

        {/* Per-guide breakdown */}
        {(profiles ?? []).map((p: Profile & { log_entries: LogEntry[] }) => {
          const entries = p.log_entries ?? []
          const gh = entries.reduce((s, e) => s + e.hours, 0)
          const gm = entries.reduce((s, e) => s + e.miles, 0)
          return (
            <div key={p.id} className="glass" style={{ borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: entries.length > 0 ? '1px solid rgba(34,211,238,0.08)' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>{p.last_name}, {p.first_name}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{p.company_name} · ROL {p.rol_license}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#22d3ee' }}>{gh.toFixed(1)}h / {gm.toFixed(1)}mi</div>
                  <div style={{ fontSize: 11, color: '#334155' }}>{entries.length} trips</div>
                </div>
              </div>
              {entries.slice(0, 3).map((e: LogEntry) => (
                <div key={e.id} style={{ padding: '10px 18px', borderBottom: '1px solid rgba(34,211,238,0.05)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#94a3b8' }}>{format(new Date(e.date + 'T00:00:00'), 'MMM d, yyyy')} · {e.river}</span>
                  <span style={{ color: '#64748b' }}>{e.hours}h · {e.miles}mi</span>
                </div>
              ))}
              {entries.length > 3 && (
                <div style={{ padding: '8px 18px', fontSize: 11, color: '#334155' }}>+{entries.length - 3} more entries</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
