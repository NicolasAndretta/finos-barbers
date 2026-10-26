-- 0013_permisos_minimos.sql
-- Fase 5: una segunda cerradura en los permisos de las tablas de la barbería.
--
-- POR QUÉ
--   Supabase le da por defecto TODOS los permisos de Postgres a la clave pública
--   (anon) y a las sesiones (authenticated) sobre las tablas de public. Lo que
--   cuida los datos es RLS (Fase 2), y eso no cambia. Pero algunos de esos
--   permisos no pasan por RLS: TRUNCATE (vaciar una tabla entera) no mira las
--   políticas. Hoy no se puede pedir por la API de Supabase, así que no es un
--   agujero abierto: es la segunda cerradura, por si algún día aparece otro
--   camino. Lo encontró la prueba completa de la Fase 5 (scripts/probar-matriz.mjs).
--
-- QUÉ HACE, en las tablas de la barbería que la foto trajo con todo:
--   - A la clave pública (anon) le saca escribir (insert, update, delete) y lo
--     que no pasa por RLS (truncate, references, trigger). Le queda leer: qué ve
--     lo siguen decidiendo las políticas (el catálogo de los locales públicos).
--     Un visitante nunca escribe: reservar o comprar pasa por una sesión o por
--     el servidor.
--   - A las sesiones (authenticated) les saca solo lo que no pasa por RLS
--     (truncate, references, trigger). Escribir sigue dependiendo de las
--     políticas, como hasta ahora.
-- Las tablas nuevas (locales, equipo, membresias, horarios, ausencias,
-- mp_conexion) ya nacieron con lo justo.
--
-- NO toca lo de 369 (sus tres tablas quedan como están: son intocables).
-- NO borra datos. Es idempotente.

do $permisos$
declare t text;
begin
  foreach t in array array[
    'barberos', 'categorias', 'servicios', 'productos', 'resenas',
    'turnos', 'pedidos', 'items_pedido', 'transacciones', 'profiles'
  ] loop
    execute format('revoke insert, update, delete, truncate, references, trigger on table public.%I from public, anon', t);
    execute format('revoke truncate, references, trigger on table public.%I from authenticated', t);
  end loop;
end $permisos$;
