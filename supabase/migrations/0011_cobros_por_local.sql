-- 0011_cobros_por_local.sql
-- Fase 4a: cada local cobra en su propia cuenta de Mercado Pago.
--
-- QUÉ HACE
--   1. `mp_conexion` pasa a ser UNA conexión por local:
--      - cada conexión dice de qué local es (se termina el "Roble por defecto"),
--      - la base no deja guardar dos para el mismo local,
--      - guarda con qué cuenta se conectó (el apodo y el mail de Mercado Pago),
--        para que el panel lo muestre (la lección de Código Rojo del 29/09),
--      - y le saca los permisos que la foto le dejó a la clave pública. RLS ya
--        la frenaba (no tiene políticas); esto es una segunda cerradura.
--   2. Una seña puede quedar "devuelta": si el local la devuelve desde su
--      Mercado Pago, el panel lo tiene que mostrar.
--   3. La caja acepta movimientos sin persona cuando los anota el sistema. Una
--      compra sin cuenta (de invitado) no tiene a nadie para poner en
--      "lo cargó", y por eso hasta ahora esas ventas nunca llegaban a la caja.
--      Lo que se carga a mano sigue exigiendo quién lo cargó.
--   4. Cuatro funciones que aplican un pago YA VERIFICADO con Mercado Pago:
--      confirmar y devolver una seña, confirmar y devolver un pedido.
--      - Cobrar un pedido descuenta el stock (hasta ahora nunca se descontaba)
--        y cada renglón anota cuánto se descontó, para que una devolución
--        reponga exactamente eso.
--      - Cada una es una sola operación: entra completa o no entra.
--      - Revisan otra vez que el turno o el pedido sea de ese local y que el
--        monto sea el justo (el servidor ya lo revisó; esto es por si algún
--        día el código se equivoca).
--      - Se pueden llamar dos veces sin que pase dos veces (Mercado Pago a
--        veces manda el mismo aviso más de una vez).
--      - Solo las puede usar el servidor: se les saca el permiso a todos los
--        demás. Ese permiso de más fue justo el agujero de `mark_order_paid`
--        en Código Rojo.
--
-- SI ALGÚN LOCAL TUVIERA DOS CONEXIONES (en producción), la migración se frena
-- con un aviso y no cambia nada: no borra ninguna, eso lo decide Nico. La copia
-- de producción del 13/10/2026 no tiene ninguna conexión.
--
-- No borra datos. Es idempotente: se puede correr dos veces, y también después
-- de volver a pasar la foto. NO toca nada de la web de 369.


-- ════════════════════════════════════════════════════════════════════════════
-- 1) UNA CONEXIÓN DE MERCADO PAGO POR LOCAL
-- ════════════════════════════════════════════════════════════════════════════

do $una_por_local$
begin
  if exists (select 1 from public.mp_conexion group by local_id having count(*) > 1) then
    raise exception 'Hay un local con más de una conexión de Mercado Pago. Esta migración no borra ninguna: revisalo a mano (scripts/respaldar-base.mjs primero) y volvé a correrla.';
  end if;
end $una_por_local$;

-- Desde la Fase 1 (0006) `local_id` tenía "Roble" por defecto, y la 0009 lo
-- dejó solo en esta tabla. Ahora el código dice siempre de qué local es.
alter table public.mp_conexion alter column local_id drop default;
alter table public.mp_conexion alter column local_id set not null;

do $unica$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'mp_conexion_un_local' and conrelid = 'public.mp_conexion'::regclass) then
    alter table public.mp_conexion add constraint mp_conexion_un_local unique (local_id);
  end if;
end $unica$;

-- Con qué cuenta se conectó: lo devuelve Mercado Pago (/users/me) al conectar.
alter table public.mp_conexion add column if not exists mp_nickname text;
alter table public.mp_conexion add column if not exists mp_email text;

-- Solo el servidor (service_role). La foto le había dejado todo a la clave
-- pública y a las sesiones; RLS sin políticas igual las frenaba.
revoke all on table public.mp_conexion from public, anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- 2) LA SEÑA PUEDE QUEDAR "DEVUELTA"
-- ════════════════════════════════════════════════════════════════════════════
-- Conserva el nombre de la regla de la foto: así, al volver a pasar la foto en
-- desarrollo, la foto la encuentra y no vuelve a crear la vieja.

alter table public.turnos drop constraint if exists turnos_sena_estado_check;
alter table public.turnos add constraint turnos_sena_estado_check
  check (sena_estado in ('pendiente', 'pagada', 'devuelta'));


-- ════════════════════════════════════════════════════════════════════════════
-- 3) LA CAJA: LO QUE ANOTA EL SISTEMA PUEDE NO TENER PERSONA
-- ════════════════════════════════════════════════════════════════════════════

