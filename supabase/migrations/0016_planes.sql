-- 0016_planes.sql
-- Fase 7: los planes (Básico, Pro, Premium), en la base.
--
-- QUÉ HACE
--   1. La tabla `planes`: qué trae cada uno (la tabla v2 aprobada por Nico el
--      29/10/2026). Es la ÚNICA fuente: la app la lee, no la copia.
--   2. Cada local tiene su plan (`locales.plan`). Una muestra nueva nace en
--      Premium (para mostrar todo); el plan se elige al activarla.
--   3. plan_permite(local, capacidad): sí o no. La usan las reglas de abajo.
--   4. Los datos públicos de un local (datos_del_local) suman su plan y qué
--      trae, así cada página sabe qué mostrar sin otra consulta.
--   5. Los candados, EN LA BASE (no alcanza con esconder botones):
--      - Profesionales activos: hasta 2 (Básico), 5 (Pro), sin límite (Premium).
--      - Cuenta propia de cada profesional: Pro en adelante. Si un local baja
--        de plan, la cuenta queda guardada pero sin acceso a su agenda.
--      - Conectar Mercado Pago (las señas): Pro en adelante.
--      - Las reseñas se ven en la web: Pro en adelante.
--      - La tienda (productos y categorías a la vista, pedidos nuevos):
--        Premium.
--      - La caja (finanzas): Premium.
--   6. Reseñas verificadas: las deja un cliente con un turno que ya pasó
--      (dejar_resena). El dueño las puede ocultar, no editar ni borrar. Las
--      cargadas a mano solo en las muestras (activar las borra, como lo demás
--      de prueba).
--   7. "No vino": una marca en el turno, para los reportes.
--   8. Reportes (Pro en adelante): turnos, cancelados, los que no vinieron,
--      por mes, por profesional y por servicio, y lo que se facturó.
--   9. El plan se cambia solo con funciones: al activar (con el plan elegido),
--      y después con cambiar_plan (en una muestra, el equipo, para mostrarla en
--      cada plan; en un local activo, solo el admin).
--
-- Bajar de plan NO borra nada: esconde lo que el plan nuevo no trae y no deja
-- crear más de lo que permite. Los profesionales de más hay que desactivarlos
-- antes de pasar a un plan más chico (lo pide cambiar_plan): así elige el dueño
-- cuáles siguen.
--
-- No borra datos (activar_local borra lo de prueba de ESE local, como antes,
-- y ahora también sus reseñas cargadas a mano). Es idempotente. NO toca nada
-- de la web de 369.


-- ════════════════════════════════════════════════════════════════════════════
-- 1) LOS PLANES
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.planes (
  codigo text primary key check (codigo in ('basico', 'pro', 'premium')),
  nombre text not null,
  orden integer not null unique,
  precio_usd integer not null,
  -- null: sin límite
  max_profesionales integer check (max_profesionales is null or max_profesionales > 0),
  cuentas_profesionales boolean not null,
  senas boolean not null,
  resenas boolean not null,
  reportes boolean not null,
  tienda boolean not null,
  finanzas boolean not null,
  exportar boolean not null
);

comment on table public.planes is
  'Qué trae cada plan (Fase 7). La app la lee; se cambia solo con una migración. Precios: hipótesis a validar con los primeros locales.';

insert into public.planes as p (codigo, nombre, orden, precio_usd, max_profesionales,
                                cuentas_profesionales, senas, resenas, reportes, tienda, finanzas, exportar)
values ('basico',  'Básico',  1, 19, 2,    false, false, false, false, false, false, true),
       ('pro',     'Pro',     2, 35, 5,    true,  true,  true,  true,  false, false, true),
       ('premium', 'Premium', 3, 59, null, true,  true,  true,  true,  true,  true,  true)
on conflict (codigo) do update
   set nombre = excluded.nombre, orden = excluded.orden, precio_usd = excluded.precio_usd,
       max_profesionales = excluded.max_profesionales,
       cuentas_profesionales = excluded.cuentas_profesionales, senas = excluded.senas,
       resenas = excluded.resenas, reportes = excluded.reportes, tienda = excluded.tienda,
       finanzas = excluded.finanzas, exportar = excluded.exportar;

