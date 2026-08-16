# Opera360 novo

Projeto recriado do zero com Next.js 16 + Supabase Auth SSR.

## Rodar
1. `npm install`
2. copie `.env.example` para `.env.local`
3. preencha apenas:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. `npm run dev`
5. abra `http://localhost:3000`

## Importante
- Não coloque `sb_secret_...` em `NEXT_PUBLIC_*`.
- O projeto usa `proxy.ts` (Next.js 16) em vez de `middleware.ts`.
- Se seu Supabase já tem `profiles`, não rode `supabase/schema.sql` de novo.
