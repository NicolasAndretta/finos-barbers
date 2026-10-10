-- ============================================================================
-- Migración 0000: esquema base (foto de la base de producción)
--
-- Generado por scripts/exportar-esquema.mjs el 2026-10-10
-- desde proyecto mcfgvxgcdnhgjbagrirr — entorno: produccion (Postgres 17.6).
--
-- QUÉ ES: la estructura completa que tenía la base de producción en ese
-- momento (tablas, reglas, funciones, disparadores, políticas RLS y
-- permisos), escrita como instrucciones SQL. Antes vivía solo en Supabase;
-- ahora queda versionada.
--
-- PARA QUÉ SIRVE: corrida sobre una base de Supabase vacía (la de
-- desarrollo) da una copia con la misma estructura. Después se corren 0001
-- a 0004, que sobre esta foto no cambian nada porque ya están incluidas
-- (están escritas para poder correrse dos veces), y de la 0005 en adelante,
-- los cambios para muchos locales.
--
-- REGLA: este archivo no se edita para arreglar cosas. Si algo está mal, el
-- arreglo va en una migración nueva (0005, 0006...). Esta foto tiene que
-- coincidir siempre con la base de producción el día que se sacó.
--
-- Se aplica con: node scripts/migrate.mjs (que la envuelve en una transacción:
-- o entra completa o no entra nada).
-- ============================================================================

-- Permite crear funciones que mencionan tablas o funciones que todavía no
-- existen en este punto del archivo. Se vuelve a activar al final.
set check_function_bodies = false;

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 1 · EXTENSIONES ══
-- Complementos de Postgres que usa la base (por ejemplo, para generar ids).
-- Supabase ya trae casi todos instalados: si ya están, no pasa nada.
-- ════════════════════════════════════════════════════════════════════════════

do $base$ begin
  create extension if not exists pg_stat_statements with schema extensions;
exception when others then
  raise notice '⚠️ No se pudo crear la extensión pg_stat_statements (%): se saltea.', sqlerrm;
end $base$;

do $base$ begin
  create extension if not exists pgcrypto with schema extensions;
exception when others then
  raise notice '⚠️ No se pudo crear la extensión pgcrypto (%): se saltea.', sqlerrm;
end $base$;

do $base$ begin
  create extension if not exists supabase_vault with schema vault;
exception when others then
  raise notice '⚠️ No se pudo crear la extensión supabase_vault (%): se saltea.', sqlerrm;
end $base$;

do $base$ begin
  create extension if not exists "uuid-ossp" with schema extensions;
exception when others then
  raise notice '⚠️ No se pudo crear la extensión uuid-ossp (%): se saltea.', sqlerrm;
end $base$;

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 2 · TIPOS PROPIOS ══
-- Listas cerradas de valores (enum) o tipos con reglas (domain) definidos a mano.
-- ════════════════════════════════════════════════════════════════════════════

-- (nada en esta sección)

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 3 · SECUENCIAS ══
-- Contadores que generan números correlativos (1, 2, 3...) para algunas columnas.
-- ════════════════════════════════════════════════════════════════════════════

-- (nada en esta sección)

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 4 · FUNCIONES QUE NECESITAN LAS TABLAS AL CREARSE ══
-- Funciones usadas como valor por defecto de alguna columna: van antes que las tablas.
-- ════════════════════════════════════════════════════════════════════════════

-- (nada en esta sección)

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 5 · TABLAS ══
-- Cada tabla se crea solo con sus columnas. Las reglas (clave primaria, únicas,
-- checks, claves foráneas) se agregan más abajo, cuando ya existen todas las
-- tablas: así no importa en qué orden se crean.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.barberos (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  apellido text not null,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  bio text,
  foto_url text,
  especialidad text,
  dias text[]
);

