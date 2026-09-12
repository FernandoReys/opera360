import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

import EventosDoDiaClient from './EventosDoDiaClient'

export default async function EventosDoDiaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <EventosDoDiaClient
      email={user.email ?? ''}
      fullName={profile?.full_name ?? 'Usuário'}
      role={profile?.role ?? 'manager'}
    />
  )
}
