-- ============================================================================
-- Finos Barbers — Migración 0001: núcleo funcional
-- Aditiva e idempotente. Respeta el patrón RLS existente (is_admin()).
-- ============================================================================

-- 1) GUEST CHECKOUT ----------------------------------------------------------
-- Permitir pedidos sin cuenta + datos del invitado.
alter table pedidos alter column user_id drop not null;
alter table pedidos add column if not exists cliente_nombre   text;
alter table pedidos add column if not exists cliente_email    text;
alter table pedidos add column if not exists cliente_telefono text;

-- 2) CATEGORÍAS Y SUBCATEGORÍAS ----------------------------------------------
-- Una sola tabla para productos y servicios; subcategorías vía parent_id.
create table if not exists categorias (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  slug       text not null,
  tipo       text not null check (tipo in ('producto','servicio')),
  parent_id  uuid references categorias(id) on delete set null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamptz default now(),
  unique (tipo, slug)
);

alter table productos add column if not exists categoria_id uuid references categorias(id) on delete set null;
alter table productos add column if not exists stock_minimo int not null default 3;
alter table servicios add column if not exists categoria_id uuid references categorias(id) on delete set null;

-- 3) BARBEROS enriquecidos ---------------------------------------------------
alter table barberos add column if not exists bio          text;
alter table barberos add column if not exists foto_url     text;
alter table barberos add column if not exists especialidad text;
alter table barberos add column if not exists dias         text[];

-- 4) RESEÑAS administrables --------------------------------------------------
create table if not exists resenas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  texto      text not null,
  rating     int  not null default 5 check (rating between 1 and 5),
  visible    boolean not null default false,
  orden      int  not null default 0,
  created_at timestamptz default now()
);

-- 5) RLS (mismo patrón que el resto: lectura pública + escritura admin) -------
alter table categorias enable row level security;
alter table resenas    enable row level security;

drop policy if exists "categorias_public_read" on categorias;
create policy "categorias_public_read" on categorias
  for select using (true);

drop policy if exists "categorias_admin_all" on categorias;
create policy "categorias_admin_all" on categorias
  for all using (is_admin()) with check (is_admin());

drop policy if exists "resenas_public_read" on resenas;
create policy "resenas_public_read" on resenas
  for select using (visible = true);

drop policy if exists "resenas_admin_all" on resenas;
create policy "resenas_admin_all" on resenas
  for all using (is_admin()) with check (is_admin());
