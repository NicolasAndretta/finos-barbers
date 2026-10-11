-- 0006_locales.sql
-- Fase 1: la base aprende que existen "locales" (barberías).
--
-- QUÉ HACE
--   1. Crea la tabla `locales`: una fila por barbería.
--   2. Carga a Roble, el local de demostración, con los datos que hoy están
--      fijos en src/lib/site.ts.
--   3. Agrega la columna `local_id` a las 10 tablas de la barbería y marca
--      todo lo que existe hoy como "de Roble".
--   4. Candado doble: la base rechaza mezclas entre locales (por ejemplo, un
--      turno de un local con un barbero de otro).
--   5. El nombre de una categoría pasa a ser único por local, no en toda la base.
--
-- QUÉ NO HACE
--   - No cambia quién puede ver o escribir cada tabla: los permisos por local
--     son la Fase 2. Hoy hay un solo local, así que todavía no hay nada que
--     separar.
--   - No toca nada de la web de 369 (ver "Lo que es de 369" en
--     docs/MULTITENANT.md).
--   - No borra datos.
--
-- POR QUÉ LA APP SIGUE ANDANDO SIN TOCARLA
--   La app crea filas en 14 lugares y ninguno dice de qué local son. Por eso
--   `local_id` nace con un valor por defecto: Roble. Es TEMPORAL: se quita en
--   la Fase 4, cuando todo el código ya mande el local. Mientras exista, una
--   fila creada sin local cae en Roble en silencio.
--
-- DOS REGLAS QUE SIGUE ESTE ARCHIVO
--   a) Se puede correr dos veces: cada paso pregunta antes si ya está hecho.
--   b) Cuando cambia una regla que ya estaba en la foto (0000_base.sql), le
--      deja EL MISMO NOMBRE. scripts/preparar-desarrollo.mjs vuelve a pasar la
--      foto cada vez, y la foto solo crea una regla si no encuentra ninguna con
--      ese nombre. Con otro nombre, la regla vieja volvería a aparecer.


-- ════════════════════════════════════════════════════════════════════════════
-- 1) LA TABLA DE LOCALES
-- ════════════════════════════════════════════════════════════════════════════
-- Solo `nombre` y `slug` son obligatorios. En los demás datos, vacío (null)
-- quiere decir "todavía no lo cargaron": así el panel va a poder mostrar qué
-- le falta a cada barbería. Llevan valor por defecto solo los que tienen uno
-- razonable (seña, medios de pago, horarios).
--
-- No se guarda lo que se calcula a partir de otro dato (el link de Instagram
-- sale del usuario, el WhatsApp "lindo" sale del número): eso lo arma el
-- código en la Fase 3.
create table if not exists public.locales (
  id               uuid primary key default gen_random_uuid(),

  -- La parte de la dirección que identifica al local: sitio.com/<slug>.
  slug             text not null,
  nombre           text not null,
  -- demo → activo → suspendido (si deja de pagar) · demo → archivado (no se vendió)
  estado           text not null default 'demo',

  -- Los datos del negocio (hoy viven en src/lib/site.ts).
  nombre_corto     text,          -- si falta, se usa `nombre`
  lema             text,
  descripcion      text,
  direccion        text,
  ciudad           text,
  mapa_query       text,          -- lo que se le pide al mapa
  email            text,
  whatsapp         text,          -- solo números, con código de país
  whatsapp_mensaje text,          -- mensaje pre-cargado del botón
  instagram        text,          -- el usuario, sin @ ni link
  tiktok           text,
  alias_pago       text,
  sena_porcentaje  integer not null default 40,
  medios_pago      text[]  not null default array['Transferencia', 'Mercado Pago', 'Efectivo', 'Tarjetas']::text[],
  -- Lista de { "dia": ..., "horas": ... }, en el orden en que se muestra.
  horarios         jsonb   not null default '[{"dia": "Lunes a Sábado", "horas": "10:00 – 20:00"}, {"dia": "Domingos", "horas": "Cerrado"}]'::jsonb,

  -- Quién la creó y quién la activó (por si después quieren saber quién
  -- vendió qué). Si se borra esa cuenta, el dato queda vacío: el local no se toca.
  creado_por       uuid references auth.users (id) on delete set null,
  activado_por     uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  activado_en      timestamptz,

  constraint locales_slug_key unique (slug),
  -- Minúsculas, números y guiones; entre 2 y 40 caracteres. Ej.: el-tano
  constraint locales_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 40),
  constraint locales_estado_check check (estado in ('demo', 'activo', 'suspendido', 'archivado')),
  constraint locales_sena_porcentaje_check check (sena_porcentaje between 0 and 100)
);

-- RLS se activa A MANO. En producción hay un disparador que lo hace solo con
-- cada tabla nueva; en desarrollo no existe. Así las dos bases quedan iguales.
alter table public.locales enable row level security;

