-- =========================================================
-- OPERA360
-- BANCO DE DADOS
-- =========================================================


-- =========================================================
-- 1. PERFIS E PERMISSÕES
-- =========================================================

create type public.app_role as enum (
  'owner',
  'manager'
);


create table public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  full_name text not null default '',

  role public.app_role
    not null
    default 'manager',

  created_at timestamptz
    not null
    default now()
);


alter table public.profiles
enable row level security;


create policy "profile_self"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
);



-- =========================================================
-- 2. CLIENTES
-- =========================================================

create table public.clients (
  id uuid primary key
    default gen_random_uuid(),

  name text not null,

  document text,

  phone text,

  email text,

  contact_name text,

  notes text,

  active boolean
    not null
    default true,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


alter table public.clients
enable row level security;


create policy "clients_select_authenticated"
on public.clients
for select
to authenticated
using (true);


create policy "clients_insert_authenticated"
on public.clients
for insert
to authenticated
with check (true);


create policy "clients_update_authenticated"
on public.clients
for update
to authenticated
using (true)
with check (true);


create policy "clients_delete_authenticated"
on public.clients
for delete
to authenticated
using (true);



-- =========================================================
-- 3. STATUS DOS EVENTOS
-- =========================================================

create type public.event_status as enum (
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);



-- =========================================================
-- 4. EVENTOS
-- =========================================================

create table public.events (
  id uuid primary key
    default gen_random_uuid(),

  client_id uuid
    references public.clients(id)
    on delete set null,

  name text not null,

  location text,

  start_date date not null,

  end_date date not null,

  start_time time,

  end_time time,

  workers_needed integer
    not null
    default 0,

  contract_value numeric(12,2)
    not null
    default 0,

  meal_value numeric(10,2)
    not null
    default 20,

  status public.event_status
    not null
    default 'scheduled',

  notes text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint events_valid_dates
    check (
      end_date >= start_date
    ),

  constraint events_workers_positive
    check (
      workers_needed >= 0
    ),

  constraint events_contract_value_positive
    check (
      contract_value >= 0
    ),

  constraint events_meal_value_positive
    check (
      meal_value >= 0
    )
);



alter table public.events
enable row level security;


create policy "events_select_authenticated"
on public.events
for select
to authenticated
using (true);


create policy "events_insert_authenticated"
on public.events
for insert
to authenticated
with check (true);


create policy "events_update_authenticated"
on public.events
for update
to authenticated
using (true)
with check (true);


create policy "events_delete_authenticated"
on public.events
for delete
to authenticated
using (true);



-- =========================================================
-- 5. ÍNDICES
-- =========================================================

create index idx_clients_name
on public.clients(name);


create index idx_clients_active
on public.clients(active);


create index idx_events_client
on public.events(client_id);


create index idx_events_start_date
on public.events(start_date);


create index idx_events_end_date
on public.events(end_date);


create index idx_events_status
on public.events(status);



-- =========================================================
-- 6. ATUALIZAÇÃO AUTOMÁTICA DO updated_at
-- =========================================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  new.updated_at = now();

  return new;

end;
$$;


create trigger clients_updated_at
before update
on public.clients
for each row
execute function public.update_updated_at();


create trigger events_updated_at
before update
on public.events
for each row
execute function public.update_updated_at();