create table if not exists public.categorias (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  slug text not null,
  tipo text not null,
  parent_id uuid,
  orden integer default 0 not null,
  activo boolean default true not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.fotos (
  id uuid default gen_random_uuid() not null,
  trabajo_id uuid not null,
  etiqueta text not null,
  antes_url text,
  despues_url text not null,
  orden integer default 0 not null
);

create table if not exists public.items_pedido (
  id uuid default gen_random_uuid() not null,
  pedido_id uuid not null,
  producto_id uuid not null,
  nombre text not null,
  precio numeric(10,2) not null,
  cantidad integer not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.mp_conexion (
  id uuid default gen_random_uuid() not null,
  mp_user_id text,
  access_token text not null,
  refresh_token text,
  public_key text,
  expires_at timestamp with time zone,
  scope text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.pedidos (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  estado text default 'pendiente'::text not null,
  tipo_entrega text default 'retiro'::text not null,
  direccion_envio text,
  total numeric(10,2) not null,
  mp_preference_id text,
  mp_payment_id text,
  created_at timestamp with time zone default now(),
  cliente_nombre text,
  cliente_email text,
  cliente_telefono text
);

create table if not exists public.productos (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  descripcion text not null,
  precio numeric(10,2) not null,
  stock integer default 0 not null,
  imagen_url text,
  categoria text default 'otros'::text not null,
  activo boolean default true not null,
  created_at timestamp with time zone default now(),
  categoria_id uuid,
  stock_minimo integer default 3 not null
);

create table if not exists public.profiles (
  id uuid not null,
  email text not null,
  nombre text default ''::text not null,
  apellido text default ''::text not null,
  role text default 'client'::text not null,
  created_at timestamp with time zone default now() not null,
  barbero_id uuid
);

create table if not exists public.resenas (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  texto text not null,
  rating integer default 5 not null,
  visible boolean default false not null,
  orden integer default 0 not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.servicios (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  descripcion text default ''::text not null,
  precio numeric(10,2) not null,
  duracion_minutos integer not null,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  categoria_id uuid
);

create table if not exists public.trabajos (
  id uuid default gen_random_uuid() not null,
  servicio text not null,
  categoria text not null,
  vehiculo text default ''::text not null,
  visible boolean default true not null,
  en_inicio boolean default false not null,
  orden integer default 0 not null,
  creado_en timestamp with time zone default now() not null
);

create table if not exists public.transacciones (
  id uuid default gen_random_uuid() not null,
  tipo text not null,
  categoria text not null,
  monto numeric(12,2) not null,
  descripcion text not null,
  fecha date not null,
  origen text default 'manual'::text not null,
  turno_id uuid,
  pedido_id uuid,
  created_by uuid not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.turnos (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  barbero_id uuid not null,
  servicio_id uuid not null,
  fecha date not null,
  hora time without time zone not null,
  estado text default 'pendiente'::text not null,
  created_at timestamp with time zone default now() not null,
  metodo_pago text,
  sena_monto numeric,
  sena_estado text default 'pendiente'::text,
  mp_preference_id text,
  mp_payment_id text
);

create table if not exists public.videos (
  id uuid default gen_random_uuid() not null,
  titulo text not null,
  categoria text default 'Detailing'::text not null,
  instagram_code text,
  tiktok_id text,
  thumbnail_url text,
  visible boolean default true not null,
  orden integer default 0 not null,
  creado_en timestamp with time zone default now() not null,
  en_inicio boolean default false not null
);

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 6 · FUNCIONES ══
-- Funciones propias: por ejemplo is_admin(), que las políticas usan para saber
-- si quien consulta es administrador, o la que crea el perfil al registrarse.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, apellido, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre',  ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    'client'
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 7 · SECUENCIAS: A QUÉ COLUMNA PERTENECEN ══
-- Ata cada contador a su columna, para que si se borra la columna se borre el contador.
-- ════════════════════════════════════════════════════════════════════════════

-- (nada en esta sección)

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 8 · REGLAS DE CADA TABLA ══
-- Clave primaria (lo que identifica cada fila), valores únicos y checks
-- (por ejemplo, que el estado de un turno sea uno de una lista).
-- Cada una se agrega solo si todavía no existe.
-- ════════════════════════════════════════════════════════════════════════════

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'barberos_pkey' and conrelid = 'public.barberos'::regclass) then
    alter table public.barberos add constraint barberos_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'categorias_pkey' and conrelid = 'public.categorias'::regclass) then
    alter table public.categorias add constraint categorias_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'categorias_tipo_slug_key' and conrelid = 'public.categorias'::regclass) then
    alter table public.categorias add constraint categorias_tipo_slug_key UNIQUE (tipo, slug);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'categorias_tipo_check' and conrelid = 'public.categorias'::regclass) then
    alter table public.categorias add constraint categorias_tipo_check CHECK ((tipo = ANY (ARRAY['producto'::text, 'servicio'::text])));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'fotos_pkey' and conrelid = 'public.fotos'::regclass) then
    alter table public.fotos add constraint fotos_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'items_pedido_pkey' and conrelid = 'public.items_pedido'::regclass) then
    alter table public.items_pedido add constraint items_pedido_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'items_pedido_cantidad_check' and conrelid = 'public.items_pedido'::regclass) then
    alter table public.items_pedido add constraint items_pedido_cantidad_check CHECK ((cantidad > 0));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'mp_conexion_pkey' and conrelid = 'public.mp_conexion'::regclass) then
    alter table public.mp_conexion add constraint mp_conexion_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_pkey' and conrelid = 'public.pedidos'::regclass) then
    alter table public.pedidos add constraint pedidos_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_estado_check' and conrelid = 'public.pedidos'::regclass) then
    alter table public.pedidos add constraint pedidos_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'pagado'::text, 'cancelado'::text, 'enviado'::text])));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_tipo_entrega_check' and conrelid = 'public.pedidos'::regclass) then
    alter table public.pedidos add constraint pedidos_tipo_entrega_check CHECK ((tipo_entrega = ANY (ARRAY['retiro'::text, 'envio'::text])));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'productos_pkey' and conrelid = 'public.productos'::regclass) then
    alter table public.productos add constraint productos_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'productos_precio_check' and conrelid = 'public.productos'::regclass) then
    alter table public.productos add constraint productos_precio_check CHECK ((precio >= (0)::numeric));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'productos_stock_check' and conrelid = 'public.productos'::regclass) then
    alter table public.productos add constraint productos_stock_check CHECK ((stock >= 0));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_pkey' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_email_key' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_email_key UNIQUE (email);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_role_check CHECK ((role = ANY (ARRAY['client'::text, 'admin'::text, 'barbero'::text])));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'resenas_pkey' and conrelid = 'public.resenas'::regclass) then
    alter table public.resenas add constraint resenas_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'resenas_rating_check' and conrelid = 'public.resenas'::regclass) then
    alter table public.resenas add constraint resenas_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'servicios_pkey' and conrelid = 'public.servicios'::regclass) then
    alter table public.servicios add constraint servicios_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'servicios_duracion_minutos_check' and conrelid = 'public.servicios'::regclass) then
    alter table public.servicios add constraint servicios_duracion_minutos_check CHECK ((duracion_minutos > 0));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'servicios_precio_check' and conrelid = 'public.servicios'::regclass) then
    alter table public.servicios add constraint servicios_precio_check CHECK ((precio >= (0)::numeric));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'trabajos_pkey' and conrelid = 'public.trabajos'::regclass) then
    alter table public.trabajos add constraint trabajos_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'transacciones_pkey' and conrelid = 'public.transacciones'::regclass) then
    alter table public.transacciones add constraint transacciones_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'transacciones_monto_check' and conrelid = 'public.transacciones'::regclass) then
    alter table public.transacciones add constraint transacciones_monto_check CHECK ((monto > (0)::numeric));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'transacciones_origen_check' and conrelid = 'public.transacciones'::regclass) then
    alter table public.transacciones add constraint transacciones_origen_check CHECK ((origen = ANY (ARRAY['manual'::text, 'turno'::text, 'pedido'::text])));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'transacciones_tipo_check' and conrelid = 'public.transacciones'::regclass) then
    alter table public.transacciones add constraint transacciones_tipo_check CHECK ((tipo = ANY (ARRAY['ingreso'::text, 'egreso'::text])));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'turnos_pkey' and conrelid = 'public.turnos'::regclass) then
    alter table public.turnos add constraint turnos_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'turnos_estado_check' and conrelid = 'public.turnos'::regclass) then
    alter table public.turnos add constraint turnos_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'confirmado'::text, 'cancelado'::text])));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'turnos_metodo_pago_check' and conrelid = 'public.turnos'::regclass) then
    alter table public.turnos add constraint turnos_metodo_pago_check CHECK ((metodo_pago = ANY (ARRAY['mercadopago'::text, 'transferencia'::text, 'efectivo'::text])));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'turnos_sena_estado_check' and conrelid = 'public.turnos'::regclass) then
    alter table public.turnos add constraint turnos_sena_estado_check CHECK ((sena_estado = ANY (ARRAY['pendiente'::text, 'pagada'::text])));
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'videos_pkey' and conrelid = 'public.videos'::regclass) then
    alter table public.videos add constraint videos_pkey PRIMARY KEY (id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'videos_al_menos_una_plataforma' and conrelid = 'public.videos'::regclass) then
    alter table public.videos add constraint videos_al_menos_una_plataforma CHECK (((instagram_code IS NOT NULL) OR (tiktok_id IS NOT NULL)));
  end if;
