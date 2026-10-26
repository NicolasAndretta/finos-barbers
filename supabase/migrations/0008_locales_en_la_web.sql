-- 0008_locales_en_la_web.sql
-- Fase 3a: la web elige el local por la dirección (sitio/roble, sitio/otro-local).
--
-- QUÉ HACE
--   1. `rubro` en locales: barbería, uñas, pestañas, peluquería o estética.
--      Define las palabras que ve el cliente ("barbero", "manicura"...).
--   2. Direcciones reservadas: un local no se puede llamar "login", "admin",
--      "reservar"... porque esas direcciones ya las usa la plataforma (o
--      redirigen a Roble, para que los links viejos de la demo sigan andando).
--   3. `datos_del_local(slug)`: lo que la web pública necesita de un local
--      (nombre, dirección, WhatsApp, horarios...), sin abrir la tabla entera:
--      los visitantes no pueden leer `locales` (Fase 2) y así sigue.
--   4. `permisos_en_local(local)`: qué puede hacer en ESE local quien está
--      conectado, en una sola consulta. Con eso la app decide qué panel mostrar
--      (antes lo decidía con `profiles.role`, que es de toda la plataforma).
--
-- Es idempotente: se puede correr dos veces sin romper nada. No borra datos.
-- No toca nada de 369.


-- ════════════════════════════════════════════════════════════════════════════
-- 1) RUBRO DEL LOCAL
-- ════════════════════════════════════════════════════════════════════════════

alter table public.locales add column if not exists rubro text not null default 'barberia';

alter table public.locales drop constraint if exists locales_rubro_check;
alter table public.locales add constraint locales_rubro_check
  check (rubro in ('barberia', 'unas', 'pestanas', 'peluqueria', 'estetica'));


-- ════════════════════════════════════════════════════════════════════════════
-- 2) DIRECCIONES RESERVADAS
-- ════════════════════════════════════════════════════════════════════════════
-- La web de un local vive en /<slug>. Si un local se llamara "login", su página
-- quedaría tapada por la del login (las direcciones fijas ganan). Las de la
-- demo vieja (/reservar, /tienda, /admin...) redirigen a /roble/...

alter table public.locales drop constraint if exists locales_slug_no_reservado;
alter table public.locales add constraint locales_slug_no_reservado
  check (slug <> all (array[
    -- de la plataforma
    'login', 'register', 'registro', 'recuperar', 'restablecer', 'auth', 'api',
    'plataforma', 'producto', 'precios', 'ayuda', 'soporte', 'app', 'www',
    'icon', 'apple-icon', 'manifest', 'robots', 'sitemap', 'favicon',
    -- de la demo vieja (redirigen a /roble/...)
    'admin', 'barbero', 'dashboard', 'reservar', 'turnos', 'tienda', 'checkout'
  ]));


-- ════════════════════════════════════════════════════════════════════════════
-- 3) DATOS PÚBLICOS DE UN LOCAL
-- ════════════════════════════════════════════════════════════════════════════
-- Solo lo que ya se muestra en la web del local. NO devuelve quién lo creó ni
-- quién lo activó. Devuelve el estado para que la web sepa si mostrarlo
-- (demo y activo se muestran; suspendido y archivado, un aviso).

-- Se borra antes de crearla porque la 0010 cambia lo que devuelve: al volver a
-- correr todas las migraciones (preparar-desarrollo), "create or replace" no
-- puede cambiar esa forma. Es código, no datos; la 0010 la vuelve a crear.
drop function if exists public.datos_del_local(text);
create function public.datos_del_local(p_slug text)
returns table (
  id uuid, slug text, nombre text, estado text, rubro text,
  nombre_corto text, lema text, descripcion text,
  direccion text, ciudad text, mapa_query text, email text,
  whatsapp text, whatsapp_mensaje text, instagram text, tiktok text,
  alias_pago text, sena_porcentaje integer, medios_pago text[], horarios jsonb
)
language sql stable security definer set search_path = ''
as $$
  select l.id, l.slug, l.nombre, l.estado, l.rubro,
         l.nombre_corto, l.lema, l.descripcion,
         l.direccion, l.ciudad, l.mapa_query, l.email,
         l.whatsapp, l.whatsapp_mensaje, l.instagram, l.tiktok,
         l.alias_pago, l.sena_porcentaje, l.medios_pago, l.horarios
    from public.locales l
   where l.slug = lower(p_slug);
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 4) QUÉ PUEDE HACER QUIEN ESTÁ CONECTADO, EN UN LOCAL
-- ════════════════════════════════════════════════════════════════════════════
-- Reúne las reglas de la Fase 2 en una sola respuesta. Solo habla de quien
-- pregunta (auth.uid()): un visitante recibe todo en falso.

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
           limit 1);
$$;

-- Quién puede usarlas: todos. Una devuelve datos que ya son públicos; la otra
-- solo responde sobre quien pregunta.
do $permisos$
declare f text;
begin
  foreach f in array array['public.datos_del_local(text)', 'public.permisos_en_local(uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f);
    execute format('grant execute on function %s to anon, authenticated, service_role', f);
  end loop;
end $permisos$;
