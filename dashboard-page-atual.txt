import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './dashboard-client'
export default async function Dashboard(){const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect('/login');const {data:p}=await s.from('profiles').select('full_name,role').eq('id',user.id).maybeSingle();return <DashboardClient email={user.email??''} fullName={p?.full_name??'Usuário'} role={p?.role??'manager'}/>}
