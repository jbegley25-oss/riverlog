import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogEntry, Profile } from '@/lib/types'
import AdminAccountClient from './AdminAccountClient'

export default async function AdminAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/dashboard')

  const [{ data: profile }, { data: entries }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('log_entries').select('*').eq('user_id', id).order('date', { ascending: false }),
  ])

  if (!profile) notFound()

  return <AdminAccountClient profile={profile as Profile} entries={(entries ?? []) as LogEntry[]} />
}
