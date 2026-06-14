import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogEntry, Profile } from '@/lib/types'
import GenerateClient from './GenerateClient'

export default async function GeneratePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: entries }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('log_entries').select('*').eq('user_id', user.id).order('date', { ascending: true }),
  ])

  return <GenerateClient profile={profile as Profile} entries={(entries ?? []) as LogEntry[]} />
}