end $base$;

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 9 · CLAVES FORÁNEAS ══
-- Vínculos entre tablas: por ejemplo, que un turno apunte a un barbero que existe.
-- ════════════════════════════════════════════════════════════════════════════

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'categorias_parent_id_fkey' and conrelid = 'public.categorias'::regclass) then
    alter table public.categorias add constraint categorias_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categorias(id) ON DELETE SET NULL;
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'fotos_trabajo_id_fkey' and conrelid = 'public.fotos'::regclass) then
    alter table public.fotos add constraint fotos_trabajo_id_fkey FOREIGN KEY (trabajo_id) REFERENCES public.trabajos(id) ON DELETE CASCADE;
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'items_pedido_pedido_id_fkey' and conrelid = 'public.items_pedido'::regclass) then
    alter table public.items_pedido add constraint items_pedido_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'items_pedido_producto_id_fkey' and conrelid = 'public.items_pedido'::regclass) then
    alter table public.items_pedido add constraint items_pedido_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_user_id_fkey' and conrelid = 'public.pedidos'::regclass) then
    alter table public.pedidos add constraint pedidos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'productos_categoria_id_fkey' and conrelid = 'public.productos'::regclass) then
    alter table public.productos add constraint productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_barbero_id_fkey' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_barbero_id_fkey FOREIGN KEY (barbero_id) REFERENCES public.barberos(id) ON DELETE SET NULL;
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_id_fkey' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'servicios_categoria_id_fkey' and conrelid = 'public.servicios'::regclass) then
    alter table public.servicios add constraint servicios_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'transacciones_created_by_fkey' and conrelid = 'public.transacciones'::regclass) then
    alter table public.transacciones add constraint transacciones_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'transacciones_pedido_id_fkey' and conrelid = 'public.transacciones'::regclass) then
    alter table public.transacciones add constraint transacciones_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE SET NULL;
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'transacciones_turno_id_fkey' and conrelid = 'public.transacciones'::regclass) then
    alter table public.transacciones add constraint transacciones_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id) ON DELETE SET NULL;
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'turnos_barbero_id_fkey' and conrelid = 'public.turnos'::regclass) then
    alter table public.turnos add constraint turnos_barbero_id_fkey FOREIGN KEY (barbero_id) REFERENCES public.barberos(id) ON DELETE RESTRICT;
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'turnos_cliente_id_fkey' and conrelid = 'public.turnos'::regclass) then
    alter table public.turnos add constraint turnos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  end if;