alter table public.planes enable row level security;
drop policy if exists "planes: los ve cualquiera" on public.planes;
create policy "planes: los ve cualquiera" on public.planes for select using (true);
-- Solo leer: nadie los cambia desde afuera (ni el equipo: es una migración).
revoke all on table public.planes from public, anon, authenticated;
grant select on table public.planes to anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- 2) EL PLAN DE CADA LOCAL
-- ════════════════════════════════════════════════════════════════════════════
alter table public.locales
  add column if not exists plan text not null default 'premium' references public.planes (codigo);

comment on column public.locales.plan is
  'El plan del local (Fase 7). Una muestra nace en Premium; se elige al activar. Se cambia solo con activar_local o cambiar_plan.';


-- ════════════════════════════════════════════════════════════════════════════
-- 3) ¿EL PLAN DE ESTE LOCAL TRAE ESTO?
-- ════════════════════════════════════════════════════════════════════════════
-- Pública a propósito: el plan de un local no es secreto (su web lo muestra),
-- y las reglas de las tablas la usan con la sesión de quien consulta.
create or replace function public.plan_permite(p_local uuid, p_capacidad text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select case p_capacidad
             when 'cuentas_profesionales' then pl.cuentas_profesionales
             when 'senas' then pl.senas
             when 'resenas' then pl.resenas
             when 'reportes' then pl.reportes
             when 'tienda' then pl.tienda
             when 'finanzas' then pl.finanzas
             when 'exportar' then pl.exportar
           end
      from public.locales l
      join public.planes pl on pl.codigo = l.plan
     where l.id = p_local), false);
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 4) LOS DATOS PÚBLICOS DE UN LOCAL, CON SU PLAN
-- ════════════════════════════════════════════════════════════════════════════
-- Igual que en la 0010, más el plan y qué trae. Se borra antes de crearla
-- porque cambia lo que devuelve.
drop function if exists public.datos_del_local(text);
create function public.datos_del_local(p_slug text)
returns table (
  id uuid, slug text, nombre text, estado text, rubro text,
  nombre_corto text, lema text, descripcion text,
  direccion text, ciudad text, mapa_query text, email text,
  whatsapp text, whatsapp_mensaje text, instagram text, tiktok text,
  alias_pago text, sena_porcentaje integer, medios_pago text[],
  anticipacion_minutos integer, dias_reserva integer, zona_horaria text,
  plan text, plan_nombre text, max_profesionales integer,
  cuentas_profesionales boolean, senas boolean, resenas boolean, reportes boolean,
  tienda boolean, finanzas boolean, exportar boolean
)
language sql stable security definer set search_path = ''
as $$
  select l.id, l.slug, l.nombre, l.estado, l.rubro,
         l.nombre_corto, l.lema, l.descripcion,
         l.direccion, l.ciudad, l.mapa_query, l.email,
         l.whatsapp, l.whatsapp_mensaje, l.instagram, l.tiktok,
         l.alias_pago, l.sena_porcentaje, l.medios_pago,
         l.anticipacion_minutos, l.dias_reserva, l.zona_horaria,
         pl.codigo, pl.nombre, pl.max_profesionales,
         pl.cuentas_profesionales, pl.senas, pl.resenas, pl.reportes,
         pl.tienda, pl.finanzas, pl.exportar
    from public.locales l
    join public.planes pl on pl.codigo = l.plan
   where l.slug = lower(p_slug);
$$;
revoke all on function public.datos_del_local(text) from public, anon, authenticated, service_role;
grant execute on function public.datos_del_local(text) to anon, authenticated, service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- 5) LOS CANDADOS
-- ════════════════════════════════════════════════════════════════════════════

-- 5a) Profesionales activos. Frena dar de alta o reactivar uno de más; los que
-- ya están no se tocan. "for update" sobre el local: si dos altas llegan a la
-- vez, la segunda espera y cuenta la primera.
create or replace function public.limite_de_profesionales()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_max integer;
  v_plan text;
  v_activos integer;
