-- 0014_alta_de_locales.sql
-- Fase 6: dar de alta locales desde el panel de la plataforma.
--
-- QUÉ HACE
--   1. Seis funciones para la plataforma. Cada una revisa quién la llama (no
--      alcanza con que la pantalla esconda el botón):
--      - crear_local: crea una muestra con su plantilla (servicios, profesionales
--        y horario), todo junto: o se crea entero, o nada. Solo el equipo.
--      - activar_local: muestra → activo. Pide un dueño, borra lo de prueba
--        (turnos, pedidos, caja y la lista de clientes de prueba) y anota quién
--        y cuándo. Solo el equipo.
--      - cambiar_estado_local: muestra ↔ archivada (el equipo) y activo ↔
--        suspendido (solo el admin). Ningún otro cambio.
--      - sumar_dueno / quitar_dueno: en una muestra, el equipo; en un local
--        activo (o suspendido, o archivado), solo el admin. Una cuenta del
--        equipo no puede ser dueña: si no, la comercial podría hacerse dueña y
--        ver lo privado de un local activo.
--      - resumen_de_locales: la lista de la plataforma, con lo que le falta a
--        cada local. Solo el equipo; los mails de los dueños de un local activo,
--        solo el admin.
--   2. La guardia de `locales` se ajusta: desde el navegador NADIE cambia el
--      estado ni el registro de alta (ni siquiera el equipo): solo estas
--      funciones. Así no se puede activar un local sin pasar por la activación,
--      que es la que borra lo de prueba. La dirección web la cambia solo el admin.
--   3. Un local se crea solo con crear_local: se saca el permiso de crearlo
--      "a mano" (la política de la 0007 y el permiso de la 0006).
--
-- Cómo corren las funciones: "security definer" (con los permisos de su dueño,
-- porque tocan membresías, que nadie escribe desde el navegador), con
-- search_path vacío y los nombres completos (public.xxx). Adentro, la guardia
-- de locales no las frena: corren como el dueño de la base, no como
-- authenticated.
--
-- No borra datos (activar_local borra datos de prueba, pero solo cuando alguien
-- activa un local). Es idempotente. NO toca nada de la web de 369.


-- ════════════════════════════════════════════════════════════════════════════
-- 1) CREAR UNA MUESTRA
-- ════════════════════════════════════════════════════════════════════════════
-- p_datos: lo que haya a mano ({ whatsapp, instagram, direccion, ciudad }).
-- p_servicios: [{ nombre, descripcion, precio, duracion }] (la plantilla del
--   rubro: la arma la app, src/lib/plantillas.ts).
-- p_profesionales: [{ nombre, apellido }].
-- La plantilla llega de la app a propósito: el equipo ya puede cargar el
-- catálogo de cualquier local (Fase 2), así que esto no le da ningún poder nuevo.

