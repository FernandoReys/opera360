import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

import FechamentoClient from './FechamentoClient'

export default async function FechamentoPage() {
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

  if (profile?.role !== 'owner') {
    redirect('/eventos')
  }

  return (
    <FechamentoClient
      email={user.email ?? ''}
      fullName={profile?.full_name ?? 'Usuário'}
      role={profile?.role ?? 'manager'}
    />
  )
}