end $base$;

do $base$ begin
  if not exists (select 1 from pg_constraint where conname = 'turnos_servicio_id_fkey' and conrelid = 'public.turnos'::regclass) then
    alter table public.turnos add constraint turnos_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id) ON DELETE RESTRICT;
  end if;
end $base$;

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 10 · ÍNDICES ══
-- Atajos para que la base encuentre filas rápido sin recorrer la tabla entera.
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS barberos_activo_idx ON public.barberos USING btree (activo) WHERE (activo = true);

CREATE INDEX IF NOT EXISTS fotos_trabajo_idx ON public.fotos USING btree (trabajo_id, orden);

CREATE INDEX IF NOT EXISTS profiles_barbero_id_idx ON public.profiles USING btree (barbero_id);

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles USING btree (role);

CREATE INDEX IF NOT EXISTS servicios_activo_idx ON public.servicios USING btree (activo) WHERE (activo = true);

CREATE INDEX IF NOT EXISTS turnos_barbero_fecha_idx ON public.turnos USING btree (barbero_id, fecha);

CREATE INDEX IF NOT EXISTS turnos_cliente_idx ON public.turnos USING btree (cliente_id);

CREATE INDEX IF NOT EXISTS turnos_estado_idx ON public.turnos USING btree (estado);

CREATE INDEX IF NOT EXISTS turnos_fecha_idx ON public.turnos USING btree (fecha);