create or replace function public.crear_local(
  p_nombre text, p_slug text, p_rubro text,
  p_datos jsonb, p_servicios jsonb, p_profesionales jsonb
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_regla text;
  s jsonb;
  v_precio numeric;
  v_duracion integer;
begin
  if not public.es_equipo() then
    raise exception 'Solo el equipo de la plataforma crea locales.' using errcode = '42501';
  end if;
  if char_length(v_nombre) not between 2 and 80 then
    raise exception 'El nombre tiene que tener entre 2 y 80 letras.';
  end if;
  if jsonb_typeof(coalesce(p_servicios, '[]')) <> 'array' or jsonb_array_length(coalesce(p_servicios, '[]')) > 30
     or jsonb_typeof(coalesce(p_profesionales, '[]')) <> 'array' or jsonb_array_length(coalesce(p_profesionales, '[]')) > 30 then
    raise exception 'La plantilla llegó con un formato inválido.';
  end if;

  begin
    insert into public.locales (slug, nombre, rubro, estado, creado_por, whatsapp, instagram, direccion, ciudad)
    values (
      lower(btrim(coalesce(p_slug, ''))), v_nombre, coalesce(p_rubro, 'barberia'), 'demo', auth.uid(),
      nullif(left(btrim(coalesce(p_datos ->> 'whatsapp', '')), 20), ''),
      nullif(left(btrim(coalesce(p_datos ->> 'instagram', '')), 40), ''),
      nullif(left(btrim(coalesce(p_datos ->> 'direccion', '')), 120), ''),
      nullif(left(btrim(coalesce(p_datos ->> 'ciudad', '')), 80), '')
    )
    returning id into v_id;
  exception
    when unique_violation then
      raise exception 'La dirección web "%" ya es de otro local.', lower(btrim(p_slug));
    when check_violation then
      get stacked diagnostics v_regla = constraint_name;
      if v_regla = 'locales_slug_no_reservado' then
        raise exception 'La dirección web "%" está reservada para la plataforma: elegí otra.', lower(btrim(p_slug));
      elsif v_regla = 'locales_slug_formato' then
        raise exception 'La dirección web va en minúsculas, números y guiones (entre 2 y 40).';
      elsif v_regla = 'locales_rubro_check' then
        raise exception 'Ese rubro no existe.';
      end if;
      raise;
  end;

  for s in select * from jsonb_array_elements(coalesce(p_servicios, '[]')) loop
    begin
      v_precio := (s ->> 'precio')::numeric;
      v_duracion := (s ->> 'duracion')::integer;
    exception when others then
      raise exception 'Un servicio de la plantilla tiene un precio o una duración inválida.';
    end;
    if btrim(coalesce(s ->> 'nombre', '')) = '' or v_precio is null or v_precio < 0
       or v_duracion is null or v_duracion not between 5 and 600 then
      raise exception 'Un servicio de la plantilla está incompleto.';
    end if;
    insert into public.servicios (local_id, nombre, descripcion, precio, duracion_minutos)
    values (v_id, left(btrim(s ->> 'nombre'), 80), left(btrim(coalesce(s ->> 'descripcion', '')), 300), v_precio, v_duracion);
  end loop;

  for s in select * from jsonb_array_elements(coalesce(p_profesionales, '[]')) loop
    if btrim(coalesce(s ->> 'nombre', '')) = '' then
      raise exception 'Un profesional de la plantilla no tiene nombre.';
    end if;
    insert into public.barberos (local_id, nombre, apellido)
    values (v_id, left(btrim(s ->> 'nombre'), 60), left(btrim(coalesce(s ->> 'apellido', '')), 60));
  end loop;

  -- La plantilla de horario: lunes (1) a sábado (6), de 10 a 20.
  insert into public.horarios (local_id, barbero_id, dia_semana, desde, hasta)
  select v_id, null, d, '10:00', '20:00' from generate_series(1, 6) as d;

  return v_id;
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 2) ACTIVAR
-- ════════════════════════════════════════════════════════════════════════════
-- Devuelve cuánto de prueba se borró, para mostrarlo.

