-- 0007_permisos_por_local.sql
-- Fase 2: quién puede ver y tocar qué, en cada local.
--
-- QUÉ HACE
--   1. Tabla `equipo`: el equipo de la plataforma (Nico admin, Delfina comercial).
--   2. Tabla `membresias`: qué es cada persona en cada local (dueño, barbero, cliente).
--   3. Funciones con las reglas del cuadro de permisos (una regla, un nombre).
--   4. Borra TODAS las políticas viejas de las tablas de la barbería y crea las
--      nuevas, que preguntan "qué sos en ESTE local" en vez de "sos admin".
--   5. Guardias: lo que una política no puede controlar (comparar la fila antes
--      y después del cambio).
--   6. Las membresías se llenan solas: con lo que ya existe, y de acá en más
--      cuando alguien reserva o compra, o cuando se crea una cuenta de barbero.
--
-- EL CUADRO (docs/MULTITENANT.md, "Fase 2 — Plan aprobado")
--                    visitante  cliente     barbero        dueño        comercial      admin
--   catálogo         ve         ve          ve             ve y edita   ve y edita     todo
--   turnos           —          los suyos   su agenda      su local     solo demos     todo
--   pedidos          —          los suyos   —              su local     solo demos     todo
--   caja             —          —           —              su local     —              todo
--   clientes         —          el suyo     sus turnos     su local     solo demos     todo
--   datos del local  —          —           —              edita el suyo crea/edita/activa todo
--   borrar un local  nadie
--
-- POR QUÉ LA APP SIGUE ANDANDO SIN TOCARLA
--   El código todavía decide qué panel mostrar con `profiles.role`. Los
--   barberos con cuenta quedan como barberos de su local (y se mantiene solo:
--   ver el punto 6). El panel de admin lo usa el equipo, que se carga con
--   `node scripts/equipo.mjs` (nunca en el repo, que es público).
--   Las cuentas que hoy son admin y no son del equipo dejan de ver datos: así
--   se decidió el 14/10/2026 (el equipo son dos cuentas).
--
-- NO TOCA nada de la web de 369. NO borra datos.
-- Se puede correr dos veces, y también después de volver a pasar la foto:
-- borra las políticas viejas por tabla, sin depender de sus nombres.


-- ════════════════════════════════════════════════════════════════════════════
-- 1) EL EQUIPO DE LA PLATAFORMA
-- ════════════════════════════════════════════════════════════════════════════
-- Va en una tabla aparte, a propósito: nadie puede volverse parte del equipo
-- tocando un dato de un local. Desde la app nadie la escribe; se carga con
-- scripts/equipo.mjs.
create table if not exists public.equipo (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  rol        text not null,
  created_at timestamptz not null default now(),
  constraint equipo_rol_check check (rol in ('admin', 'comercial'))
);
alter table public.equipo enable row level security;
revoke all on table public.equipo from public, anon, authenticated, service_role;
grant select on table public.equipo to authenticated;
grant all on table public.equipo to service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- 2) LAS MEMBRESÍAS
-- ════════════════════════════════════════════════════════════════════════════
-- Una fila = "esta persona, en este local, es esto". Una persona puede ser
-- cliente en un local y barbero en otro, o dueño y barbero en el mismo.
-- El rol se guarda como 'dueno' (sin ñ): es un valor que viaja por el código.
create table if not exists public.membresias (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  local_id   uuid not null references public.locales (id) on delete restrict,
  rol        text not null,
  -- Solo para los barberos: cuál es su agenda (su fila en `barberos`).
  barbero_id uuid,
  created_at timestamptz not null default now(),
  constraint membresias_rol_check check (rol in ('dueno', 'barbero', 'cliente')),
  constraint membresias_barbero_solo_barberos check (barbero_id is null or rol = 'barbero'),
  constraint membresias_usuario_local_rol_key unique (user_id, local_id, rol),
  -- Candado doble: la agenda tiene que ser de un barbero del MISMO local.
  constraint membresias_barbero_id_fkey foreign key (local_id, barbero_id)
    references public.barberos (local_id, id) on delete set null (barbero_id)
);
create index if not exists membresias_local_id_idx on public.membresias (local_id, rol);
alter table public.membresias enable row level security;
revoke all on table public.membresias from public, anon, authenticated, service_role;
grant select on table public.membresias to authenticated;
grant all on table public.membresias to service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- 3) LAS REGLAS, CON NOMBRE
-- ════════════════════════════════════════════════════════════════════════════
-- Cada regla del cuadro es una función. Las políticas de abajo solo las
-- combinan, así se leen igual que el cuadro.
--
-- Todas son "security definer": corren con permisos de su dueño, porque
-- necesitan leer `equipo`, `membresias` y `locales`, que el usuario no ve
-- enteras. Por eso fijan search_path vacío (nadie las puede engañar con una
-- tabla del mismo nombre en otro esquema) y escriben public.xxx completo.
-- auth.uid() es el id de quien está consultando (null para un visitante).

