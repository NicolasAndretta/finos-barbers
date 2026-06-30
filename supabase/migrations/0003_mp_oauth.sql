-- ============================================================================
-- Finos Barbers — Migración 0003: conexión OAuth con Mercado Pago (MP Connect)
-- Guarda el token del comercio conectado. Los tokens NUNCA se exponen por la
-- API pública: RLS activo sin políticas → solo el server (service role) accede.
-- ============================================================================

create table if not exists mp_conexion (
  id            uuid primary key default gen_random_uuid(),
  mp_user_id    text,                         -- id del usuario MP del comercio
  access_token  text not null,
  refresh_token text,
  public_key    text,
  expires_at    timestamptz,
  scope         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- RLS activado y SIN políticas: ni anon ni usuarios logueados pueden leer los
-- tokens. Solo el código de servidor con service role los usa.
alter table mp_conexion enable row level security;