begin
  if not new.activo then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.activo and old.local_id = new.local_id then
    return new;
  end if;
  select pl.max_profesionales, pl.nombre into v_max, v_plan
    from public.locales l join public.planes pl on pl.codigo = l.plan
   where l.id = new.local_id
     for update of l;
  if v_max is null then
    return new;
  end if;
  select count(*) into v_activos
    from public.barberos b
   where b.local_id = new.local_id and b.activo and b.id <> new.id;
  if v_activos >= v_max then
    raise exception 'El plan % permite hasta % profesionales activos. Para sumar otro, desactivá uno o pasá a un plan más grande.', v_plan, v_max;
  end if;
  return new;
end;
$$;

drop trigger if exists barberos_limite_del_plan on public.barberos;
create trigger barberos_limite_del_plan
  before insert or update of activo, local_id on public.barberos
  for each row execute function public.limite_de_profesionales();

-- 5b) La cuenta propia de un profesional: Pro en adelante.
create or replace function public.cuentas_del_plan()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.rol = 'barbero' and not public.plan_permite(new.local_id, 'cuentas_profesionales') then
    raise exception 'Las cuentas propias de los profesionales son del plan Pro en adelante.';
  end if;
  return new;
end;
$$;

drop trigger if exists membresias_cuentas_del_plan on public.membresias;
create trigger membresias_cuentas_del_plan
  before insert or update of rol, local_id on public.membresias
  for each row execute function public.cuentas_del_plan();

-- Si el local bajó de plan, la cuenta del profesional queda guardada pero sin
-- acceso: no es "barbero" para los permisos ni ve su agenda.
create or replace function public.permisos_en_local(p_local uuid)
returns table (administra boolean, edita_catalogo boolean, opera_privado boolean, barbero_id uuid)
language sql stable security definer set search_path = ''
as $$
  select public.puede_administrar(p_local),
         public.puede_editar_catalogo(p_local),
         public.puede_operar_privado(p_local),
         (select m.barbero_id
            from public.membresias m
           where m.user_id = auth.uid() and m.local_id = p_local and m.rol = 'barbero'
             and public.plan_permite(p_local, 'cuentas_profesionales')
           limit 1);
$$;

create or replace function public.es_mi_agenda(p_local uuid, p_barbero uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.plan_permite(p_local, 'cuentas_profesionales')
     and exists (select 1 from public.membresias m
                  where m.user_id = auth.uid() and m.local_id = p_local
                    and m.rol = 'barbero' and m.barbero_id = p_barbero);
$$;

-- 5c) Conectar Mercado Pago: Pro en adelante. Solo al conectar (renovar el
-- token de una conexión que ya está no se frena: si el local bajó de plan, la
-- app deja de cobrar con ella, pero no se pierde).
create or replace function public.mp_del_plan()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not public.plan_permite(new.local_id, 'senas') then
    raise exception 'Cobrar señas con Mercado Pago es del plan Pro en adelante.';
  end if;
  return new;
end;
$$;

drop trigger if exists mp_conexion_del_plan on public.mp_conexion;
create trigger mp_conexion_del_plan
  before insert on public.mp_conexion
  for each row execute function public.mp_del_plan();

-- 5d) La tienda: Premium. Lo que ve el público, y los pedidos nuevos (el
-- checkout los crea con la llave del servidor: el disparador corre igual).
drop policy if exists "productos: lo ve el publico" on public.productos;
create policy "productos: lo ve el publico" on public.productos for select
  using (public.local_publico(local_id) and activo = true and public.plan_permite(local_id, 'tienda'));

drop policy if exists "categorias: lo ve el publico" on public.categorias;
create policy "categorias: lo ve el publico" on public.categorias for select
  using (public.local_publico(local_id) and public.plan_permite(local_id, 'tienda'));

create or replace function public.tienda_del_plan()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not public.plan_permite(new.local_id, 'tienda') then
    raise exception 'La tienda es del plan Premium.';
  end if;
  return new;
end;
$$;