alter table public.transacciones alter column created_by drop not null;
alter table public.transacciones drop constraint if exists transacciones_manual_con_persona;
alter table public.transacciones add constraint transacciones_manual_con_persona
  check (origen <> 'manual' or created_by is not null);

-- Cuánto stock se descontó de verdad al cobrar cada renglón (ver la función c).
-- Vacío = todavía no se cobró, o se cobró antes de esta migración.
alter table public.items_pedido add column if not exists stock_descontado integer;


-- ════════════════════════════════════════════════════════════════════════════
-- 4) APLICAR UN PAGO YA VERIFICADO
-- ════════════════════════════════════════════════════════════════════════════
-- Las llama el servidor después de consultar el pago a Mercado Pago con la
-- cuenta del local (src/lib/cobros.ts). Devuelven en una palabra qué pasó, para
-- que el servidor lo anote en su registro.
--
-- "security invoker": corren con los permisos de quien las llama (el servidor,
-- que no pasa por RLS). Si alguna vez alguien más pudiera llamarlas, RLS
-- seguiría valiendo. Igual nadie más puede: ver los permisos al final.
--
-- "for update" traba la fila mientras dura la operación: si llegan dos avisos
-- del mismo pago a la vez, el segundo espera al primero, y después ve que ya
-- estaba hecho.
--
-- Un peso de tolerancia en los montos: Postgres y Mercado Pago pueden redondear
-- distinto los centavos, y eso no es un fraude (mismo criterio que Código Rojo).

-- a. La seña de un turno quedó cobrada.
create or replace function public.confirmar_pago_sena(p_local uuid, p_turno uuid, p_pago text, p_monto numeric)
returns text language plpgsql security invoker set search_path = ''
as $$
declare
  t record;
begin
  select id, estado, sena_estado, sena_monto into t
    from public.turnos
   where id = p_turno and local_id = p_local
     for update;
  if not found then return 'no_existe'; end if;
  if t.sena_estado = 'pagada' then return 'ya_estaba'; end if;
  if t.sena_estado = 'devuelta' then return 'ya_devuelta'; end if;
  if abs(coalesce(t.sena_monto, 0) - p_monto) > 1 then return 'monto_distinto'; end if;

  -- La seña pagada confirma el turno, salvo que el cliente lo haya cancelado
  -- mientras pagaba: la plata entró igual, y eso se avisa para revisarlo.
  update public.turnos
     set sena_estado = 'pagada',
         mp_payment_id = p_pago,
         estado = case when estado = 'pendiente' then 'confirmado' else estado end
   where id = p_turno;

  return case when t.estado = 'cancelado' then 'pagada_turno_cancelado' else 'confirmada' end;
end;
$$;

-- b. El local devolvió la seña desde su Mercado Pago. El turno no se toca: el
--    dueño decide si lo cancela.
create or replace function public.devolver_pago_sena(p_local uuid, p_turno uuid, p_pago text)
returns text language plpgsql security invoker set search_path = ''
as $$
declare
  t record;
begin
  select id, sena_estado, mp_payment_id into t
    from public.turnos
   where id = p_turno and local_id = p_local
     for update;
  if not found then return 'no_existe'; end if;
  if t.sena_estado = 'devuelta' then return 'ya_estaba'; end if;
  -- Solo se devuelve el pago con el que se confirmó la seña.
  if t.sena_estado is distinct from 'pagada' or t.mp_payment_id is distinct from p_pago then
    return 'no_corresponde';
  end if;

  update public.turnos set sena_estado = 'devuelta' where id = p_turno;
  return 'devuelta';
end;
$$;

-- c. Un pedido de la tienda quedó cobrado: queda pagado, se descuenta el stock
--    y entra a la caja. Todo junto o nada.
create or replace function public.confirmar_pago_pedido(p_local uuid, p_pedido uuid, p_pago text, p_monto numeric)
returns text language plpgsql security invoker set search_path = ''
as $$
declare
  pe record;
  it record;
  v_suma numeric;
  v_stock integer;
  v_toma integer;
  v_faltaba boolean := false;
  v_hoy date;
