-- =========================================================
-- MELHORIAS OPERACIONAIS — PERFIL E LIMPEZA SEGURA
-- Execute pelo Supabase CLI ou cole no SQL Editor uma única vez.
-- =========================================================

-- Foto de perfil
alter table public.profiles
  add column if not exists avatar_url text;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profile_update_self'
  ) then
    create policy "profile_update_self"
    on public.profiles
    for update
    to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());
  end if;
end;
$$;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Fotos de perfil públicas" on storage.objects;
drop policy if exists "Usuário envia sua foto de perfil" on storage.objects;
drop policy if exists "Usuário atualiza sua foto de perfil" on storage.objects;
drop policy if exists "Usuário remove sua foto de perfil" on storage.objects;

create policy "Fotos de perfil públicas"
on storage.objects for select
using (bucket_id = 'profile-photos');

create policy "Usuário envia sua foto de perfil"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Usuário atualiza sua foto de perfil"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Usuário remove sua foto de perfil"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Limpeza de dados: todo DELETE recebe uma cláusula WHERE.
-- Perfis, usuários do Auth e histórico de atividades são preservados.
create or replace function public.clear_operational_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'Apenas administradores podem limpar os dados.';
  end if;

  delete from public.advances where id is not null;
  delete from public.payments where id is not null;
  delete from public.attendances where id is not null;
  delete from public.schedules where id is not null;
  delete from public.meals where id is not null;
  delete from public.transports where id is not null;

  update public.quotes
  set event_id = null
  where event_id is not null;

  delete from public.events where id is not null;
end;
$$;

create or replace function public.clear_business_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'Apenas administradores podem limpar os dados.';
  end if;

  delete from public.advances where id is not null;
  delete from public.payments where id is not null;
  delete from public.attendances where id is not null;
  delete from public.schedules where id is not null;
  delete from public.meals where id is not null;
  delete from public.transports where id is not null;
  delete from public.quotes where id is not null;
  delete from public.events where id is not null;
  delete from public.workers where id is not null;
  delete from public.clients where id is not null;
end;
$$;

revoke all on function public.clear_operational_data() from public;
revoke all on function public.clear_business_data() from public;
grant execute on function public.clear_operational_data() to authenticated;
grant execute on function public.clear_business_data() to authenticated;
