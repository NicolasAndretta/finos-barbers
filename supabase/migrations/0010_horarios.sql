-- 0010_horarios.sql
-- Fase 3b: horarios reales. La reserva solo ofrece lo que está abierto.
--
-- QUÉ HACE
--   1. Reglas de reserva de cada local: con cuánta anticipación mínima se
--      puede reservar para hoy (1 hora), hasta cuántos días adelante (60) y su
--      zona horaria (la hora del local, no la del servidor).
--   2. Tabla `horarios`: los tramos de cada día. Un día puede tener varios
--      (horario cortado: de 10 a 13 y de 15 a 20; en el hueco no se reserva).
--      Sin profesional = el horario del local. Con profesional = su horario
--      propio (si no tiene, usa el del local).
--   3. Tabla `ausencias`: vacaciones de un profesional o feriados del local,
--      de una fecha a otra. El motivo es privado: el público no lo ve.
--   4. `guardar_horarios(...)`: reemplaza el horario de un día de una sola
--      vez (si algo está mal, no se guarda nada), y revisa que los tramos no
--      se pisen.
--   5. `datos_del_local(slug)` suma las reglas de reserva (y deja de devolver
--      el texto viejo de horarios: ahora salen de la tabla).
--   6. Roble arranca con lo que ya dice su web: lunes a sábado de 10 a 20.
--
-- Días de la semana: 0 = domingo, 1 = lunes ... 6 = sábado (como JavaScript).
-- Es idempotente: se puede correr dos veces. No borra datos.
-- La columna vieja `locales.horarios` (el texto) queda sin uso; sacarla es
-- borrar, así que se hace aparte y con el OK de Nico.


-- ════════════════════════════════════════════════════════════════════════════
-- 1) REGLAS DE RESERVA DE CADA LOCAL
-- ════════════════════════════════════════════════════════════════════════════

alter table public.locales add column if not exists anticipacion_minutos integer not null default 60;
alter table public.locales add column if not exists dias_reserva integer not null default 60;
alter table public.locales add column if not exists zona_horaria text not null default 'America/Argentina/Buenos_Aires';

alter table public.locales drop constraint if exists locales_anticipacion_check;
alter table public.locales add constraint locales_anticipacion_check
  check (anticipacion_minutos between 0 and 10080); -- hasta una semana
alter table public.locales drop constraint if exists locales_dias_reserva_check;
alter table public.locales add constraint locales_dias_reserva_check
  check (dias_reserva between 1 and 365);


-- ════════════════════════════════════════════════════════════════════════════
-- 2) HORARIOS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.horarios (
  id          uuid primary key default gen_random_uuid(),
  local_id    uuid not null references public.locales (id) on delete restrict,
  barbero_id  uuid,          -- vacío = horario del local
  dia_semana  smallint not null,
  desde       time not null,
  hasta       time not null,
  created_at  timestamptz not null default now(),
  constraint horarios_dia_check check (dia_semana between 0 and 6),
  constraint horarios_tramo_check check (desde < hasta),
  -- Candado doble: el profesional tiene que ser de ESTE local. Si se borra el
  -- profesional, se borra su horario propio.
  constraint horarios_barbero_fkey foreign key (local_id, barbero_id)
    references public.barberos (local_id, id) on delete cascade
);
create index if not exists horarios_local_dia_idx on public.horarios (local_id, dia_semana);
alter table public.horarios enable row level security;
revoke all on table public.horarios from public, anon, authenticated, service_role;
grant select on table public.horarios to anon, authenticated;
grant insert, update, delete on table public.horarios to authenticated;
grant all on table public.horarios to service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- 3) AUSENCIAS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.ausencias (
  id          uuid primary key default gen_random_uuid(),
  local_id    uuid not null references public.locales (id) on delete restrict,
  barbero_id  uuid,          -- vacío = todo el local (feriado)
  desde       date not null,
  hasta       date not null,
  motivo      text,
  created_at  timestamptz not null default now(),
  constraint ausencias_fechas_check check (desde <= hasta),
  constraint ausencias_barbero_fkey foreign key (local_id, barbero_id)
    references public.barberos (local_id, id) on delete cascade
);
create index if not exists ausencias_local_fechas_idx on public.ausencias (local_id, desde, hasta);
alter table public.ausencias enable row level security;
revoke all on table public.ausencias from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.ausencias to authenticated;
grant all on table public.ausencias to service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- 4) QUIÉN VE Y QUIÉN TOCA (las reglas de la Fase 2)
-- ════════════════════════════════════════════════════════════════════════════
-- Horarios: los ve cualquiera si el local es público (la web los muestra);
-- los edita quien edita el catálogo (dueño, admin, comercial). Al guardar se
-- reemplazan enteros, así que quien edita también borra tramos.
-- Ausencias: solo quien edita (el motivo puede ser privado). La reserva las
-- consulta desde el servidor, sin mostrar el motivo.

do $politicas$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
            where schemaname = 'public' and tablename in ('horarios', 'ausencias') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $politicas$;

create policy "horarios: los ve el publico" on public.horarios
  for select to anon, authenticated using (public.local_publico(local_id));
create policy "horarios: los ve quien los edita" on public.horarios
  for select to authenticated using (public.puede_editar_catalogo(local_id));
create policy "horarios: crea quien los edita" on public.horarios
  for insert to authenticated with check (public.puede_editar_catalogo(local_id));
create policy "horarios: edita quien los edita" on public.horarios
  for update to authenticated using (public.puede_editar_catalogo(local_id)) with check (public.puede_editar_catalogo(local_id));