CREATE UNIQUE INDEX IF NOT EXISTS turnos_no_overlap_idx ON public.turnos USING btree (barbero_id, fecha, hora) WHERE (estado = ANY (ARRAY['pendiente'::text, 'confirmado'::text]));

CREATE INDEX IF NOT EXISTS videos_inicio_idx ON public.videos USING btree (en_inicio, orden);

CREATE INDEX IF NOT EXISTS videos_orden_idx ON public.videos USING btree (orden);

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 11 · VISTAS ══
-- Consultas guardadas con nombre, que se usan como si fueran tablas.
-- ════════════════════════════════════════════════════════════════════════════

-- (nada en esta sección)

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 12 · DISPARADORES ══
-- Acciones automáticas: por ejemplo, crear el perfil cuando alguien se registra.
-- ════════════════════════════════════════════════════════════════════════════

do $base$ begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass) then
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  end if;
exception when others then
  raise notice '⚠️ No se pudo crear el disparador on_auth_user_created de auth.users (%): se saltea.', sqlerrm;
end $base$;

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 13 · SEGURIDAD POR FILAS (RLS): ACTIVACIÓN ══
-- Con RLS activado, cada consulta que llega desde el navegador pasa por las
-- políticas de abajo: si ninguna la permite, no ve ni toca nada.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.barberos enable row level security;

alter table public.categorias enable row level security;

alter table public.fotos enable row level security;

alter table public.items_pedido enable row level security;

alter table public.mp_conexion enable row level security;

alter table public.pedidos enable row level security;

alter table public.productos enable row level security;

alter table public.profiles enable row level security;

alter table public.resenas enable row level security;

alter table public.servicios enable row level security;

alter table public.trabajos enable row level security;

alter table public.transacciones enable row level security;

alter table public.turnos enable row level security;

alter table public.videos enable row level security;

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 14 · POLÍTICAS RLS ══
-- Las reglas de quién puede ver o cambiar cada fila. "using" decide qué filas
-- se pueden ver o tocar; "with check" decide qué filas se pueden escribir.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "barberos: admin puede modificar" on public.barberos;
create policy "barberos: admin puede modificar" on public.barberos
  as permissive
  for all
  to public
  using (public.is_admin());

drop policy if exists "barberos: publico puede leer" on public.barberos;
create policy "barberos: publico puede leer" on public.barberos
  as permissive
  for select
  to public
  using (true);

drop policy if exists categorias_admin_all on public.categorias;
create policy categorias_admin_all on public.categorias
  as permissive
  for all
  to public
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists categorias_public_read on public.categorias;
create policy categorias_public_read on public.categorias
  as permissive
  for select
  to public
  using (true);