-- Quién puede usar la tabla. Se escribe completo para no depender de lo que
-- cada proyecto de Supabase reparte "de fábrica":
--   - visitante sin cuenta (anon): nada. Qué datos del local son públicos se
--     decide en la Fase 3, cuando el sitio empiece a leerlos.
--   - usuario logueado: puede intentar leer, crear y editar; la política de
--     abajo deja pasar solo al admin. Nadie borra un local desde la app: un
--     local que no sigue se archiva.
--   - el servidor (service role): todo.
revoke all on table public.locales from public, anon, authenticated, service_role;
grant select, insert, update on table public.locales to authenticated;
grant all on table public.locales to service_role;

-- Por ahora, el mismo criterio que el resto de las tablas: manda is_admin().
-- La Fase 2 lo reemplaza por el equipo de la plataforma y las membresías.
drop policy if exists locales_admin_all on public.locales;
create policy locales_admin_all on public.locales
  as permissive
  for all
  to public
  using (public.is_admin())
  with check (public.is_admin());


-- ════════════════════════════════════════════════════════════════════════════
-- 2) ROBLE, EL LOCAL DE DEMOSTRACIÓN
-- ════════════════════════════════════════════════════════════════════════════
-- Tiene un id fijo y fácil de reconocer, porque es el valor por defecto
-- temporal de `local_id`. "on conflict do nothing": si Roble ya existe no se
-- pisa, así que lo que se edite después desde el panel no se pierde.
insert into public.locales (
  id, slug, nombre, estado,
  nombre_corto, lema, descripcion,
  direccion, ciudad, mapa_query, email,
  whatsapp, whatsapp_mensaje, instagram, tiktok,
  alias_pago, sena_porcentaje, medios_pago, horarios
) values (
  '00000000-0000-4000-a000-000000000001', 'roble', 'Roble Barbería', 'demo',
  'Roble', 'El oficio de la barbería, bien hecho.',
  'Barbería premium en Buenos Aires. Cortes, barba y afeitado tradicional con navaja, en un ambiente pensado para que la pases bien.',
  'Av. del Roble 1420', 'CABA, Buenos Aires', 'Palermo, CABA, Buenos Aires', 'hola@roblebarberia.com.ar',
  '5491157641147', '¡Hola Roble! Quería hacer una consulta / reservar un turno.', 'roble.barberia', 'roble.barberia',
  'roble.barberia.mp', 40, array['Transferencia', 'Mercado Pago', 'Efectivo', 'Tarjetas']::text[],
  '[{"dia": "Lunes a Sábado", "horas": "10:00 – 20:00"}, {"dia": "Domingos", "horas": "Cerrado"}]'::jsonb
)
on conflict (id) do nothing;


-- ════════════════════════════════════════════════════════════════════════════
-- 3, 4 y 5) local_id EN CADA TABLA, CANDADO DOBLE Y CATEGORÍAS POR LOCAL
-- ════════════════════════════════════════════════════════════════════════════
-- Va en un bloque de código ("do") porque son los mismos pasos repetidos en
-- varias tablas: con un bucle no hay forma de saltearse un paso en alguna.
--
-- Cómo leerlo:
--   format('... %I ...', t) arma una instrucción poniendo el nombre de la tabla
--     donde está %I (y lo entrecomilla si hace falta). %L hace lo mismo con un
--     valor de texto.
--   execute corre esa instrucción.
--   pg_constraint es la tabla interna donde Postgres anota todas las reglas:
--     ahí se pregunta "¿ya existe una regla con este nombre?".
do $fase1$
declare
  -- El id de Roble (el mismo de arriba).
  roble constant uuid := '00000000-0000-4000-a000-000000000001';
  t text;       -- la tabla que se está procesando
  r record;     -- el vínculo que se está procesando
