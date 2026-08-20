import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import IndicadoresClient from './IndicadoresClient'

export default async function IndicadoresPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .limit(1)

  const profile = profiles?.[0]

  if (!profile || profile.role !== 'owner') {
    redirect('/dashboard')
  }

  return (
    <IndicadoresClient
      email={user.email ?? ''}
      fullName={profile.full_name ?? 'Usuário'}
      role={profile.role}
    />
  )
}