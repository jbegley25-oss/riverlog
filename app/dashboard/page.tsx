import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogEntry, Profile, Totals } from '@/lib/types'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: entries }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('log_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
  ])

  // Profile missing means the DB trigger didn't fire — create it now
  if (!profile) {
    await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id' })
  }

  const totals: Totals = (entries ?? []).reduce((acc: Totals, e: LogEntry) => {
    if (e.role === 'guide') {
      acc.miles_as_guide += e.miles
      acc.hours_as_guide += e.hours
    } else if (e.role === 'trip_leader') {
      acc.miles_as_trip_leader += e.miles
      acc.hours_as_trip_leader += e.hours
    } else if (e.role === 'guide_instructor') {
      acc.miles_as_guide_instructor += e.miles
      acc.hours_as_guide_instructor += e.hours
    } else {
      acc.miles_private += e.miles
      acc.hours_private += e.hours
    }
    return acc
  }, { miles_as_guide: 0, miles_as_trip_leader: 0, miles_as_guide_instructor: 0, miles_private: 0, hours_as_guide: 0, hours_as_trip_leader: 0, hours_as_guide_instructor: 0, hours_private: 0 })

  return <DashboardClient profile={profile as Profile} entries={(entries ?? []) as LogEntry[]} totals={totals} />
}
