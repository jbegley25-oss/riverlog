'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Waves, Plus, FileText, LogOut, ChevronRight, Droplets, Clock, Map, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LogEntry, Profile, Totals } from '@/lib/types'
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

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass" style={{ borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#22d3ee', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function DashboardClient({ profile, entries, totals }: {
  profile: Profile
  entries: LogEntry[]
  totals: Totals
}) {
  const router = useRouter()
  const totalHours = totals.hours_as_guide + totals.hours_as_trip_leader + totals.hours_as_guide_instructor + totals.hours_private
  const totalMiles = totals.miles_as_guide + totals.miles_as_trip_leader + totals.miles_as_guide_instructor + totals.miles_private

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628' }}>
      {/* Header — padded for PWA status bar */}
      <div style={{ background: 'rgba(13,31,60,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(34,211,238,0.1)', position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)', borderRadius: 10, padding: 8 }}>
              <Waves size={18} color="#0a1628" strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>RiverLog</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)', color: '#94a3b8', textDecoration: 'none' }}>
              <Settings size={16} />
            </Link>
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer' }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 100px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Hey, {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'there'} 👋
          </h1>
          <p style={{ color: '#475569', fontSize: 14 }}>
            {profile?.company_name}
          </p>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          <StatCard label="Total Hours" value={totalHours.toFixed(1)} sub="on river" />
          <StatCard label="Total Miles" value={totalMiles.toFixed(1)} sub="river miles" />
          <StatCard label="Guide Hours" value={totals.hours_as_guide.toFixed(1)} sub={`${totals.miles_as_guide.toFixed(1)} mi`} />
          <StatCard label="Trips Logged" value={entries.length} sub="entries" />
        </div>

        {/* Breakdown */}
        {(totals.hours_as_trip_leader > 0 || totals.hours_as_guide_instructor > 0) && (
          <div className="glass" style={{ borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Hour Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['As Guide', totals.hours_as_guide, totals.miles_as_guide],
                ['As Trip Leader', totals.hours_as_trip_leader, totals.miles_as_trip_leader],
                ['As Guide Instructor', totals.hours_as_guide_instructor, totals.miles_as_guide_instructor],
                ['Private', totals.hours_private, totals.miles_private],
              ].filter(([, h]) => (h as number) > 0).map(([label, hours, miles]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#94a3b8' }}>{String(label)}</span>
                  <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>
                    {(hours as number).toFixed(1)}h · {(miles as number).toFixed(1)}mi
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
          <Link href="/log" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, textDecoration: 'none', padding: '20px 16px', borderRadius: 14,
            background: 'linear-gradient(135deg, #0891b2, #22d3ee)', color: '#0a1628',
          }}>
            <Plus size={24} strokeWidth={2.5} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Log Trip</span>
          </Link>
          <Link href="/generate" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, textDecoration: 'none', padding: '20px 16px', borderRadius: 14,
            background: 'rgba(13,31,60,0.6)', border: '1px solid rgba(34,211,238,0.15)', color: '#22d3ee',
          }}>
            <FileText size={24} strokeWidth={2} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Generate PDF</span>
          </Link>
        </div>

        {/* Recent entries */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 14 }}>
            Recent Trips {entries.length > 0 && <span style={{ color: '#475569', fontWeight: 400 }}>({entries.length})</span>}
          </h2>

          {entries.length === 0 ? (
            <div className="glass" style={{ borderRadius: 14, padding: 32, textAlign: 'center' }}>
              <Droplets size={32} color="#1a3a5c" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#475569', fontSize: 14 }}>No trips logged yet.<br />Tap "Log Trip" to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {entries.map(entry => (
                <Link key={entry.id} href={`/log/${entry.id}`} style={{ textDecoration: 'none' }}>
                  <div className="glass" style={{ borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.river}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#0891b2', background: 'rgba(8,145,178,0.15)', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {ROLE_LABELS[entry.role]}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#475569' }}>
                        <span>{format(new Date(entry.date + 'T00:00:00'), 'MMM d, yyyy')}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} />{entry.hours}h</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Map size={11} />{entry.miles}mi</span>
                        <span>{BOAT_LABELS[entry.boat_type]}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#334155" style={{ flexShrink: 0, marginLeft: 8 }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
