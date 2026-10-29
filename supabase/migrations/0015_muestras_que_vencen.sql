-- 0015_muestras_que_vencen.sql
-- Después de los pases (26/10/2026): las muestras se archivan solas, y se
-- borra lo viejo que ya no usa nadie.
--
-- QUÉ HACE
--   1. Cada muestra tiene fecha de vencimiento (`locales.muestra_hasta`): 30
--      días desde que se crea o se revive. Un reloj de la base (pg_cron) archiva
--      todas las noches las que vencieron. El equipo puede sumarle 30 días más
--      (extender_muestra). Roble (la muestra del producto, a la que lleva "/")
--      no vence nunca: su fecha queda vacía.
--   2. La guardia de `locales` suma la fecha de vencimiento a lo que nadie
--      cambia desde el navegador (un dueño no puede estirar su propia muestra).
--   3. El resumen de la plataforma devuelve la fecha, para mostrarla.
--   4. Se borran tres columnas sin uso desde las Fases 2 y 3b:
--      - `profiles.role` y `profiles.barbero_id`: quién es qué ahora está en
--        `equipo` y `membresias` (Fase 2; la 0012 sacó lo último que las leía).
--      - `locales.horarios`: el texto viejo; los horarios salen de la tabla
--        `horarios` (Fase 3b).
--      Con ellas: la función vieja is_admin() (nadie la usa), y se ajustan la
--      que crea el perfil de una cuenta nueva y la guardia de perfiles.
--
-- ⚠️ BORRA DATOS: los valores de esas tres columnas (aprobado por Nico el
-- 26/10/2026: "lo que no sirva se borra"). En producción, con copia de
-- seguridad antes. Antes de borrar, revisa que ningún barbero con cuenta se
-- quede sin su membresía: si pasara, frena y no cambia nada.
--
-- Es idempotente. NO toca nada de la web de 369 (trabajos, fotos, videos).


-- ════════════════════════════════════════════════════════════════════════════
-- 1) LA FECHA DE VENCIMIENTO DE CADA MUESTRA
-- ════════════════════════════════════════════════════════════════════════════
-- La columna se crea sin valor por defecto (si no, Roble también vencería) y
-- después se le pone: las muestras nuevas (crear_local) nacen con 30 días.
alter table public.locales add column if not exists muestra_hasta timestamptz;

do $fechas$
begin
  -- Solo la primera vez: las muestras que ya existen arrancan a contar hoy.
  if (select column_default from information_schema.columns
       where table_schema = 'public' and table_name = 'locales' and column_name = 'muestra_hasta') is null then
    update public.locales set muestra_hasta = now() + interval '30 days'
     where estado = 'demo' and slug <> 'roble' and muestra_hasta is null;
  end if;
end $fechas$;

alter table public.locales alter column muestra_hasta set default (now() + interval '30 days');
update public.locales set muestra_hasta = null where slug = 'roble';

comment on column public.locales.muestra_hasta is
  'Hasta cuándo dura la muestra: después se archiva sola (pg_cron, todas las noches). Vacío: no vence (Roble).';

-- Revivir una muestra le da 30 días de nuevo (y activarla deja de contar).
create or replace function public.fecha_de_la_muestra()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.estado = 'demo' and old.estado = 'archivado' and old.muestra_hasta is not null then
    new.muestra_hasta := now() + interval '30 days';
  elsif new.estado = 'activo' and old.estado = 'demo' then
    new.muestra_hasta := null;
  end if;
  return new;
end;
$$;

drop trigger if exists locales_fecha_de_la_muestra on public.locales;
create trigger locales_fecha_de_la_muestra
  before update of estado on public.locales
  for each row execute function public.fecha_de_la_muestra();

-- Sumarle 30 días a una muestra (desde hoy o desde su vencimiento, lo que sea
-- más tarde). Solo el equipo, y solo a una muestra que vence.
create or replace function public.extender_muestra(p_local uuid)
returns timestamptz language plpgsql security definer set search_path = ''
as $$
declare
  v_hasta timestamptz;