begin
  select id, estado, total into pe
    from public.pedidos
   where id = p_pedido and local_id = p_local
     for update;
  if not found then return 'no_existe'; end if;
  if pe.estado <> 'pendiente' then return 'ya_estaba'; end if;

  -- Lo cobrado tiene que ser el total del pedido, y el total, la suma de sus
  -- renglones al precio del momento de la compra.
  select coalesce(sum(precio * cantidad), 0) into v_suma
    from public.items_pedido where pedido_id = p_pedido;
  if abs(pe.total - p_monto) > 1 or abs(pe.total - v_suma) > 1 then return 'monto_distinto'; end if;

  update public.pedidos set estado = 'pagado', mp_payment_id = p_pago where id = p_pedido;

  -- El stock baja recién cuando entra la plata. Si mientras tanto otro se llevó
  -- el último, el pago queda registrado igual (la plata ya entró) y se avisa:
  -- el dueño decide si repone o devuelve. El stock nunca queda negativo, y
  -- cada renglón anota cuánto se descontó de verdad, para que una devolución
  -- reponga eso y no más. Se traba de a un producto, siempre en el mismo orden,
  -- para que dos pagos a la vez no se traben entre sí.
  for it in
    select i.id, i.producto_id, i.cantidad
      from public.items_pedido i
     where i.pedido_id = p_pedido
     order by i.producto_id, i.id
  loop
    select stock into v_stock
      from public.productos
     where id = it.producto_id and local_id = p_local
       for update;
    if not found then
      v_faltaba := true; -- el producto ya no existe
      continue;
    end if;
    v_toma := least(it.cantidad, v_stock);
    if v_toma < it.cantidad then v_faltaba := true; end if;
    update public.productos set stock = stock - v_toma where id = it.producto_id;
    update public.items_pedido set stock_descontado = v_toma where id = it.id;
  end loop;

  -- La caja, con la fecha en la hora del local (no la del servidor).
  select (now() at time zone l.zona_horaria)::date into v_hoy from public.locales l where l.id = p_local;
  insert into public.transacciones (local_id, tipo, categoria, monto, descripcion, fecha, origen, pedido_id, created_by)
  values (p_local, 'ingreso', 'productos', pe.total,
          'Pedido #' || upper(left(p_pedido::text, 8)) || ' — tienda online',
          coalesce(v_hoy, current_date), 'pedido', p_pedido, null);

  return case when v_faltaba then 'confirmado_sin_stock' else 'confirmado' end;
end;
$$;

-- d. El local devolvió un pedido desde su Mercado Pago: se cancela, el stock
--    vuelve y la salida queda en la caja. Si ya se había enviado, no se toca:
--    la mercadería salió y alguien lo tiene que mirar.
create or replace function public.devolver_pago_pedido(p_local uuid, p_pedido uuid, p_pago text)
returns text language plpgsql security invoker set search_path = ''
as $$
declare
  pe record;
  it record;
  v_hoy date;
begin
  select id, estado, total, mp_payment_id into pe
    from public.pedidos
   where id = p_pedido and local_id = p_local
     for update;
  if not found then return 'no_existe'; end if;
  if pe.estado = 'cancelado' then return 'ya_estaba'; end if;
  if pe.estado = 'enviado' then return 'revisar_enviado'; end if;
  if pe.estado is distinct from 'pagado' or pe.mp_payment_id is distinct from p_pago then
    return 'no_corresponde';
  end if;

  update public.pedidos set estado = 'cancelado' where id = p_pedido;

  -- Vuelve lo que se descontó al cobrar. Un pedido pagado antes de esta
  -- migración nunca descontó stock (no anotó nada), así que no repone nada.
  for it in
    select i.id, i.producto_id, coalesce(i.stock_descontado, 0) as devuelve
      from public.items_pedido i
     where i.pedido_id = p_pedido
     order by i.producto_id, i.id
  loop
    if it.devuelve > 0 then
      update public.productos set stock = stock + it.devuelve
       where id = it.producto_id and local_id = p_local;
      update public.items_pedido set stock_descontado = 0 where id = it.id;
    end if;
  end loop;

  select (now() at time zone l.zona_horaria)::date into v_hoy from public.locales l where l.id = p_local;
  insert into public.transacciones (local_id, tipo, categoria, monto, descripcion, fecha, origen, pedido_id, created_by)
  values (p_local, 'egreso', 'productos', pe.total,
          'Devolución del pedido #' || upper(left(p_pedido::text, 8)) || ' — tienda online',
          coalesce(v_hoy, current_date), 'pedido', p_pedido, null);

  return 'devuelto';
end;
$$;

-- Solo el servidor. "public" también: Postgres le da permiso de usar cualquier
-- función nueva a todo el mundo, y Supabase además a anon y authenticated.
do $solo_servidor$
declare f text;
begin
  foreach f in array array[
    'public.confirmar_pago_sena(uuid, uuid, text, numeric)',
    'public.devolver_pago_sena(uuid, uuid, text)',
    'public.confirmar_pago_pedido(uuid, uuid, text, numeric)',
    'public.devolver_pago_pedido(uuid, uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $solo_servidor$;