-- ¿Quien consulta es del equipo, con alguno de estos roles?
create or replace function public.es_equipo(roles text[] default array['admin', 'comercial'])
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.equipo e
                  where e.user_id = auth.uid() and e.rol = any (roles));
$$;

-- ¿Quien consulta tiene alguno de estos roles en este local?
create or replace function public.tiene_rol(p_local uuid, roles text[])
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.membresias m
                  where m.user_id = auth.uid() and m.local_id = p_local and m.rol = any (roles));
$$;

-- ¿El local se muestra al público? (en demo o activo; suspendido y archivado no)
create or replace function public.local_publico(p_local uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.locales l
                  where l.id = p_local and l.estado in ('demo', 'activo'));
$$;

-- Administra el local: el admin de la plataforma o un dueño de ese local.
-- (Es lo único que puede borrar cosas y ver la caja.)
create or replace function public.puede_administrar(p_local uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.es_equipo(array['admin']) or public.tiene_rol(p_local, array['dueno']);
$$;

-- Edita el catálogo (servicios, barberos, productos, categorías, reseñas):
-- quien administra, y también la comercial, en cualquier local.
create or replace function public.puede_editar_catalogo(p_local uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.puede_administrar(p_local) or public.es_equipo(array['comercial']);
$$;

-- Ve y opera lo privado (turnos, pedidos, datos de clientes): quien
-- administra, y la comercial solo si el local está en demo (son datos de prueba).
create or replace function public.puede_operar_privado(p_local uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.puede_administrar(p_local)
      or (public.es_equipo(array['comercial'])
          and exists (select 1 from public.locales l where l.id = p_local and l.estado = 'demo'));
$$;

-- ¿Este barbero (de este local) es la agenda de quien consulta?
create or replace function public.es_mi_agenda(p_local uuid, p_barbero uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.membresias m
                  where m.user_id = auth.uid() and m.local_id = p_local
                    and m.rol = 'barbero' and m.barbero_id = p_barbero);
$$;

-- ¿Quien consulta puede ver los datos de esta persona (nombre, mail)?
-- Uno mismo; el admin; quien opera lo privado de un local donde esa persona
-- es miembro, reservó o compró; y el barbero, de quien tiene en su agenda.
create or replace function public.puede_ver_persona(p_persona uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_persona = auth.uid()
      or public.es_equipo(array['admin'])
      or exists (select 1 from public.membresias m
                  where m.user_id = p_persona and public.puede_operar_privado(m.local_id))
      or exists (select 1 from public.turnos t
                  where t.cliente_id = p_persona
                    and (public.puede_operar_privado(t.local_id) or public.es_mi_agenda(t.local_id, t.barbero_id)))
      or exists (select 1 from public.pedidos pe
                  where pe.user_id = p_persona and public.puede_operar_privado(pe.local_id));
$$;

-- Quién puede usarlas: todos (las políticas se evalúan como el que consulta).
-- Solo responden sí o no sobre quien pregunta, o si un local es público.
do $permisos$
declare f text;
begin
  foreach f in array array[
    'public.es_equipo(text[])', 'public.tiene_rol(uuid, text[])', 'public.local_publico(uuid)',
    'public.puede_administrar(uuid)', 'public.puede_editar_catalogo(uuid)',
    'public.puede_operar_privado(uuid)', 'public.es_mi_agenda(uuid, uuid)', 'public.puede_ver_persona(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f);
    execute format('grant execute on function %s to anon, authenticated, service_role', f);
  end loop;
end $permisos$;


-- ════════════════════════════════════════════════════════════════════════════
-- 4) LAS POLÍTICAS
-- ════════════════════════════════════════════════════════════════════════════
do $politicas$
declare
  t text;
  p record;
  visible text;
begin
  -- a. Borrón: se borran TODAS las políticas de estas tablas, tengan el
  --    nombre que tengan. Si quedara una vieja que deja pasar de más, anularía
  --    las nuevas (alcanza con que una política diga "sí").
  --    Solo estas tablas: lo de 369 no se toca.
  for p in
    select pol.policyname, pol.tablename
      from pg_policies pol
     where pol.schemaname = 'public'
       and pol.tablename in ('barberos', 'categorias', 'servicios', 'productos', 'resenas',
                             'turnos', 'pedidos', 'items_pedido', 'transacciones', 'mp_conexion',
                             'locales', 'profiles', 'membresias', 'equipo')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;

  -- b. Catálogo: lo ve cualquiera si el local es público; lo editan quien
  --    administra y la comercial; lo borra solo quien administra.
  for t, visible in
    select * from (values
      ('barberos',   'true'),
      ('categorias', 'true'),
      ('servicios',  'true'),
      ('productos',  'activo = true'),
      ('resenas',    'visible = true')
    ) as v (tabla, condicion)
  loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (public.local_publico(local_id) and %s)',
                   t || ': lo ve el publico', t, visible);
    execute format('create policy %I on public.%I for select to authenticated using (public.puede_editar_catalogo(local_id))',
                   t || ': lo ve quien lo edita', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.puede_editar_catalogo(local_id))',
                   t || ': crea quien lo edita', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.puede_editar_catalogo(local_id)) with check (public.puede_editar_catalogo(local_id))',
                   t || ': edita quien lo edita', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.puede_administrar(local_id))',
                   t || ': borra quien administra', t);
  end loop;

  -- c. Lo privado (turnos, pedidos, renglones): lo opera quien administra
  --    (y la comercial en demos); lo borra solo quien administra.
  foreach t in array array['turnos', 'pedidos', 'items_pedido'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.puede_operar_privado(local_id))',
                   t || ': lo ve quien opera el local', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.puede_operar_privado(local_id))',
                   t || ': crea quien opera el local', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.puede_operar_privado(local_id)) with check (public.puede_operar_privado(local_id))',
                   t || ': edita quien opera el local', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.puede_administrar(local_id))',
                   t || ': borra quien administra', t);
  end loop;