drop policy if exists items_pedido_admin_all on public.items_pedido;
create policy items_pedido_admin_all on public.items_pedido
  as permissive
  for all
  to public
  using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
  with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

drop policy if exists items_pedido_user_insert on public.items_pedido;
create policy items_pedido_user_insert on public.items_pedido
  as permissive
  for insert
  to public
  with check ((EXISTS ( SELECT 1
   FROM public.pedidos
  WHERE ((pedidos.id = items_pedido.pedido_id) AND (pedidos.user_id = auth.uid())))));

drop policy if exists items_pedido_user_select on public.items_pedido;
create policy items_pedido_user_select on public.items_pedido
  as permissive
  for select
  to public
  using ((EXISTS ( SELECT 1
   FROM public.pedidos
  WHERE ((pedidos.id = items_pedido.pedido_id) AND (pedidos.user_id = auth.uid())))));

drop policy if exists pedidos_admin_all on public.pedidos;
create policy pedidos_admin_all on public.pedidos
  as permissive
  for all
  to public
  using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
  with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

drop policy if exists pedidos_user_insert on public.pedidos;
create policy pedidos_user_insert on public.pedidos
  as permissive
  for insert
  to public
  with check ((user_id = auth.uid()));

drop policy if exists pedidos_user_select on public.pedidos;
create policy pedidos_user_select on public.pedidos
  as permissive
  for select
  to public
  using ((user_id = auth.uid()));

drop policy if exists productos_admin_all on public.productos;
create policy productos_admin_all on public.productos
  as permissive
  for all
  to public
  using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
  with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

drop policy if exists productos_select_activos on public.productos;
create policy productos_select_activos on public.productos
  as permissive
  for select
  to public
  using ((activo = true));

drop policy if exists "profiles: admin acceso total" on public.profiles;
create policy "profiles: admin acceso total" on public.profiles
  as permissive
  for all
  to public
  using (public.is_admin());

drop policy if exists "profiles: cliente actualiza su perfil" on public.profiles;
create policy "profiles: cliente actualiza su perfil" on public.profiles
  as permissive
  for update
  to public
  using ((auth.uid() = id))
  with check (((auth.uid() = id) AND (role = 'client'::text)));

drop policy if exists "profiles: cliente lee su perfil" on public.profiles;
create policy "profiles: cliente lee su perfil" on public.profiles
  as permissive
  for select
  to public
  using ((auth.uid() = id));

drop policy if exists resenas_admin_all on public.resenas;
create policy resenas_admin_all on public.resenas
  as permissive
  for all
  to public
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists resenas_public_read on public.resenas;
create policy resenas_public_read on public.resenas
  as permissive
  for select
  to public
  using ((visible = true));

drop policy if exists "servicios: admin puede modificar" on public.servicios;
create policy "servicios: admin puede modificar" on public.servicios
  as permissive
  for all
  to public
  using (public.is_admin());

drop policy if exists "servicios: publico puede leer" on public.servicios;
create policy "servicios: publico puede leer" on public.servicios
  as permissive
  for select
  to public
  using (true);

drop policy if exists transacciones_admin_all on public.transacciones;
create policy transacciones_admin_all on public.transacciones
  as permissive
  for all
  to public
  using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
  with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

drop policy if exists "turnos: admin acceso total" on public.turnos;
create policy "turnos: admin acceso total" on public.turnos
  as permissive
  for all
  to public
  using (public.is_admin());

drop policy if exists "turnos: cliente cancela su turno" on public.turnos;
create policy "turnos: cliente cancela su turno" on public.turnos
  as permissive
  for update
  to public
  using ((auth.uid() = cliente_id))
  with check (((auth.uid() = cliente_id) AND (estado = 'cancelado'::text)));

