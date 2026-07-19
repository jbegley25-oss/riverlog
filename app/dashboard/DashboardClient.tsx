'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, FileText, LogOut, ChevronRight, Droplets, Clock, Map, Settings, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LogEntry, Profile, Totals } from '@/lib/types'
import { format } from 'date-fns'
import Confetti from '@/components/Confetti'
import IconUpdateBanner from '@/components/IconUpdateBanner'

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

function MilestoneTracker({ label, achieved, progressPct, detail }: { label: string; achieved: boolean; progressPct: number; detail: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{label}</span>
        {achieved ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#22d3ee', background: 'rgba(34,211,238,0.12)', borderRadius: 4, padding: '2px 8px' }}>Achieved</span>
        ) : (
          <span style={{ fontSize: 12, color: '#475569' }}>{progressPct.toFixed(0)}%</span>
        )}
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'rgba(148,163,184,0.15)', overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #0891b2, #22d3ee)', borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 12, color: '#475569' }}>{detail}</div>
    </div>
  )
}

export default function DashboardClient({ profile, entries, totals }: {
  profile: Profile
  entries: LogEntry[]
  totals: Totals
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const totalHours = totals.hours_as_guide + totals.hours_as_trip_leader + totals.hours_as_guide_instructor + totals.hours_private
  const totalMiles = totals.miles_as_guide + totals.miles_as_trip_leader + totals.miles_as_guide_instructor + totals.miles_private

  // Celebration state — set once on mount from the log wizard's redirect params
  const celebrateRef = useRef(searchParams.get('celebrate') === '1')
  const addedHours = celebrateRef.current ? parseFloat(searchParams.get('hours') || '0') || 0 : 0
  const addedMiles = celebrateRef.current ? parseFloat(searchParams.get('miles') || '0') || 0 : 0
  const addedRole = searchParams.get('role')
  const [showConfetti, setShowConfetti] = useState(celebrateRef.current)
  const [progress, setProgress] = useState(celebrateRef.current ? 0 : 1)

  useEffect(() => {
    if (!celebrateRef.current) return
    router.replace('/dashboard', { scroll: false })

    const duration = 1400
    const start = performance.now()
    let raf: number
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      setProgress(1 - Math.pow(1 - t, 3)) // ease-out cubic
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Interpolates from (final - delta) up to final as `progress` goes 0 -> 1
  function anim(final: number, delta: number) {
    return final - delta * (1 - progress)
  }

  const guideHoursDelta = addedRole === 'guide' ? addedHours : 0
  const guideMilesDelta = addedRole === 'guide' ? addedMiles : 0
  const tripLeaderHoursDelta = addedRole === 'trip_leader' ? addedHours : 0
  const tripLeaderMilesDelta = addedRole === 'trip_leader' ? addedMiles : 0
  const guideInstructorHoursDelta = addedRole === 'guide_instructor' ? addedHours : 0
  const guideInstructorMilesDelta = addedRole === 'guide_instructor' ? addedMiles : 0
  const privateHoursDelta = addedRole === 'private' ? addedHours : 0
  const privateMilesDelta = addedRole === 'private' ? addedMiles : 0
  const commercialHoursDelta = addedRole !== 'private' ? addedHours : 0
  const commercialMilesDelta = addedRole !== 'private' ? addedMiles : 0

  const commercialHours = totals.hours_as_guide + totals.hours_as_trip_leader + totals.hours_as_guide_instructor
  const commercialMiles = totals.miles_as_guide + totals.miles_as_trip_leader + totals.miles_as_guide_instructor

  const displayedTotalHours = anim(totalHours, addedHours)
  const displayedTotalMiles = anim(totalMiles, addedMiles)
  const displayedGuideHours = anim(totals.hours_as_guide, guideHoursDelta)
  const displayedGuideMiles = anim(totals.miles_as_guide, guideMilesDelta)
  const displayedTripLeaderHours = anim(totals.hours_as_trip_leader, tripLeaderHoursDelta)
  const displayedTripLeaderMiles = anim(totals.miles_as_trip_leader, tripLeaderMilesDelta)
  const displayedGuideInstructorHours = anim(totals.hours_as_guide_instructor, guideInstructorHoursDelta)
  const displayedGuideInstructorMiles = anim(totals.miles_as_guide_instructor, guideInstructorMilesDelta)
  const displayedPrivateHours = anim(totals.hours_private, privateHoursDelta)
  const displayedPrivateMiles = anim(totals.miles_private, privateMilesDelta)
  const displayedCommercialHours = anim(commercialHours, commercialHoursDelta)
  const displayedCommercialMiles = anim(commercialMiles, commercialMilesDelta)
  const displayedTripsCount = Math.round(anim(entries.length, celebrateRef.current ? 1 : 0))

  // Milestones: Trip Leader needs 500 total mi w/ at least half (250) commercial;
  // Guide Instructor needs 1,500 commercial mi.
  const tripLeaderAchieved = displayedTotalMiles >= 500 && displayedCommercialMiles >= 250
  const tripLeaderProgressPct = Math.min(100, Math.min(displayedTotalMiles / 500, displayedCommercialMiles / 250) * 100)
  const instructorAchieved = displayedCommercialMiles >= 1500
  const instructorProgressPct = Math.min(100, (displayedCommercialMiles / 1500) * 100)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628' }}>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {/* Header — padded for PWA status bar */}
      <div style={{ background: 'rgba(13,31,60,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(34,211,238,0.1)', position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icons/icon-192.png" alt="RiverLog" width={34} height={34} style={{ borderRadius: 10 }} />
            <span style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>The River Log</span>
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
        <IconUpdateBanner />

        {/* Greeting */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Hey, {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'there'} 👋
          </h1>
          <p style={{ color: '#475569', fontSize: 14 }}>
            {profile?.company_name}
          </p>
        </div>

        {/* Milestones */}
        <div className="glass" style={{ borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <Award size={14} color="#475569" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Milestones</span>
          </div>
          <MilestoneTracker
            label="Trip Leader"
            achieved={tripLeaderAchieved}
            progressPct={tripLeaderProgressPct}
            detail={`${displayedTotalMiles.toFixed(0)} / 500 mi total · ${displayedCommercialMiles.toFixed(0)} / 250 mi commercial`}
          />
          <MilestoneTracker
            label="Guide Instructor"
            achieved={instructorAchieved}
            progressPct={instructorProgressPct}
            detail={`${displayedCommercialMiles.toFixed(0)} / 1,500 commercial mi`}
          />
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          <StatCard label="Total Hours" value={displayedTotalHours.toFixed(1)} sub="on river" />
          <StatCard label="Total Miles" value={displayedTotalMiles.toFixed(1)} sub="river miles" />
          <StatCard label="Total Private Miles" value={displayedPrivateMiles.toFixed(1)} sub={`${displayedPrivateHours.toFixed(1)}h`} />
          <StatCard label="Total Commercial Miles" value={displayedCommercialMiles.toFixed(1)} sub={`${displayedCommercialHours.toFixed(1)}h`} />
        </div>

        {/* Breakdown */}
        {(totals.hours_as_trip_leader > 0 || totals.hours_as_guide_instructor > 0) && (
          <div className="glass" style={{ borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Hour Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['As Guide', displayedGuideHours, displayedGuideMiles],
                ['As Trip Leader', displayedTripLeaderHours, displayedTripLeaderMiles],
                ['As Guide Instructor', displayedGuideInstructorHours, displayedGuideInstructorMiles],
                ['Private', displayedPrivateHours, displayedPrivateMiles],
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
          <div style={{ marginBottom: 14 }}>
            <StatCard label="Trips Logged" value={displayedTripsCount} sub="entries" />
          </div>
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
                        <span style={{ fontSize: 11, fontWeight: 600, color: entry.role === 'private' ? '#94a3b8' : '#22d3ee', background: entry.role === 'private' ? 'rgba(148,163,184,0.12)' : 'rgba(34,211,238,0.12)', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {entry.role === 'private' ? 'Private' : 'Commercial'}
                        </span>
                        {entry.role !== 'private' && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#0891b2', background: 'rgba(8,145,178,0.15)', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {ROLE_LABELS[entry.role]}
                          </span>
                        )}
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