end $politicas$;

-- Turnos: lo del cliente y lo del barbero.
create policy "turnos: el cliente ve los suyos" on public.turnos
  for select to authenticated
  using (cliente_id = auth.uid());

-- Las mismas condiciones de la 0005, más que el local esté abierto al público.
create policy "turnos: el cliente reserva" on public.turnos
  for insert to authenticated
  with check (
    cliente_id = auth.uid()
    and estado = 'pendiente'
    and coalesce(sena_estado, 'pendiente') = 'pendiente'
    and mp_payment_id is null
    and public.local_publico(local_id)
  );

-- Solo para cancelar. La guardia de abajo impide cambiar cualquier otra cosa.
create policy "turnos: el cliente cancela" on public.turnos
  for update to authenticated
  using (cliente_id = auth.uid())
  with check (cliente_id = auth.uid() and estado = 'cancelado');

create policy "turnos: el barbero ve su agenda" on public.turnos
  for select to authenticated
  using (public.es_mi_agenda(local_id, barbero_id));

-- Pedidos: el cliente ve los suyos (los crea el servidor, nunca el navegador).
create policy "pedidos: el cliente ve los suyos" on public.pedidos
  for select to authenticated
  using (user_id = auth.uid());

create policy "items_pedido: el cliente ve los suyos" on public.items_pedido
  for select to authenticated
  using (exists (select 1 from public.pedidos pe
                  where pe.id = items_pedido.pedido_id and pe.user_id = auth.uid()));