begin

  -- ── 3) local_id en las 10 tablas de la barbería ──────────────────────────
  -- No va en `profiles`: una cuenta es de toda la plataforma (un mail = una
  -- cuenta). A qué local pertenece cada persona lo va a decir la membresía,
  -- en la Fase 2.
  foreach t in array array[
    'barberos', 'categorias', 'servicios', 'productos', 'resenas',
    'turnos', 'pedidos', 'items_pedido', 'transacciones', 'mp_conexion'
  ] loop
    -- a. La columna, vacía.
    execute format('alter table public.%I add column if not exists local_id uuid', t);
    -- b. Todo lo que ya existe es de Roble.
    execute format('update public.%I set local_id = %L where local_id is null', t, roble);
    -- c. Valor por defecto TEMPORAL (se quita en la Fase 4).
    execute format('alter table public.%I alter column local_id set default %L', t, roble);
    -- d. Obligatoria: de acá en más no puede haber una fila sin local.
    execute format('alter table public.%I alter column local_id set not null', t);
    -- e. Tiene que apuntar a un local que exista. "restrict": no se puede
    --    borrar un local que todavía tiene datos.
    if not exists (select 1 from pg_constraint
                    where conname = t || '_local_id_fkey'
                      and conrelid = format('public.%I', t)::regclass) then
      execute format(
        'alter table public.%I add constraint %I foreign key (local_id) references public.locales (id) on delete restrict',
        t, t || '_local_id_fkey');
    end if;
  end loop;

  -- ── 4) Candado doble ─────────────────────────────────────────────────────
  -- Paso previo: en las tablas "madre", la pareja (local_id, id) se declara
  -- única. Ya lo era (id solo ya es único), pero Postgres necesita que esté
  -- dicho para que otra tabla pueda apuntar a esa pareja. De paso, esta regla
  -- crea el índice para buscar por local.
  foreach t in array array['barberos', 'servicios', 'categorias', 'productos', 'pedidos', 'turnos'] loop
    if not exists (select 1 from pg_constraint
                    where conname = t || '_local_id_id_key'
                      and conrelid = format('public.%I', t)::regclass) then
      execute format('alter table public.%I add constraint %I unique (local_id, id)', t, t || '_local_id_id_key');
    end if;
  end loop;

  -- Las 4 tablas que no son "madre" de nadie reciben un índice común por local.
  foreach t in array array['resenas', 'items_pedido', 'transacciones', 'mp_conexion'] loop
    execute format('create index if not exists %I on public.%I (local_id)', t || '_local_id_idx', t);
  end loop;

  -- Ahora sí: cada vínculo entre dos tablas de la barbería pasa de
  --     "este turno apunta a un barbero que existe"
  -- a   "este turno apunta a un barbero que existe EN SU MISMO LOCAL".
  -- Se logra apuntando con dos columnas a la vez: (local_id, barbero_id).
  --
  -- El vínculo viejo se REEMPLAZA (no se agrega otro al lado): la app pide
  -- "traeme el turno con su barbero" sin decir por qué vínculo, y con dos
  -- vínculos entre las mismas tablas la base no sabría cuál usar.
  -- Conserva el nombre (regla b) y lo que pasaba al borrar:
  --   restrict  → no deja borrar mientras alguien apunte
  --   cascade   → borra también lo que apuntaba
  --   set null  → deja vacío el dato (solo esa columna, nunca local_id)
  --   no action → igual que restrict, pero se revisa al final de la operación
  for r in
    select * from (values
      ('turnos',        'turnos_barbero_id_fkey',        'barbero_id',   'barberos',   'restrict'),
      ('turnos',        'turnos_servicio_id_fkey',       'servicio_id',  'servicios',  'restrict'),
      ('servicios',     'servicios_categoria_id_fkey',   'categoria_id', 'categorias', 'set null'),
      ('productos',     'productos_categoria_id_fkey',   'categoria_id', 'categorias', 'set null'),
      ('categorias',    'categorias_parent_id_fkey',     'parent_id',    'categorias', 'set null'),
      ('items_pedido',  'items_pedido_pedido_id_fkey',   'pedido_id',    'pedidos',    'cascade'),
      ('items_pedido',  'items_pedido_producto_id_fkey', 'producto_id',  'productos',  'no action'),
      ('transacciones', 'transacciones_turno_id_fkey',   'turno_id',     'turnos',     'set null'),
      ('transacciones', 'transacciones_pedido_id_fkey',  'pedido_id',    'pedidos',    'set null')
    ) as v (tabla, regla, columna, destino, al_borrar)
  loop
    -- Si todavía está la versión vieja (una sola columna), se saca.
    -- cardinality(conkey) = cantidad de columnas con las que apunta la regla.
    if exists (select 1 from pg_constraint
                where conname = r.regla
                  and conrelid = format('public.%I', r.tabla)::regclass
                  and cardinality(conkey) = 1) then
      execute format('alter table public.%I drop constraint %I', r.tabla, r.regla);
    end if;
    -- Y se crea la versión de dos columnas, si no está ya.
    if not exists (select 1 from pg_constraint
                    where conname = r.regla
                      and conrelid = format('public.%I', r.tabla)::regclass) then
      execute format(
        'alter table public.%I add constraint %I foreign key (local_id, %I) references public.%I (local_id, id) on delete %s',
        r.tabla, r.regla, r.columna, r.destino,
        case when r.al_borrar = 'set null' then format('set null (%I)', r.columna) else r.al_borrar end);
    end if;
  end loop;

  -- ── 5) Categorías: únicas por local ──────────────────────────────────────
  -- Antes: no podía haber dos categorías "cortes" de servicios en toda la
  -- base. Ahora: no puede haberlas dentro del mismo local (dos barberías sí
  -- pueden tener cada una la suya). Conserva el nombre de la regla (regla b),
  -- aunque ahora mire tres columnas.
  if exists (select 1 from pg_constraint
              where conname = 'categorias_tipo_slug_key'
                and conrelid = 'public.categorias'::regclass
                and cardinality(conkey) = 2) then
    alter table public.categorias drop constraint categorias_tipo_slug_key;
  end if;
  if not exists (select 1 from pg_constraint
                  where conname = 'categorias_tipo_slug_key'
                    and conrelid = 'public.categorias'::regclass) then
    alter table public.categorias add constraint categorias_tipo_slug_key unique (local_id, tipo, slug);
  end if;

end $fase1$;

-- Para comprobar todo esto: node scripts/verificar-locales.mjs
