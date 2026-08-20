import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './dashboard-client'

export default async function Dashboard() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error(
      'Erro ao carregar perfil da dashboard:',
      profileError.message
    )

    throw new Error(
      `Não foi possível carregar o perfil do usuário: ${profileError.message}`
    )
  }

  return (
    <DashboardClient
      email={user.email ?? ''}
      fullName={profile.full_name || user.email?.split('@')[0] || 'Usuário'}
      role={profile.role}
    />
  )
}