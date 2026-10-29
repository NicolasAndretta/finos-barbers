-- 0017_marca_del_local.sql
-- La marca de cada local: su color de acento y su logo (todos los planes).
--
-- QUÉ HACE
--   1. `locales.acento`: el color de acento de su página y su panel, de una
--      paleta curada (madera, dorado, verde, azul, rojo, violeta). Vacío: el de
--      siempre (madera). Curada a propósito: sobre el fondo oscuro, un color
--      cualquiera puede quedar ilegible.
--   2. `locales.logo_url`: su logo, como imagen (se sube desde el panel, a la
--      carpeta del local, igual que las fotos). Vacío: el nombre dibujado.
--   3. Los datos públicos de un local (datos_del_local) los devuelven.
--
-- Los cambia quien edita los datos del local (como el resto de sus datos).
-- No borra datos. Es idempotente. NO toca nada de la web de 369.

alter table public.locales add column if not exists acento text;
alter table public.locales add column if not exists logo_url text;

do $regla$
begin
  if not exists (select 1 from pg_constraint where conname = 'locales_acento_check' and conrelid = 'public.locales'::regclass) then
    alter table public.locales add constraint locales_acento_check
      check (acento is null or acento in ('madera', 'dorado', 'verde', 'azul', 'rojo', 'violeta'));
  end if;
end $regla$;

comment on column public.locales.acento is
  'Color de acento de su página y su panel, de la paleta curada. Vacío: madera (el de siempre).';
comment on column public.locales.logo_url is
  'Su logo, subido desde el panel (bucket imagenes, carpeta del local). Vacío: el nombre dibujado.';

-- Igual que en la 0016, más la marca. Se borra antes de crearla porque cambia
-- lo que devuelve.
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
  tienda boolean, finanzas boolean, exportar boolean,
  acento text, logo_url text
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
         pl.tienda, pl.finanzas, pl.exportar,
         l.acento, l.logo_url
    from public.locales l
    join public.planes pl on pl.codigo = l.plan
   where l.slug = lower(p_slug);
$$;
revoke all on function public.datos_del_local(text) from public, anon, authenticated, service_role;
grant execute on function public.datos_del_local(text) to anon, authenticated, service_role;
