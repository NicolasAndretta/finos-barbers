-- 0005_cerrar_escrituras_directas.sql
-- Cierra escrituras que un cliente podía hacer hablándole a la base sin pasar
-- por la app.
--
-- CONTEXTO
-- La clave pública (anon) viaja en el navegador de cualquiera. Con esa clave y
-- una cuenta de cliente se le puede pedir cosas a la base directamente, sin
-- usar la app. Lo único que decide qué pasa es RLS (las políticas). La foto
-- del 10/10/2026 mostró tres políticas que dejaban escribir de más.
--
-- QUÉ CAMBIA
--   1. pedidos: se borra "pedidos_user_insert". Dejaba crear un pedido propio
--      con cualquier estado (incluso 'pagado') y cualquier total.
--   2. items_pedido: se borra "items_pedido_user_insert". Dejaba agregarle
--      renglones a un pedido propio en cualquier momento y a cualquier precio.
--   3. turnos: "turnos: cliente crea turno propio" queda más estricta. Ya
--      exigía que el turno naciera 'pendiente'; ahora también que la seña
--      nazca 'pendiente' y sin pago cargado.
--
-- POR QUÉ NO ROMPE LA APP
--   1 y 2: la app nunca usó esas dos políticas. Los pedidos los crea el
--      servidor (src/app/actions/checkout.ts) con la llave maestra, después de
--      validar precio y stock. Es el mismo criterio con el que ya se había
--      borrado "pedidos_user_update". Leer los pedidos propios sigue andando
--      (esa política no se toca), y el admin sigue con acceso total.
--   3: la reserva sí se crea con la sesión del cliente
--      (src/app/actions/reservas.ts), por eso la política se queda. La app
--      siempre manda la seña en 'pendiente' y sin pago: sigue pasando.
--
-- NO TOCA nada de 369 (trabajos, fotos, videos, bucket galeria).
-- NO borra datos: solo cambia quién puede escribir.
-- Se puede correr dos veces sin problema.

-- 1) Pedidos: solo los crea el servidor.
drop policy if exists pedidos_user_insert on public.pedidos;

-- 2) Renglones de pedido: solo los crea el servidor.
drop policy if exists items_pedido_user_insert on public.items_pedido;

-- 3) Turnos: el cliente crea el suyo, pero siempre "sin pagar".
--    Se borra y se vuelve a crear con el mismo nombre: así queda exactamente
--    como dice acá, aunque ya existiera.
drop policy if exists "turnos: cliente crea turno propio" on public.turnos;
create policy "turnos: cliente crea turno propio" on public.turnos
  as permissive
  for insert
  to public
  with check (
    auth.uid() = cliente_id                          -- a su nombre, no de otro
    and estado = 'pendiente'                         -- nace sin confirmar
    and coalesce(sena_estado, 'pendiente') = 'pendiente'  -- la seña nace sin pagar
    and mp_payment_id is null                        -- sin un pago inventado
  );

-- Verificación (solo lectura). Tiene que devolver una fila: la de turnos.
--   select tablename, policyname from pg_policies
--    where schemaname = 'public' and cmd = 'INSERT'
--      and tablename in ('pedidos', 'items_pedido', 'turnos');