-- Caja: solo quien administra el local.
create policy "transacciones: la ve y la opera quien administra" on public.transacciones
  for all to authenticated
  using (public.puede_administrar(local_id))
  with check (public.puede_administrar(local_id));

-- mp_conexion: sin políticas a propósito (tokens). Solo el servidor.

-- Locales: el equipo ve todos; dueños y barberos, el suyo.
create policy "locales: lo ven el equipo y su personal" on public.locales
  for select to authenticated
  using (public.es_equipo() or public.tiene_rol(id, array['dueno', 'barbero']));

create policy "locales: crea el equipo" on public.locales
  for insert to authenticated
  with check (public.es_equipo());

-- El dueño edita el suyo; la guardia le impide cambiar el estado o la dirección.
create policy "locales: editan el equipo y el dueno" on public.locales
  for update to authenticated
  using (public.es_equipo() or public.tiene_rol(id, array['dueno']))
  with check (public.es_equipo() or public.tiene_rol(id, array['dueno']));

-- Perfiles: cada uno ve el suyo y los que le corresponden (ver puede_ver_persona).
create policy "profiles: ve cada uno lo que le corresponde" on public.profiles
  for select to authenticated
  using (public.puede_ver_persona(id));

-- Cada uno edita el suyo; la guardia de abajo limita a nombre y apellido.
create policy "profiles: cada uno edita el suyo" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: el admin edita cualquiera" on public.profiles
  for update to authenticated
  using (public.es_equipo(array['admin']))
  with check (public.es_equipo(array['admin']));

-- Membresías: cada uno ve las suyas; quien opera un local, las de ese local.
create policy "membresias: las ve cada uno y quien opera el local" on public.membresias
  for select to authenticated
  using (user_id = auth.uid() or public.puede_operar_privado(local_id));

-- Equipo: cada uno ve la suya; el admin, todas.
create policy "equipo: la ve cada uno y el admin" on public.equipo
  for select to authenticated
  using (user_id = auth.uid() or public.es_equipo(array['admin']));


-- ════════════════════════════════════════════════════════════════════════════
-- 5) GUARDIAS
-- ════════════════════════════════════════════════════════════════════════════
-- Una política decide qué filas se pueden tocar, pero no puede comparar cómo
-- era la fila antes y cómo queda después. Un disparador "antes de actualizar"
-- sí puede: ve la fila vieja (old) y la nueva (new).
--
-- Solo controlan lo que llega desde el navegador (los roles anon y
-- authenticated). El servidor de la app (service_role) y los scripts
-- (postgres) pasan sin control.

-- Perfiles: desde la app, cada uno cambia solo su nombre y apellido.
create or replace function public.guardia_profiles()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.es_equipo(array['admin']) then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.barbero_id is distinct from old.barbero_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Desde la app solo se pueden cambiar el nombre y el apellido.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guardia on public.profiles;
create trigger profiles_guardia before update on public.profiles
  for each row execute function public.guardia_profiles();

-- Turnos: quien no opera el local (el cliente) solo puede cambiar el estado.
-- La política ya exige que quede 'cancelado'.
create or replace function public.guardia_turnos()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.puede_operar_privado(old.local_id) then
    return new;
  end if;
  -- to_jsonb convierte la fila en un objeto; "- 'estado'" le saca esa columna.
  -- Si sin el estado las dos versiones no son iguales, cambió otra cosa.
  if (to_jsonb(new) - 'estado') is distinct from (to_jsonb(old) - 'estado') then
    raise exception 'Al cancelar un turno no se puede cambiar nada más.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists turnos_guardia on public.turnos;
create trigger turnos_guardia before update on public.turnos
  for each row execute function public.guardia_turnos();

-- Locales: el dueño edita los datos de su local, pero no su estado, su
-- dirección ni el registro de quién lo creó o activó. Eso es del equipo.
create or replace function public.guardia_locales()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.es_equipo() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.slug is distinct from old.slug
     or new.estado is distinct from old.estado
     or new.creado_por is distinct from old.creado_por
     or new.activado_por is distinct from old.activado_por
     or new.activado_en is distinct from old.activado_en
     or new.created_at is distinct from old.created_at then
    raise exception 'El estado, la dirección y el registro de alta de un local los maneja el equipo.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists locales_guardia on public.locales;