begin
  if not public.es_equipo() then
    raise exception 'Solo el equipo de la plataforma extiende una muestra.' using errcode = '42501';
  end if;
  update public.locales
     set muestra_hasta = greatest(muestra_hasta, now()) + interval '30 days'
   where id = p_local and estado = 'demo' and muestra_hasta is not null
  returning muestra_hasta into v_hasta;
  if v_hasta is null then
    raise exception 'Solo se extiende una muestra que vence.';
  end if;
  return v_hasta;
end;
$$;

revoke all on function public.extender_muestra(uuid) from public, anon, authenticated, service_role;
grant execute on function public.extender_muestra(uuid) to authenticated, service_role;
revoke all on function public.fecha_de_la_muestra() from public, anon, authenticated, service_role;

-- El reloj: todas las noches a las 3 (hora de Argentina = 6 UTC). Si ya
-- estaba, cron.schedule con el mismo nombre lo actualiza.
create extension if not exists pg_cron;

select cron.schedule(
  'archivar-muestras-vencidas',
  '0 6 * * *',
  $cron$update public.locales set estado = 'archivado'
         where estado = 'demo' and muestra_hasta is not null and muestra_hasta < now()$cron$
);


-- ════════════════════════════════════════════════════════════════════════════
-- 2) LA GUARDIA DE LOCALES: LA FECHA NO SE CAMBIA DESDE EL NAVEGADOR
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
     or new.creado_por is distinct from old.creado_por
     or new.activado_por is distinct from old.activado_por
     or new.activado_en is distinct from old.activado_en
     or new.muestra_hasta is distinct from old.muestra_hasta
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
-- 3) EL RESUMEN DE LA PLATAFORMA, CON LA FECHA
-- ════════════════════════════════════════════════════════════════════════════
-- Igual que en la 0014, más `muestra_hasta` al final. Se borra antes de crearla
-- porque cambia lo que devuelve.
drop function if exists public.resumen_de_locales();
create function public.resumen_de_locales()
returns table (
  id uuid, slug text, nombre text, estado text, rubro text,
  creado_en timestamptz, creado_por text, activado_en timestamptz,
  servicios integer, profesionales integer, tramos_horario integer,
  tiene_whatsapp boolean, tiene_direccion boolean,
  duenos integer, duenos_detalle jsonb, mp_conectado boolean, turnos_de_prueba integer,
  muestra_hasta timestamptz
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
         case when l.estado in ('demo', 'archivado') then l.muestra_hasta end
    from public.locales l
    left join public.profiles pc on pc.id = l.creado_por
   where public.es_equipo()
   order by l.created_at desc;
$$;

revoke all on function public.resumen_de_locales() from public, anon, authenticated, service_role;
grant execute on function public.resumen_de_locales() to authenticated, service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- 4) LO VIEJO QUE YA NO USA NADIE
-- ════════════════════════════════════════════════════════════════════════════
do $revisar$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'profiles' and column_name = 'barbero_id') then
    -- Un barbero con cuenta tiene que tener su membresía antes de borrar el
    -- dato viejo (la 0007 las copió; desde la Fase 4b la app la crea directo).
    if exists (select 1 from public.profiles p
                where p.barbero_id is not null
                  and not exists (select 1 from public.membresias m
                                   where m.user_id = p.id and m.rol = 'barbero' and m.barbero_id = p.barbero_id)) then
      raise exception 'Hay un barbero con cuenta sin su membresía: no se borra profiles.barbero_id. Revisar antes.';
    end if;
  end if;
end $revisar$;

-- La cuenta nueva nace con su perfil (nombre, apellido, mail). Qué puede hacer
-- no lo dice el perfil: lo dicen equipo y membresias.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = 'public'
as $$
begin
  insert into public.profiles (id, email, nombre, apellido)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', '')
  );
  return new;
end;
$$;

create or replace function public.guardia_profiles()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.es_equipo(array['admin']) then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.created_at is distinct from old.created_at then
    raise exception 'Desde la app solo se pueden cambiar el nombre y el apellido.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop function if exists public.is_admin();

alter table public.profiles drop column if exists role;
alter table public.profiles drop column if exists barbero_id;
alter table public.locales drop column if exists horarios;