drop policy if exists "turnos: cliente crea turno propio" on public.turnos;
create policy "turnos: cliente crea turno propio" on public.turnos
  as permissive
  for insert
  to public
  with check (((auth.uid() = cliente_id) AND (estado = 'pendiente'::text)));

drop policy if exists "turnos: cliente ve sus turnos" on public.turnos;
create policy "turnos: cliente ve sus turnos" on public.turnos
  as permissive
  for select
  to public
  using ((auth.uid() = cliente_id));

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 15 · PERMISOS POR ROL ══
-- Qué puede hacer cada tipo de conexión: anon (visitante sin cuenta),
-- authenticated (usuario logueado) y service_role (el servidor). Primero se
-- limpian y después se dan exactamente los mismos que había en el original.
-- ════════════════════════════════════════════════════════════════════════════

revoke all on table public.barberos from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.barberos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.barberos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.barberos to service_role;

revoke all on table public.categorias from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.categorias to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.categorias to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.categorias to service_role;

revoke all on table public.fotos from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.fotos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.fotos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.fotos to service_role;

revoke all on table public.items_pedido from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.items_pedido to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.items_pedido to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.items_pedido to service_role;

revoke all on table public.mp_conexion from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.mp_conexion to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.mp_conexion to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.mp_conexion to service_role;

revoke all on table public.pedidos from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.pedidos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.pedidos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.pedidos to service_role;

revoke all on table public.productos from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.productos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.productos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.productos to service_role;

revoke all on table public.profiles from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.profiles to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.profiles to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.profiles to service_role;

revoke all on table public.resenas from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.resenas to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.resenas to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.resenas to service_role;

revoke all on table public.servicios from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.servicios to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.servicios to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.servicios to service_role;

revoke all on table public.trabajos from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.trabajos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.trabajos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.trabajos to service_role;

revoke all on table public.transacciones from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.transacciones to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.transacciones to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.transacciones to service_role;

revoke all on table public.turnos from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.turnos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.turnos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.turnos to service_role;

revoke all on table public.videos from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.videos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.videos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.videos to service_role;

revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
grant execute on function public.handle_new_user() to anon;
grant execute on function public.handle_new_user() to authenticated;
grant execute on function public.handle_new_user() to public;
grant execute on function public.handle_new_user() to service_role;

revoke all on function public.is_admin() from public, anon, authenticated, service_role;
grant execute on function public.is_admin() to anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to public;
grant execute on function public.is_admin() to service_role;

revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role;
grant execute on function public.rls_auto_enable() to anon;
grant execute on function public.rls_auto_enable() to authenticated;
grant execute on function public.rls_auto_enable() to public;
grant execute on function public.rls_auto_enable() to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 16 · COMENTARIOS ══
-- Notas que quedaron guardadas en la base sobre tablas, columnas y funciones.
-- ════════════════════════════════════════════════════════════════════════════

-- (nada en esta sección)

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 17 · REALTIME ══
-- Tablas que avisan en vivo a la app cuando cambian.
-- ════════════════════════════════════════════════════════════════════════════

-- (nada en esta sección)

-- ════════════════════════════════════════════════════════════════════════════
-- ══ 18 · STORAGE: BUCKETS ══
-- Carpetas de archivos de Supabase (por ejemplo, "imagenes" para fotos de
-- productos y barberos). Solo se crea la carpeta, no se copian archivos.
-- ════════════════════════════════════════════════════════════════════════════

do $base$ begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('galeria', 'galeria', true, null, null)
  on conflict (id) do nothing;
exception when others then
  raise notice '⚠️ No se pudo crear el bucket galeria (%): se saltea.', sqlerrm;
end $base$;

do $base$ begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('imagenes', 'imagenes', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[])
  on conflict (id) do nothing;
exception when others then
  raise notice '⚠️ No se pudo crear el bucket imagenes (%): se saltea.', sqlerrm;
end $base$;

-- ════════════════════════════════════════════════════════════════════════════
-- Fin de la foto: se vuelve a validar el código de las funciones al crearlas.
reset check_function_bodies;
