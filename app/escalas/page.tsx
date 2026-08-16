import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EscalasClient from './EscalasClient'

export default async function EscalasPage() {
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
    <EscalasClient
      email={user.email ?? ''}
      fullName={profile?.full_name ?? 'Usuário'}
      role={profile?.role ?? 'manager'}
    />
  )
}