import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrabalhadoresClient from './TrabalhadoresClient'

export default async function TrabalhadoresPage() {
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
    <TrabalhadoresClient
      email={user.email ?? ''}
      fullName={profile?.full_name ?? 'Usuário'}
      role={profile?.role ?? 'manager'}
    />
  )
}