-- 0012_sin_mecanismo_temporal.sql
-- Fase 4b: se saca el mecanismo temporal de la Fase 2.
--
-- POR QUÉ
--   En la Fase 2 (0007), mientras el código creaba las cuentas de barbero
--   poniendo `role = 'barbero'` y `barbero_id` en el PERFIL (que es de toda la
--   plataforma), un disparador copiaba eso a una membresía de barbero en el
--   local del barbero. Era TEMPORAL: "se quita cuando el código maneje
--   membresías". Desde la Fase 4b el código crea la membresía directamente
--   (src/app/actions/barberos.ts), así que el disparador sobra.
--
--   Dejarlo tenía un riesgo: un cambio en el perfil (que no dice de qué local
--   es) podía crear o borrar una membresía de un local.
--
-- QUÉ HACE
--   Borra el disparador `profiles_sincroniza_barbero` y su función
--   `sincronizar_membresia_barbero()`. NO borra datos: las membresías que ya
--   existen quedan como están, y las columnas `profiles.role` y
--   `profiles.barbero_id` también (sacarlas sería borrar: va aparte, con el OK
--   de Nico, como `locales.horarios`).
--
-- Es idempotente. Al volver a pasar todas las migraciones en desarrollo, la
-- 0007 lo vuelve a crear y esta lo vuelve a sacar: el resultado es el mismo.

drop trigger if exists profiles_sincroniza_barbero on public.profiles;
drop function if exists public.sincronizar_membresia_barbero();
