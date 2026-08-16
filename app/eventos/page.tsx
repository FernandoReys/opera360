import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EventosClient from './EventosClient'
import AppSidebar from '@/components/AppSidebar'

export default async function EventosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <EventosClient
      email={user.email ?? ''}
      fullName={profile?.full_name ?? 'Usuário'}
      role={profile?.role ?? 'manager'}
    />
  )
}