-- 0009_sin_local_por_defecto.sql
-- Fase 3a: se termina el "Roble por defecto".
--
-- POR QUÉ
--   Desde la Fase 1 (0006), `local_id` tenía un valor por defecto: Roble. Era
--   TEMPORAL, para que la app vieja (que no sabía de locales) siguiera andando.
--   Desde la Fase 3a la app dice siempre de qué local es cada cosa que guarda.
--   Si algo se guardara sin local (un error del código), es mejor que la base
--   lo rechace a que lo mande callado a Roble, mezclado con sus datos.
--
-- QUÉ HACE
--   Saca el valor por defecto de `local_id` en las 9 tablas de la barbería.
--   `mp_conexion` lo conserva: la conexión de Mercado Pago por local llega en
--   la Fase 4, y hasta entonces la única conexión es la de Roble.
--
-- No borra datos (solo saca un valor por defecto). Es idempotente.
--
-- ⚠️ AL PASAR A PRODUCCIÓN (Fase 5): esta migración va DESPUÉS de publicar el
-- código de la Fase 3a. Con el código viejo publicado, las reservas y compras
-- fallarían (no dicen el local).

do $sin_defecto$
declare t text;
begin
  foreach t in array array[
    'barberos', 'categorias', 'servicios', 'productos', 'resenas',
    'turnos', 'pedidos', 'items_pedido', 'transacciones'
  ] loop
    execute format('alter table public.%I alter column local_id drop default', t);
  end loop;
end $sin_defecto$;
