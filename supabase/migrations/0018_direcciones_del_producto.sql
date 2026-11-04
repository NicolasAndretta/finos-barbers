-- 0018_direcciones_del_producto.sql
-- La página de Retoque (04/11/2026) suma cuatro direcciones fijas: /terminos,
-- /privacidad, /arrepentimiento y /baja. Un local que se llamara así quedaría
-- tapado por esas páginas (las direcciones fijas ganan, ver 0008), así que se
-- reservan como las demás de la plataforma.
--
-- No cambia ningún dato: solo la regla de qué nombres puede tener un local.
-- Si algún local ya usara uno de esos nombres, la migración se frena y lo dice
-- (corre entera en una transacción: no queda nada a medias).
--
-- Convive con el código de antes: el código nuevo anda sin esta migración, y
-- esta migración no rompe el código viejo. Se puede correr antes o después.

do $$
declare
  v_slug text;
begin
  select slug into v_slug
    from public.locales
   where slug in ('terminos', 'privacidad', 'arrepentimiento', 'baja')
   limit 1;
  if v_slug is not null then
    raise exception 'El local "%" usa una dirección que ahora es de la plataforma: renombralo antes de correr esta migración.', v_slug;
  end if;
end $$;

alter table public.locales drop constraint if exists locales_slug_no_reservado;
alter table public.locales add constraint locales_slug_no_reservado
  check (slug <> all (array[
    -- de la plataforma
    'login', 'register', 'registro', 'recuperar', 'restablecer', 'auth', 'api',
    'plataforma', 'producto', 'precios', 'ayuda', 'soporte', 'app', 'www',
    'icon', 'apple-icon', 'manifest', 'robots', 'sitemap', 'favicon',
    -- de la página del producto (0018)
    'terminos', 'privacidad', 'arrepentimiento', 'baja',
    -- de la demo vieja (redirigen a /roble/...)
    'admin', 'barbero', 'dashboard', 'reservar', 'turnos', 'tienda', 'checkout'
  ]));
