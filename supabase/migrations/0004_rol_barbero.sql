-- 0004_rol_barbero.sql
-- Rol "barbero": cuenta de acceso limitado para los barberos del local.
-- Ve solo su calendario (sus turnos) y la lista de clientes. No toca stock,
-- servicios, cobros ni finanzas.

-- 1) Permitir el nuevo valor de rol.
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('client', 'admin', 'barbero'));

-- 2) Vincular la cuenta del barbero con su registro en `barberos`.
--    on delete set null: si se borra el barbero, la cuenta queda sin vínculo
--    (no se borra la cuenta de auth por esto).
alter table profiles
  add column if not exists barbero_id uuid references barberos(id) on delete set null;

create index if not exists profiles_barbero_id_idx on profiles(barbero_id);