drop trigger if exists pedidos_tienda_del_plan on public.pedidos;
create trigger pedidos_tienda_del_plan
  before insert on public.pedidos
  for each row execute function public.tienda_del_plan();

-- 5e) La caja: Premium. Los cobros que confirma la base (funciones del
-- servidor) se siguen anotando: si el local sube de plan, la caja está entera.
drop policy if exists "transacciones: la ve y la opera quien administra" on public.transacciones;
create policy "transacciones: la ve y la opera quien administra" on public.transacciones for all
  using (public.puede_administrar(local_id) and public.plan_permite(local_id, 'finanzas'))
  with check (public.puede_administrar(local_id) and public.plan_permite(local_id, 'finanzas'));

-- 5f) Las reseñas en la web: Pro en adelante.
drop policy if exists "resenas: lo ve el publico" on public.resenas;
create policy "resenas: lo ve el publico" on public.resenas for select
  using (public.local_publico(local_id) and visible = true and public.plan_permite(local_id, 'resenas'));


-- ════════════════════════════════════════════════════════════════════════════
-- 6) RESEÑAS VERIFICADAS
-- ════════════════════════════════════════════════════════════════════════════
alter table public.resenas add column if not exists turno_id uuid;
alter table public.resenas add column if not exists cliente_id uuid;

-- El candado doble de la Fase 1: la reseña apunta a un turno DE SU MISMO local
-- (local_id, turno_id), y "una por turno" va por local. Si se borra el turno,
-- la reseña queda (sin turno).
do $columnas$
begin
  if not exists (select 1 from pg_constraint where conname = 'resenas_local_id_turno_id_key' and conrelid = 'public.resenas'::regclass) then
    alter table public.resenas add constraint resenas_local_id_turno_id_key unique (local_id, turno_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'resenas_turno_id_fkey' and conrelid = 'public.resenas'::regclass) then
    alter table public.resenas add constraint resenas_turno_id_fkey
      foreign key (local_id, turno_id) references public.turnos (local_id, id) on delete set null (turno_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'resenas_cliente_id_fkey' and conrelid = 'public.resenas'::regclass) then
    alter table public.resenas add constraint resenas_cliente_id_fkey
      foreign key (cliente_id) references public.profiles (id) on delete set null;
  end if;
end $columnas$;

comment on column public.resenas.turno_id is
  'El turno del que sale la reseña (verificada). Vacío: cargada a mano, solo en una muestra.';

-- Cada cliente ve las suyas (aunque el local las oculte): así sabe qué turnos
-- ya reseñó.
drop policy if exists "resenas: el cliente ve las suyas" on public.resenas;
create policy "resenas: el cliente ve las suyas" on public.resenas for select
  using (cliente_id = auth.uid());

