-- ============================================================================
-- Finos Barbers — Migración 0002: pagos del turno (seña 40% + medios de pago)
-- Aditiva e idempotente.
-- ============================================================================

alter table turnos add column if not exists metodo_pago text
  check (metodo_pago in ('mercadopago','transferencia','efectivo'));
alter table turnos add column if not exists sena_monto       numeric;
alter table turnos add column if not exists sena_estado      text default 'pendiente'
  check (sena_estado in ('pendiente','pagada'));
alter table turnos add column if not exists mp_preference_id text;
alter table turnos add column if not exists mp_payment_id    text;