create policy "horarios: borra quien los edita" on public.horarios
  for delete to authenticated using (public.puede_editar_catalogo(local_id));

create policy "ausencias: las ve quien las edita" on public.ausencias
  for select to authenticated using (public.puede_editar_catalogo(local_id));
create policy "ausencias: crea quien las edita" on public.ausencias
  for insert to authenticated with check (public.puede_editar_catalogo(local_id));
create policy "ausencias: edita quien las edita" on public.ausencias
  for update to authenticated using (public.puede_editar_catalogo(local_id)) with check (public.puede_editar_catalogo(local_id));
create policy "ausencias: borra quien las edita" on public.ausencias
  for delete to authenticated using (public.puede_editar_catalogo(local_id));


-- ════════════════════════════════════════════════════════════════════════════
-- 5) GUARDAR EL HORARIO DE UNA SEMANA, DE UNA VEZ
-- ════════════════════════════════════════════════════════════════════════════
-- Recibe todos los tramos de la semana del local (p_barbero vacío) o de un
-- profesional, y reemplaza los que había. Todo o nada: si un tramo está mal,
-- no se guarda ninguno.
--   p_tramos = [{"dia": 1, "desde": "10:00", "hasta": "13:00"}, ...]
-- Para un profesional, una lista vacía = "usa el horario del local".
-- Corre con los permisos de quien llama (security invoker): las reglas de
-- arriba deciden si puede.

create or replace function public.guardar_horarios(p_local uuid, p_barbero uuid, p_tramos jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  t jsonb;
  v_dia smallint; v_desde time; v_hasta time;
begin
  if jsonb_typeof(p_tramos) is distinct from 'array' then
    raise exception 'Los horarios llegaron con un formato inválido.';
  end if;

  delete from public.horarios
   where local_id = p_local and barbero_id is not distinct from p_barbero;

  for t in select * from jsonb_array_elements(p_tramos) loop
    begin
      v_dia := (t ->> 'dia')::smallint;
      v_desde := (t ->> 'desde')::time;
      v_hasta := (t ->> 'hasta')::time;
    exception when others then
      raise exception 'Hay un horario con un día o una hora inválida.';
    end;
    if v_dia is null or v_dia not between 0 and 6 then
      raise exception 'Hay un horario con un día inválido.';
    end if;
    if v_desde is null or v_hasta is null or v_desde >= v_hasta then
      raise exception 'Cada tramo tiene que terminar después de empezar (%, % a %).',
        (array['domingo','lunes','martes','miércoles','jueves','viernes','sábado'])[v_dia + 1], to_char(v_desde, 'HH24:MI'), to_char(v_hasta, 'HH24:MI');
    end if;
    if exists (select 1 from public.horarios h
                where h.local_id = p_local and h.barbero_id is not distinct from p_barbero
                  and h.dia_semana = v_dia and h.desde < v_hasta and v_desde < h.hasta) then
      raise exception 'Dos tramos del % se pisan.',
        (array['domingo','lunes','martes','miércoles','jueves','viernes','sábado'])[v_dia + 1];
    end if;
    insert into public.horarios (local_id, barbero_id, dia_semana, desde, hasta)
    values (p_local, p_barbero, v_dia, v_desde, v_hasta);
  end loop;
end;
$$;

revoke all on function public.guardar_horarios(uuid, uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.guardar_horarios(uuid, uuid, jsonb) to authenticated, service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- 6) DATOS PÚBLICOS DE UN LOCAL, CON SUS REGLAS DE RESERVA
-- ════════════════════════════════════════════════════════════════════════════
-- Cambia lo que devuelve la función (suma columnas y saca el texto viejo de
-- horarios), y eso en Postgres obliga a borrarla y crearla de nuevo. Es código,
-- no datos: se recrea enseguida, en esta misma migración.

drop function if exists public.datos_del_local(text);
create function public.datos_del_local(p_slug text)
returns table (
  id uuid, slug text, nombre text, estado text, rubro text,
  nombre_corto text, lema text, descripcion text,
  direccion text, ciudad text, mapa_query text, email text,
  whatsapp text, whatsapp_mensaje text, instagram text, tiktok text,
  alias_pago text, sena_porcentaje integer, medios_pago text[],
  anticipacion_minutos integer, dias_reserva integer, zona_horaria text
)
language sql stable security definer set search_path = ''
as $$
  select l.id, l.slug, l.nombre, l.estado, l.rubro,
         l.nombre_corto, l.lema, l.descripcion,
         l.direccion, l.ciudad, l.mapa_query, l.email,
         l.whatsapp, l.whatsapp_mensaje, l.instagram, l.tiktok,
         l.alias_pago, l.sena_porcentaje, l.medios_pago,
         l.anticipacion_minutos, l.dias_reserva, l.zona_horaria
    from public.locales l
   where l.slug = lower(p_slug);
$$;
revoke all on function public.datos_del_local(text) from public, anon, authenticated, service_role;
grant execute on function public.datos_del_local(text) to anon, authenticated, service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- 7) ROBLE ARRANCA CON LO QUE YA DICE SU WEB
-- ════════════════════════════════════════════════════════════════════════════
-- Lunes a sábado de 10 a 20; domingo cerrado (sin tramos). Solo si Roble
-- todavía no tiene horario cargado: si ya lo cambiaron, no se pisa.

insert into public.horarios (local_id, dia_semana, desde, hasta)
select l.id, d, '10:00', '20:00'
  from public.locales l, generate_series(1, 6) as d
 where l.id = '00000000-0000-4000-a000-000000000001'
   and not exists (select 1 from public.horarios h where h.local_id = l.id and h.barbero_id is null);