-- Dejar una reseña: el cliente de ese turno, una vez, cuando el turno ya pasó.
-- El nombre que se muestra es el suyo, con la inicial del apellido.
create or replace function public.dejar_resena(p_turno uuid, p_rating integer, p_texto text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_turno record;
  v_nombre text;
  v_id uuid;
  v_texto text := btrim(coalesce(p_texto, ''));
begin
  if auth.uid() is null then
    raise exception 'Entrá con tu cuenta para dejar una reseña.' using errcode = '42501';
  end if;
  select t.id, t.local_id, t.estado, t.no_vino, t.fecha, t.hora, l.zona_horaria
    into v_turno
    from public.turnos t join public.locales l on l.id = t.local_id
   where t.id = p_turno and t.cliente_id = auth.uid();
  if not found then
    raise exception 'Ese turno no es tuyo.' using errcode = '42501';
  end if;
  if not public.plan_permite(v_turno.local_id, 'resenas') then
    raise exception 'Este local no tiene reseñas.';
  end if;
  if v_turno.estado = 'cancelado' or v_turno.no_vino then
    raise exception 'Solo se puede reseñar un turno al que fuiste.';
  end if;
  if (v_turno.fecha + v_turno.hora) > (now() at time zone v_turno.zona_horaria) then
    raise exception 'La reseña se deja después del turno.';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Elegí de 1 a 5 estrellas.';
  end if;
  if char_length(v_texto) < 3 or char_length(v_texto) > 500 then
    raise exception 'Contá en pocas palabras cómo te fue (hasta 500 letras).';
  end if;
  select btrim(concat_ws(' ', nullif(btrim(p.nombre), ''),
                         case when nullif(btrim(p.apellido), '') is not null then upper(left(btrim(p.apellido), 1)) || '.' end))
    into v_nombre
    from public.profiles p where p.id = auth.uid();
  begin
    insert into public.resenas (local_id, turno_id, cliente_id, nombre, texto, rating, visible, orden)
    values (v_turno.local_id, v_turno.id, auth.uid(), coalesce(nullif(v_nombre, ''), 'Cliente'), v_texto, p_rating, true, 0)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Ya dejaste tu reseña de ese turno.';
  end;
  return v_id;
end;
$$;

-- Desde el navegador: una reseña de un cliente no se edita ni se borra (se
-- puede ocultar); las cargadas a mano, solo en una muestra. Nadie inventa una
-- "verificada" a mano.
create or replace function public.guardia_resenas()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.turno_id is not null or new.cliente_id is not null then
      raise exception 'Las reseñas de los clientes las dejan ellos, después de su turno.' using errcode = '42501';
    end if;
    if not exists (select 1 from public.locales l where l.id = new.local_id and l.estado = 'demo') then
      raise exception 'En un local activo, las reseñas las dejan los clientes después de su turno.' using errcode = '42501';
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.turno_id is not null then
      raise exception 'Una reseña de un cliente no se borra: se puede ocultar.' using errcode = '42501';
    end if;
    return old;
  end if;
  -- UPDATE
  if new.turno_id is distinct from old.turno_id or new.cliente_id is distinct from old.cliente_id
     or new.local_id is distinct from old.local_id then
    raise exception 'Una reseña no cambia de turno, de cliente ni de local.' using errcode = '42501';
  end if;
  if old.turno_id is not null
     and (new.texto is distinct from old.texto or new.rating is distinct from old.rating
          or new.nombre is distinct from old.nombre) then
    raise exception 'Una reseña de un cliente no se edita: se puede ocultar.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists resenas_guardia on public.resenas;
create trigger resenas_guardia
  before insert or update or delete on public.resenas
  for each row execute function public.guardia_resenas();


-- ════════════════════════════════════════════════════════════════════════════
-- 7) "NO VINO"
-- ════════════════════════════════════════════════════════════════════════════
-- La marca quien opera el local (la guardia de turnos ya no deja que un
-- cliente cambie nada más que cancelar).
alter table public.turnos add column if not exists no_vino boolean not null default false;


-- ════════════════════════════════════════════════════════════════════════════
-- 8) REPORTES (Pro en adelante)
-- ════════════════════════════════════════════════════════════════════════════
-- De p_desde a p_hasta (fechas del turno). "Facturado": el precio de los
-- servicios de los turnos que ya pasaron, no cancelados y en los que vino.
create or replace function public.reporte_del_local(p_local uuid, p_desde date, p_hasta date)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_hoy date;
  v_res jsonb;