create or replace function public.activar_local(p_local uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_estado text;
  n_caja integer; n_pedidos integer; n_turnos integer; n_clientes integer;
begin
  if not public.es_equipo() then
    raise exception 'Solo el equipo de la plataforma activa locales.' using errcode = '42501';
  end if;
  -- "for update": si dos personas tocan Activar a la vez, la segunda espera y
  -- después ve que ya está activo.
  select l.estado into v_estado from public.locales l where l.id = p_local for update;
  if not found then
    raise exception 'Ese local no existe.';
  end if;
  if v_estado <> 'demo' then
    raise exception 'Solo se activa un local que está en muestra.';
  end if;
  if not exists (select 1 from public.membresias m where m.local_id = p_local and m.rol = 'dueno') then
    raise exception 'Antes de activar, sumá al dueño: si no, nadie puede administrar el local.';
  end if;

  -- Lo de prueba. La caja primero (apunta a turnos y pedidos); los renglones
  -- de cada pedido se van con su pedido.
  delete from public.transacciones where local_id = p_local;
  get diagnostics n_caja = row_count;
  delete from public.pedidos where local_id = p_local;
  get diagnostics n_pedidos = row_count;
  delete from public.turnos where local_id = p_local;
  get diagnostics n_turnos = row_count;
  delete from public.membresias where local_id = p_local and rol = 'cliente';
  get diagnostics n_clientes = row_count;

  update public.locales
     set estado = 'activo', activado_por = auth.uid(), activado_en = now()
   where id = p_local;

  return jsonb_build_object('turnos', n_turnos, 'pedidos', n_pedidos, 'movimientos', n_caja, 'clientes', n_clientes);
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 3) LOS OTROS CAMBIOS DE ESTADO
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.cambiar_estado_local(p_local uuid, p_estado text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_estado text;
begin
  if not public.es_equipo() then
    raise exception 'Solo el equipo de la plataforma cambia el estado de un local.' using errcode = '42501';
  end if;
  select l.estado into v_estado from public.locales l where l.id = p_local for update;
  if not found then
    raise exception 'Ese local no existe.';
  end if;
  if v_estado = p_estado then
    return v_estado;
  end if;

  if (v_estado, p_estado) in (('demo', 'archivado'), ('archivado', 'demo')) then
    null; -- archivar una muestra que no se vendió, o revivirla: el equipo
  elsif (v_estado, p_estado) in (('activo', 'suspendido'), ('suspendido', 'activo')) then
    -- Cortarle el sitio a un local que paga (o devolvérselo): solo el admin.
    if not public.es_equipo(array['admin']) then
      raise exception 'Suspender o reactivar un local lo hace solo el admin.' using errcode = '42501';
    end if;
  elsif v_estado = 'demo' and p_estado = 'activo' then
    raise exception 'Para activar una muestra, usá Activar (borra lo de prueba).';
  else
    raise exception 'Un local no puede pasar de % a %.', v_estado, p_estado;
  end if;

  update public.locales set estado = p_estado where id = p_local;
  return p_estado;
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 4) LOS DUEÑOS
-- ════════════════════════════════════════════════════════════════════════════
-- La cuenta la crea (o la encuentra por el mail) el servidor de la app: acá
-- solo se decide si quien llama puede sumarla o sacarla.

