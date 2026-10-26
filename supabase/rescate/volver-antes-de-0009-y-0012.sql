-- supabase/rescate/volver-antes-de-0009-y-0012.sql
--
-- SOLO PARA UNA EMERGENCIA en el pase a producción (docs/PASE-A-PRODUCCION.md).
-- No es una migración: por eso vive afuera de supabase/migrations, y
-- preparar-desarrollo.mjs no lo corre nunca.
--
-- PARA QUÉ
--   Si después del último paso del pase (la 0009 y la 0012 ya corridas) hubiera
--   que volver a publicar el código viejo de la demo, ese código no podría
--   guardar turnos ni pedidos: no dice de qué local son, y desde la 0009 la
--   base ya no completa "Roble" sola. Esto deja la base como estaba justo
--   antes de ese paso, que es como el código viejo funciona (probado en el
--   ensayo del pase):
--     1. Vuelve el "Roble por defecto" en las tablas que lo tenían (y en
--        mp_conexion, como estaba antes de la 0011).
--     2. Vuelve el disparador temporal de la Fase 2 (las cuentas de barbero
--        del código viejo se arman con el rol en el perfil).
--
-- No borra datos. Se puede correr dos veces. Después de correrlo, el código
-- viejo y el nuevo funcionan los dos: no hay apuro para nada más.

do $roble_por_defecto$
declare t text;
begin
  foreach t in array array[
    'barberos', 'categorias', 'servicios', 'productos', 'resenas',
    'turnos', 'pedidos', 'items_pedido', 'transacciones', 'mp_conexion'
  ] loop
    execute format('alter table public.%I alter column local_id set default %L', t, '00000000-0000-4000-a000-000000000001');
  end loop;
end $roble_por_defecto$;

-- El disparador temporal, igual que en la 0007.
create or replace function public.sincronizar_membresia_barbero()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_local uuid;
begin
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
revoke all on function public.sincronizar_membresia_barbero() from public, anon, authenticated;