begin
  if not public.puede_operar_privado(p_local) then
    raise exception 'Los reportes los ve quien opera el local.' using errcode = '42501';
  end if;
  if not public.plan_permite(p_local, 'reportes') then
    raise exception 'Los reportes son del plan Pro en adelante.';
  end if;
  select (now() at time zone l.zona_horaria)::date into v_hoy from public.locales l where l.id = p_local;

  with t as (
    select t.*, s.nombre as servicio, s.precio,
           btrim(concat_ws(' ', b.nombre, b.apellido)) as profesional,
           (t.estado <> 'cancelado' and not t.no_vino and t.fecha <= v_hoy) as hecho
      from public.turnos t
      join public.servicios s on s.id = t.servicio_id
      join public.barberos b on b.id = t.barbero_id
     where t.local_id = p_local and t.fecha between p_desde and p_hasta
  )
  select jsonb_build_object(
    'totales', (select jsonb_build_object(
                  'turnos', count(*),
                  'cancelados', count(*) filter (where estado = 'cancelado'),
                  'no_vinieron', count(*) filter (where no_vino),
                  'hechos', count(*) filter (where hecho),
                  'facturado', coalesce(sum(precio) filter (where hecho), 0))
                from t),
    'por_mes', coalesce((select jsonb_agg(x order by x->>'mes') from (
                  select jsonb_build_object('mes', to_char(fecha, 'YYYY-MM'),
                           'turnos', count(*),
                           'cancelados', count(*) filter (where estado = 'cancelado'),
                           'no_vinieron', count(*) filter (where no_vino),
                           'facturado', coalesce(sum(precio) filter (where hecho), 0)) as x
                    from t group by to_char(fecha, 'YYYY-MM')) m), '[]'::jsonb),
    'por_profesional', coalesce((select jsonb_agg(x order by (x->>'turnos')::int desc) from (
                  select jsonb_build_object('nombre', profesional,
                           'turnos', count(*) filter (where estado <> 'cancelado'),
                           'no_vinieron', count(*) filter (where no_vino),
                           'facturado', coalesce(sum(precio) filter (where hecho), 0)) as x
                    from t group by profesional) p), '[]'::jsonb),
    'por_servicio', coalesce((select jsonb_agg(x order by (x->>'turnos')::int desc) from (
                  select jsonb_build_object('nombre', servicio,
                           'turnos', count(*) filter (where estado <> 'cancelado'),
                           'facturado', coalesce(sum(precio) filter (where hecho), 0)) as x
                    from t group by servicio) s), '[]'::jsonb)
  ) into v_res;
  return v_res;
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 9) CAMBIAR EL PLAN
-- ════════════════════════════════════════════════════════════════════════════
-- ¿Este local puede pasar a este plan? (sus profesionales activos entran)
create or replace function public.revisar_cambio_de_plan(p_local uuid, p_plan text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_max integer;
  v_nombre text;
  v_activos integer;
begin
  select pl.max_profesionales, pl.nombre into v_max, v_nombre from public.planes pl where pl.codigo = p_plan;
  if not found then
    raise exception 'Ese plan no existe.';
  end if;
  select count(*) into v_activos from public.barberos b where b.local_id = p_local and b.activo;
  if v_max is not null and v_activos > v_max then
    raise exception 'El plan % permite hasta % profesionales activos y este local tiene %: desactivá los que sobran antes (en su panel, %).',
      v_nombre, v_max, v_activos, 'Profesionales';
  end if;
end;
$$;
revoke all on function public.revisar_cambio_de_plan(uuid, text) from public, anon, authenticated, service_role;

-- En una muestra, el equipo (para mostrarla en cada plan: no revisa los
-- profesionales, la muestra es para mirar). En un local activo o suspendido,
-- solo el admin (es lo que se cobra), y revisa que entren los profesionales.
create or replace function public.cambiar_plan(p_local uuid, p_plan text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_estado text;
begin
  if not public.es_equipo() then
    raise exception 'Solo el equipo de la plataforma cambia el plan de un local.' using errcode = '42501';
  end if;
  select l.estado into v_estado from public.locales l where l.id = p_local for update;
  if not found then
    raise exception 'Ese local no existe.';
  end if;
  if not exists (select 1 from public.planes where codigo = p_plan) then
    raise exception 'Ese plan no existe.';
  end if;
  if v_estado in ('activo', 'suspendido') then
    if not public.es_equipo(array['admin']) then
      raise exception 'El plan de un local activo lo cambia solo el admin.' using errcode = '42501';
    end if;
    perform public.revisar_cambio_de_plan(p_local, p_plan);
  end if;
  update public.locales set plan = p_plan where id = p_local;
  return p_plan;
end;
$$;

-- Activar con el plan elegido. La de un solo dato (la que llama el código de
-- la Fase 6, mientras se publica la 7) activa con el plan que ya tiene.
create or replace function public.activar_local(p_local uuid, p_plan text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_estado text;
  n_caja integer; n_pedidos integer; n_turnos integer; n_clientes integer; n_resenas integer;
begin
  if not public.es_equipo() then
    raise exception 'Solo el equipo de la plataforma activa locales.' using errcode = '42501';
  end if;
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
  perform public.revisar_cambio_de_plan(p_local, p_plan);

  -- Lo de prueba. La caja primero (apunta a turnos y pedidos); los renglones
  -- de cada pedido se van con su pedido. Las reseñas de la muestra (cargadas a
  -- mano, o de turnos de prueba): en un local activo las dejan sus clientes.
  delete from public.transacciones where local_id = p_local;
  get diagnostics n_caja = row_count;
  delete from public.pedidos where local_id = p_local;
  get diagnostics n_pedidos = row_count;
  delete from public.resenas where local_id = p_local;
  get diagnostics n_resenas = row_count;
  delete from public.turnos where local_id = p_local;
  get diagnostics n_turnos = row_count;
  delete from public.membresias where local_id = p_local and rol = 'cliente';
  get diagnostics n_clientes = row_count;

  update public.locales
     set estado = 'activo', plan = p_plan, activado_por = auth.uid(), activado_en = now()
   where id = p_local;

  return jsonb_build_object('turnos', n_turnos, 'pedidos', n_pedidos, 'movimientos', n_caja,
                            'clientes', n_clientes, 'resenas', n_resenas, 'plan', p_plan);
end;
$$;

create or replace function public.activar_local(p_local uuid)
returns jsonb language sql security definer set search_path = ''
as $$
  select public.activar_local(p_local, (select l.plan from public.locales l where l.id = p_local));
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 10) LA GUARDIA DE LOCALES: EL PLAN, SOLO CON LAS FUNCIONES
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.guardia_locales()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.estado is distinct from old.estado
     or new.plan is distinct from old.plan
     or new.creado_por is distinct from old.creado_por
     or new.activado_por is distinct from old.activado_por
     or new.activado_en is distinct from old.activado_en
     or new.muestra_hasta is distinct from old.muestra_hasta
     or new.created_at is distinct from old.created_at then
    raise exception 'El estado, el plan y el registro de alta de un local se cambian solo desde la plataforma.'
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
-- 11) EL RESUMEN DE LA PLATAFORMA, CON EL PLAN
-- ════════════════════════════════════════════════════════════════════════════
drop function if exists public.resumen_de_locales();
create function public.resumen_de_locales()
returns table (
  id uuid, slug text, nombre text, estado text, rubro text,
  creado_en timestamptz, creado_por text, activado_en timestamptz,
  servicios integer, profesionales integer, tramos_horario integer,
  tiene_whatsapp boolean, tiene_direccion boolean,
  duenos integer, duenos_detalle jsonb, mp_conectado boolean, turnos_de_prueba integer,
  muestra_hasta timestamptz, plan text
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
         end,
         case when l.estado in ('demo', 'archivado') then l.muestra_hasta end,
         l.plan
    from public.locales l
    left join public.profiles pc on pc.id = l.creado_por
   where public.es_equipo()
   order by l.created_at desc;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 12) QUIÉN PUEDE USARLAS
-- ════════════════════════════════════════════════════════════════════════════
do $permisos$
declare f text;
begin
  -- Las que se llaman desde afuera, con sesión.
  foreach f in array array[
    'public.dejar_resena(uuid, integer, text)',
    'public.reporte_del_local(uuid, date, date)',
    'public.cambiar_plan(uuid, text)',
    'public.activar_local(uuid, text)',
    'public.activar_local(uuid)',
    'public.resumen_de_locales()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
  -- La que usan las reglas de las tablas: también sin sesión (la web pública).
  execute 'revoke all on function public.plan_permite(uuid, text) from public, anon, authenticated, service_role';
  execute 'grant execute on function public.plan_permite(uuid, text) to anon, authenticated, service_role';
  -- Las de los disparadores: nadie las llama desde afuera.
  foreach f in array array[
    'public.limite_de_profesionales()',
    'public.cuentas_del_plan()',
    'public.mp_del_plan()',
    'public.tienda_del_plan()',
    'public.guardia_resenas()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f);
  end loop;
end $permisos$;
