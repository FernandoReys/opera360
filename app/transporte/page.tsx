import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TransporteClient from './TransporteClient'

export default async function TransportePage() {
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
    <TransporteClient
      email={user.email ?? ''}
      fullName={profile?.full_name ?? 'Usuário'}
      role={profile?.role ?? 'manager'}
    />
  )
}