import { createBrowserClient } from '@supabase/ssr'
export function createClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 if(!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada.')
 if(!key) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não configurada.')
 return createBrowserClient(url,key)
}
