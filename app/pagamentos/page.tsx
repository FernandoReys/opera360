import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PagamentosClient from './PagamentosClient'

export default async function PagamentosPage() {
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
    <PagamentosClient
      email={user.email ?? ''}
      fullName={profile?.full_name ?? 'Usuário'}
      role={profile?.role ?? 'manager'}
    />
  )
}