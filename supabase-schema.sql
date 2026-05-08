-- ═══════════════════════════════════════════════════════════════
--  Nails by Yadi — Supabase Schema
--  Ejecuta esto en: supabase.com → tu proyecto → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── Habilitar extensión UUID ─────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Tabla: appointments ──────────────────────────────────────
create table if not exists public.appointments (
  id                  text        primary key default 'APT-' || extract(epoch from now())::bigint::text,
  date                date        not null,
  time                text        not null,          -- e.g. "10:30"
  service_id          text        not null,
  client_name         text        not null,
  client_phone        text        not null,
  client_email        text        not null,
  payment             text        not null default 'Efectivo',
  status              text        not null default 'confirmed',
  notes               text,
  client_confirmed    boolean     not null default false,    -- ← NUEVO: cliente confirmó por email
  client_confirmed_at timestamptz,                            -- ← NUEVO: cuándo confirmó
  cancelled_at        timestamptz,                            -- ← NUEVO: cuándo se canceló
  cancel_token        text,                                    -- ← NUEVO: token único para cancelar/confirmar por link
  created_at          timestamptz not null default now()
);

-- Si la tabla ya existe, agregamos las columnas nuevas:
alter table public.appointments add column if not exists client_confirmed    boolean not null default false;
alter table public.appointments add column if not exists client_confirmed_at timestamptz;
alter table public.appointments add column if not exists cancelled_at        timestamptz;
alter table public.appointments add column if not exists cancel_token        text;

-- Índices para consultas frecuentes (por fecha y estado)
create index if not exists idx_appts_date   on public.appointments (date);
create index if not exists idx_appts_status on public.appointments (status);

-- ── Tabla: queue_entries ─────────────────────────────────────
create table if not exists public.queue_entries (
  id            text        primary key default 'Q-' || extract(epoch from now())::bigint::text,
  date          date,                                       -- ← fecha del slot que quería
  time          text,                                       -- ← hora del slot que quería
  client_name   text        not null,
  client_phone  text        not null,
  client_email  text,
  service_id    text        not null,
  notes         text,
  position      integer     not null default 1,
  status        text        not null default 'waiting',   -- waiting | notified | confirmed | expired
  created_at    timestamptz not null default now()
);

-- Si la tabla ya existe, agregar columnas que faltan:
alter table public.queue_entries add column if not exists date     date;
alter table public.queue_entries add column if not exists time     text;
alter table public.queue_entries add column if not exists position integer not null default 1;

create index if not exists idx_queue_status on public.queue_entries (status);

-- ── Tabla: business_settings (configuración que Yadi cambia) ──
create table if not exists public.business_settings (
  id                       text        primary key default 'main',
  business_name            text        not null default 'Nails by Yadi',
  owner_name               text        not null default 'Yadi',
  phone                    text,
  address                  text        default '4377 Saturn Ave, West Palm Beach, FL 33406',
  -- Política de cancelación (opcional, Yadi la activa cuando quiera)
  enforce_cancellation_fee boolean     not null default false,
  cancellation_fee_percent integer     not null default 50,
  cancellation_window_hrs  integer     not null default 24,
  show_policy_on_site      boolean     not null default false,
  updated_at               timestamptz not null default now()
);

-- Insertar el row inicial si no existe
insert into public.business_settings (id) values ('main')
on conflict (id) do nothing;

alter table public.business_settings enable row level security;

drop policy if exists "Anyone can read settings" on public.business_settings;
create policy "Anyone can read settings"
  on public.business_settings for select
  using (true);

drop policy if exists "Owner can update settings" on public.business_settings;
create policy "Owner can update settings"
  on public.business_settings for update
  using (true)
  with check (true);

-- ── Row Level Security (RLS) ─────────────────────────────────
--  La clave "anon" (pública, en el frontend) solo puede leer/escribir
--  datos propios según estas políticas.
--  La clave "service_role" (solo servidor) ignora RLS.

alter table public.appointments  enable row level security;
alter table public.queue_entries enable row level security;

-- Appointments: cualquier visitante puede insertar (reservar)
--               y leer solo citas confirmadas (para verificar disponibilidad)
create policy "Anyone can book"
  on public.appointments for insert
  with check (true);

create policy "Read confirmed appointments"
  on public.appointments for select
  using (status = 'confirmed');

create policy "Cancel own appointment"
  on public.appointments for update
  using (true)
  with check (status = 'cancelled');

-- Queue: cualquier visitante puede unirse y ver su posición
create policy "Anyone can join queue"
  on public.queue_entries for insert
  with check (true);

create policy "Read waiting queue"
  on public.queue_entries for select
  using (status = 'waiting');

-- ── Función: generar ID único para citas ─────────────────────
--  Genera IDs tipo APT-1716500000123 (timestamp en ms)
create or replace function generate_apt_id()
returns text language plpgsql as $$
begin
  return 'APT-' || (extract(epoch from clock_timestamp()) * 1000)::bigint::text;
end;
$$;

-- ── Vista: citas de hoy (útil para el dashboard) ─────────────
create or replace view public.today_appointments as
  select * from public.appointments
  where date = current_date
    and status = 'confirmed'
  order by time;

-- ── Vista: cola actual ───────────────────────────────────────
create or replace view public.current_queue as
  select
    *,
    row_number() over (order by created_at) as position
  from public.queue_entries
  where status = 'waiting'
  order by created_at;