create or replace function public.puede_manejar_duenos(p_local uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.es_equipo(array['admin'])
      or (public.es_equipo(array['comercial'])
          and exists (select 1 from public.locales l where l.id = p_local and l.estado = 'demo'));
$$;

create or replace function public.sumar_dueno(p_local uuid, p_usuario uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.locales l where l.id = p_local) then
    raise exception 'Ese local no existe.';
  end if;
  if not public.puede_manejar_duenos(p_local) then
    raise exception 'En un local que ya no es una muestra, los dueños los maneja solo el admin.' using errcode = '42501';
  end if;
  if exists (select 1 from public.equipo e where e.user_id = p_usuario) then
    raise exception 'Una cuenta del equipo de la plataforma no puede ser dueña de un local.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_usuario) then
    raise exception 'Esa cuenta no existe.';
  end if;
  insert into public.membresias (user_id, local_id, rol)
  values (p_usuario, p_local, 'dueno')
  on conflict (user_id, local_id, rol) do nothing;
end;
$$;

create or replace function public.quitar_dueno(p_local uuid, p_usuario uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.puede_manejar_duenos(p_local) then
    raise exception 'En un local que ya no es una muestra, los dueños los maneja solo el admin.' using errcode = '42501';
  end if;
  delete from public.membresias
   where local_id = p_local and user_id = p_usuario and rol = 'dueno';
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 5) EL RESUMEN DE LA PLATAFORMA
-- ════════════════════════════════════════════════════════════════════════════
-- Una fila por local, con lo que hace falta para saber qué le falta. Solo
-- cuentas y sí/no: nada de los datos privados de un local activo (los turnos de
-- prueba se cuentan solo en las muestras).
--
-- Los dueños: con su mail y si ya entraron alguna vez (para saber si se le
-- puede sacar otro link). En un local activo, solo los ve el admin.
--
-- Se borra antes de crearla: si algún día cambia lo que devuelve, "create or
-- replace" no puede cambiar esa forma. Es código, no datos.
drop function if exists public.resumen_de_locales();
create function public.resumen_de_locales()
returns table (
  id uuid, slug text, nombre text, estado text, rubro text,
  creado_en timestamptz, creado_por text, activado_en timestamptz,
  servicios integer, profesionales integer, tramos_horario integer,
  tiene_whatsapp boolean, tiene_direccion boolean,
  duenos integer, duenos_detalle jsonb, mp_conectado boolean, turnos_de_prueba integer
)
language sql stable security definer set search_path = ''
as $$
  select l.id, l.slug, l.nombre, l.estado, l.rubro,
         l.created_at, nullif(btrim(concat_ws(' ', pc.nombre, pc.apellido)), ''), l.activado_en,
         (select count(*)::integer from public.servicios s where s.local_id = l.id and s.activo),
         (select count(*)::integer from public.barberos b where b.local_id = l.id and b.activo),
         (select count(*)::integer from public.horarios h where h.local_id = l.id and h.barbero_id is null),
         coalesce(l.whatsapp, '') <> '', coalesce(l.direccion, '') <> '',
         (select count(*)::integer from public.membresias m where m.local_id = l.id and m.rol = 'dueno'),
         case when public.es_equipo(array['admin']) or l.estado = 'demo' then
           coalesce((select jsonb_agg(jsonb_build_object(
                              'id', p.id, 'email', p.email,
                              'nombre', btrim(concat_ws(' ', p.nombre, p.apellido)),
                              'entro', u.last_sign_in_at is not null) order by p.email)
                       from public.membresias m
                       join public.profiles p on p.id = m.user_id
                       left join auth.users u on u.id = m.user_id
                      where m.local_id = l.id and m.rol = 'dueno'), '[]'::jsonb)
         end,
         exists (select 1 from public.mp_conexion c where c.local_id = l.id),
         case when l.estado = 'demo' then
           (select count(*)::integer from public.turnos t where t.local_id = l.id)
         end
    from public.locales l
    left join public.profiles pc on pc.id = l.creado_por
   where public.es_equipo()
   order by l.created_at desc;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 6) QUIÉN PUEDE USARLAS
-- ════════════════════════════════════════════════════════════════════════════
-- Solo alguien con sesión (adentro, cada una revisa si es del equipo). Nadie
-- sin cuenta.

do $permisos$
declare f text;
begin
  foreach f in array array[
    'public.crear_local(text, text, text, jsonb, jsonb, jsonb)',
    'public.activar_local(uuid)',
    'public.cambiar_estado_local(uuid, text)',
    'public.puede_manejar_duenos(uuid)',
    'public.sumar_dueno(uuid, uuid)',
    'public.quitar_dueno(uuid, uuid)',
    'public.resumen_de_locales()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $permisos$;


-- ════════════════════════════════════════════════════════════════════════════
-- 7) LA GUARDIA DE LOCALES, AJUSTADA
-- ════════════════════════════════════════════════════════════════════════════
-- Antes: el equipo podía cambiar cualquier cosa de un local desde el navegador.
-- Ahora: el estado y el registro de alta (quién lo creó y quién lo activó) no
-- los cambia nadie desde el navegador; solo las funciones de arriba. La
-- dirección web, solo el admin (cambiarla rompe los links que ya se mandaron).

create or replace function public.guardia_locales()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.estado is distinct from old.estado
     or new.creado_por is distinct from old.creado_por
     or new.activado_por is distinct from old.activado_por
     or new.activado_en is distinct from old.activado_en
     or new.created_at is distinct from old.created_at then
    raise exception 'El estado y el registro de alta de un local se cambian solo desde la plataforma.'
      using errcode = '42501';
  end if;
  if new.slug is distinct from old.slug and not public.es_equipo(array['admin']) then
    raise exception 'La dirección web de un local la cambia solo el admin.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 8) UN LOCAL SE CREA SOLO CON crear_local
-- ════════════════════════════════════════════════════════════════════════════
drop policy if exists "locales: crea el equipo" on public.locales;
revoke insert on table public.locales from authenticated;
