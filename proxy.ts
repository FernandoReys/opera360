import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
export async function proxy(request:NextRequest){
 let response=NextResponse.next({request})
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 if(!url||!key) return response
 const supabase=createServerClient(url,key,{cookies:{getAll(){return request.cookies.getAll()},setAll(list){list.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});list.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}})
 const {data:{user}}=await supabase.auth.getUser()
 const path=request.nextUrl.pathname
 const protectedRoute=['/dashboard','/eventos','/trabalhadores','/presencas','/financeiro','/orcamentos'].some(r=>path.startsWith(r))
 if(!user&&protectedRoute){const u=request.nextUrl.clone();u.pathname='/login';return NextResponse.redirect(u)}
 if(user&&path==='/login'){const u=request.nextUrl.clone();u.pathname='/dashboard';return NextResponse.redirect(u)}
 return response
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']}