create trigger locales_guardia before update on public.locales
  for each row execute function public.guardia_locales();


-- ════════════════════════════════════════════════════════════════════════════
-- 6) LAS MEMBRESÍAS SE LLENAN SOLAS
-- ════════════════════════════════════════════════════════════════════════════

-- a. Quien reserva o compra en un local pasa a ser cliente de ese local.
--    Es una regla permanente: así cada local "conoce" a sus clientes.
create or replace function public.registrar_cliente_del_local()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_persona uuid;
begin
  -- Cada tabla nombra distinto a la persona. Va con if (y no en una sola
  -- expresión) porque un turno no tiene user_id ni un pedido cliente_id.
  if tg_table_name = 'turnos' then
    v_persona := new.cliente_id;
  else
    v_persona := new.user_id;
  end if;
  -- Solo si la persona tiene perfil: una compra nunca falla por esto.
  insert into public.membresias (user_id, local_id, rol)
  select v_persona, new.local_id, 'cliente'
   where exists (select 1 from public.profiles pr where pr.id = v_persona)
  on conflict (user_id, local_id, rol) do nothing;
  return new;
end;
$$;
drop trigger if exists turnos_registra_cliente on public.turnos;
create trigger turnos_registra_cliente after insert on public.turnos
  for each row execute function public.registrar_cliente_del_local();
drop trigger if exists pedidos_registra_cliente on public.pedidos;
create trigger pedidos_registra_cliente after insert on public.pedidos
  for each row execute function public.registrar_cliente_del_local();

-- b. TEMPORAL: mientras el código cree barberos poniendo `role = 'barbero'`
--    en el perfil (src/app/actions/barberos.ts), la membresía de barbero se
--    copia sola de ahí. Se quita cuando el código maneje membresías.
create or replace function public.sincronizar_membresia_barbero()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_local uuid;
begin
  -- Si dejó de ser barbero o cambió de agenda, se saca la membresía vieja.
  if tg_op = 'UPDATE' and old.role = 'barbero'
     and (new.role is distinct from 'barbero' or new.barbero_id is distinct from old.barbero_id) then
    delete from public.membresias where user_id = old.id and rol = 'barbero';
  end if;
  if new.role = 'barbero' and new.barbero_id is not null then
    select b.local_id into v_local from public.barberos b where b.id = new.barbero_id;
    if v_local is not null then
      insert into public.membresias (user_id, local_id, rol, barbero_id)
      values (new.id, v_local, 'barbero', new.barbero_id)
      on conflict (user_id, local_id, rol) do update set barbero_id = excluded.barbero_id;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_sincroniza_barbero on public.profiles;
create trigger profiles_sincroniza_barbero after insert or update of role, barbero_id on public.profiles
  for each row execute function public.sincronizar_membresia_barbero();

-- Las funciones de los disparadores no se llaman desde afuera.
do $disparadores$
declare f text;
begin
  foreach f in array array[
    'public.guardia_profiles()', 'public.guardia_turnos()', 'public.guardia_locales()',
    'public.registrar_cliente_del_local()', 'public.sincronizar_membresia_barbero()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end $disparadores$;

-- c. Lo que ya existe: barberos con cuenta, y quien ya reservó o compró.
insert into public.membresias (user_id, local_id, rol, barbero_id)
select p.id, b.local_id, 'barbero', p.barbero_id
  from public.profiles p
  join public.barberos b on b.id = p.barbero_id
 where p.role = 'barbero'
on conflict (user_id, local_id, rol) do nothing;

insert into public.membresias (user_id, local_id, rol)
select q.persona, q.local_id, 'cliente'
  from (select t.cliente_id as persona, t.local_id from public.turnos t
        union
        select pe.user_id, pe.local_id from public.pedidos pe) as q
 where exists (select 1 from public.profiles pr where pr.id = q.persona)
on conflict (user_id, local_id, rol) do nothing;

-- Para comprobar todo esto:
--   node scripts/verificar-locales.mjs     (estructura y 369)
--   node scripts/probar-aislamiento.mjs    (el cuadro, con cuentas de verdad)
