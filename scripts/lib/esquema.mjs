/**
 * scripts/lib/esquema.mjs
 *
 * Saca una "foto" de la estructura de una base de Supabase y la convierte en
 * un archivo SQL que, corrido sobre un proyecto vacío, la vuelve a armar igual.
 *
 * ─── Cómo funciona (para estudiar) ──────────────────────────────────────────
 * Postgres guarda la descripción de todo lo que tiene (tablas, columnas,
 * reglas, funciones, políticas...) en unas tablas internas llamadas
 * "catálogo": pg_class (tablas), pg_attribute (columnas), pg_constraint
 * (reglas), pg_proc (funciones), pg_policies (políticas RLS), etc.
 *
 * Este archivo hace tres cosas:
 *   1. leerEsquema()  → consulta el catálogo y junta todo en un objeto.
 *   2. generarSQL()   → recorre ese objeto y escribe, para cada cosa, la
 *                       instrucción SQL que la crea. Muchas de esas
 *                       instrucciones las redacta el propio Postgres con
 *                       pg_get_constraintdef(), pg_get_functiondef(), etc.
 *   3. generarSeed() y generarReporte() → datos de ejemplo para desarrollo y
 *                       un resumen legible con alertas de seguridad.
 *
 * Además, compararSQL() pone dos fotos una al lado de la otra y dice en qué
 * se diferencian (sirve para comprobar que desarrollo quedó igual a la foto).
 *
 * ─── Qué entra en la foto ────────────────────────────────────────────────────
 * Entra: todo lo del esquema "public" (lo nuestro), los disparadores que las
 * tablas de Supabase (auth.users, storage.objects) tienen apuntando a
 * funciones nuestras, y los buckets y políticas de Storage.
 * No entra: cuentas de usuarios, turnos, pedidos, tokens, ni la configuración
 * que vive en el panel de Supabase (plantillas de mail, URLs de redirección).
 */

// ─── Secciones del archivo generado ─────────────────────────────────────────
// El orden importa: cada cosa se crea cuando ya existe lo que necesita.
// `informativa: true` → al comparar dos fotos, una diferencia en esa sección
// es un aviso y no un error (por ejemplo, un proyecto nuevo de Supabase puede
// traer alguna extensión de más instalada de fábrica).
export const SECCIONES = [
  {
    n: 1, titulo: 'EXTENSIONES', informativa: true,
    explicacion: [
      'Complementos de Postgres que usa la base (por ejemplo, para generar ids).',
      'Supabase ya trae casi todos instalados: si ya están, no pasa nada.',
    ],
  },
  {
    n: 2, titulo: 'TIPOS PROPIOS',
    explicacion: [
      'Listas cerradas de valores (enum) o tipos con reglas (domain) definidos a mano.',
    ],
  },
  {
    n: 3, titulo: 'SECUENCIAS',
    explicacion: [
      'Contadores que generan números correlativos (1, 2, 3...) para algunas columnas.',
    ],
  },
  {
    n: 4, titulo: 'FUNCIONES QUE NECESITAN LAS TABLAS AL CREARSE',
    explicacion: [
      'Funciones usadas como valor por defecto de alguna columna: van antes que las tablas.',
    ],
  },
  {
    n: 5, titulo: 'TABLAS',
    explicacion: [
      'Cada tabla se crea solo con sus columnas. Las reglas (clave primaria, únicas,',
      'checks, claves foráneas) se agregan más abajo, cuando ya existen todas las',
      'tablas: así no importa en qué orden se crean.',
    ],
  },
  {
    n: 6, titulo: 'FUNCIONES',
    explicacion: [
      'Funciones propias: por ejemplo is_admin(), que las políticas usan para saber',
      'si quien consulta es administrador, o la que crea el perfil al registrarse.',
    ],
  },
  {
    n: 7, titulo: 'SECUENCIAS: A QUÉ COLUMNA PERTENECEN',
    explicacion: [
      'Ata cada contador a su columna, para que si se borra la columna se borre el contador.',
    ],
  },
  {
    n: 8, titulo: 'REGLAS DE CADA TABLA',
    explicacion: [
      'Clave primaria (lo que identifica cada fila), valores únicos y checks',
      '(por ejemplo, que el estado de un turno sea uno de una lista).',
      'Cada una se agrega solo si todavía no existe.',
    ],
  },
  {
    n: 9, titulo: 'CLAVES FORÁNEAS',
    explicacion: [
      'Vínculos entre tablas: por ejemplo, que un turno apunte a un barbero que existe.',
    ],
  },
  {
    n: 10, titulo: 'ÍNDICES',
    explicacion: [
      'Atajos para que la base encuentre filas rápido sin recorrer la tabla entera.',
    ],
  },
  {
    n: 11, titulo: 'VISTAS',
    explicacion: [
      'Consultas guardadas con nombre, que se usan como si fueran tablas.',
    ],
  },
  {
    n: 12, titulo: 'DISPARADORES',
    explicacion: [
      'Acciones automáticas: por ejemplo, crear el perfil cuando alguien se registra.',
    ],
  },
  {
    n: 13, titulo: 'SEGURIDAD POR FILAS (RLS): ACTIVACIÓN',
    explicacion: [
      'Con RLS activado, cada consulta que llega desde el navegador pasa por las',
      'políticas de abajo: si ninguna la permite, no ve ni toca nada.',
    ],
  },
  {
    n: 14, titulo: 'POLÍTICAS RLS',
    explicacion: [
      'Las reglas de quién puede ver o cambiar cada fila. "using" decide qué filas',
      'se pueden ver o tocar; "with check" decide qué filas se pueden escribir.',
    ],
  },
  {
    n: 15, titulo: 'PERMISOS POR ROL',
    explicacion: [
      'Qué puede hacer cada tipo de conexión: anon (visitante sin cuenta),',
      'authenticated (usuario logueado) y service_role (el servidor). Primero se',
      'limpian y después se dan exactamente los mismos que había en el original.',
    ],
  },
  {
    n: 16, titulo: 'COMENTARIOS',
    explicacion: [
      'Notas que quedaron guardadas en la base sobre tablas, columnas y funciones.',
    ],
  },
  {
    n: 17, titulo: 'REALTIME',
    explicacion: [
      'Tablas que avisan en vivo a la app cuando cambian.',
    ],
  },
  {
    n: 18, titulo: 'STORAGE: BUCKETS',
    explicacion: [
      'Carpetas de archivos de Supabase (por ejemplo, "imagenes" para fotos de',
      'productos y barberos). Solo se crea la carpeta, no se copian archivos.',
    ],
  },
]

// Delimitador de los bloques "do $base$ ... $base$" (bloques de código que
// Postgres ejecuta en el momento). Si apareciera adentro de una definición,
// el archivo quedaría roto: por eso se controla antes de usarlo.
const DELIM = '$base$'

/** Condición SQL: "este objeto NO vino instalado por una extensión". */
function noEsDeExtension(catalogo, alias) {
  return `not exists (select 1 from pg_depend dep
                       where dep.classid = '${catalogo}'::regclass
                         and dep.objid = ${alias}.oid
                         and dep.deptype = 'e')`
}

// ─── Consultas al catálogo ───────────────────────────────────────────────────
// Convención: las columnas que terminan en _q ya vienen con el nombre
// "entrecomillado" como lo necesita SQL (format('%I') / quote_ident), y las
// que terminan en _lit vienen como texto literal ('así'). Lo hace Postgres,
// así no hay que reinventar las reglas de comillas.

const SQL_EXTENSIONES = `
  select e.extname as nombre, n.nspname as esquema,
         format('create extension if not exists %I with schema %I;', e.extname, n.nspname) as sql
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
   where e.extname <> 'plpgsql'
   order by e.extname`

const SQL_TIPOS = `
  select t.typname as nombre,
         format('public.%I', t.typname) as nombre_q,
         quote_literal(t.typname) as nombre_lit,
         t.typtype as clase,
         (select string_agg(quote_literal(en.enumlabel), ', ' order by en.enumsortorder)
            from pg_enum en where en.enumtypid = t.oid) as etiquetas,
         case when t.typtype = 'd' then format_type(t.typbasetype, t.typtypmod) end as base,
         t.typnotnull as no_nulo,
         t.typdefault as defecto,
         (select string_agg(format('constraint %I %s', k.conname, pg_get_constraintdef(k.oid)), ' ' order by k.conname)
            from pg_constraint k where k.contypid = t.oid) as checks
    from pg_type t
   where t.typnamespace = 'public'::regnamespace
     and (t.typtype in ('e', 'd', 'r')
          or (t.typtype = 'c' and exists (select 1 from pg_class c where c.oid = t.typrelid and c.relkind = 'c')))
     and ${noEsDeExtension('pg_type', 't')}
   order by t.typname`

// Secuencias "sueltas": las de las columnas identity se crean solas con la
// columna (deptype 'i'), así que no se listan.
const SQL_SECUENCIAS = `
  select c.relname as nombre,
         format('public.%I', c.relname) as nombre_q,
         format_type(s.seqtypid, null) as tipo,
         s.seqstart::text as inicio, s.seqincrement::text as incremento,
         s.seqmin::text as minimo, s.seqmax::text as maximo,
         s.seqcache::text as cache, s.seqcycle as ciclica,
         (select format('public.%I.%I', tc.relname, a.attname)
            from pg_depend d
            join pg_class tc on tc.oid = d.refobjid
            join pg_attribute a on a.attrelid = d.refobjid and a.attnum = d.refobjsubid
           where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'a'
             and tc.relnamespace = 'public'::regnamespace
           limit 1) as duena
    from pg_class c
    join pg_sequence s on s.seqrelid = c.oid
   where c.relnamespace = 'public'::regnamespace
     and c.relkind = 'S'
     and not exists (select 1 from pg_depend d
                      where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'i')
     and ${noEsDeExtension('pg_class', 'c')}
   order by c.relname`

const SQL_TABLAS = `
  select c.relname as nombre,
         format('public.%I', c.relname) as nombre_q,
         c.relkind as clase,
         c.relispartition as es_particion,
         c.relrowsecurity as rls,
         c.relforcerowsecurity as rls_forzado,
         quote_nullable(obj_description(c.oid, 'pg_class')) as comentario_lit
    from pg_class c
   where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r', 'p')
     and ${noEsDeExtension('pg_class', 'c')}
   order by c.relname`

const SQL_COLUMNAS = `
  select c.relname as tabla,
         format('public.%I', c.relname) as tabla_q,
         a.attnum as num,
         a.attname as nombre,
         quote_ident(a.attname) as nombre_q,
         format_type(a.atttypid, a.atttypmod) as tipo,
         a.attnotnull as no_nula,
         pg_get_expr(ad.adbin, ad.adrelid) as defecto,
         a.attidentity::text as identidad,
         a.attgenerated::text as generada,
         case when a.attcollation <> 0 and a.attcollation <> ty.typcollation then
           (select format('%I.%I', cn.nspname, co.collname)
              from pg_collation co join pg_namespace cn on cn.oid = co.collnamespace
             where co.oid = a.attcollation)
         end as intercalacion,
         quote_nullable(col_description(c.oid, a.attnum)) as comentario_lit
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_type ty on ty.oid = a.atttypid
    left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
   where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r', 'p')
     and a.attnum > 0
     and not a.attisdropped
     and ${noEsDeExtension('pg_class', 'c')}
   order by c.relname, a.attnum`

// pg_get_functiondef no funciona con agregados ni funciones de ventana: por
// eso solo se pide para funciones ('f') y procedimientos ('p').
const SQL_FUNCIONES = `
  select p.proname as nombre,
         format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid)) as firma,
         p.prokind::text as clase,
         case when p.prokind in ('f', 'p') then pg_get_functiondef(p.oid) end as definicion,
         p.prosecdef as security_definer,
         p.proconfig as config,
         l.lanname as lenguaje,
         p.prosrc as fuente,
         quote_nullable(obj_description(p.oid, 'pg_proc')) as comentario_lit,
         exists (select 1
                   from pg_depend d
                   join pg_attrdef ad on ad.oid = d.objid
                  where d.classid = 'pg_attrdef'::regclass
                    and d.refclassid = 'pg_proc'::regclass
                    and d.refobjid = p.oid) as usada_en_defaults
    from pg_proc p
    join pg_language l on l.oid = p.prolang
   where p.pronamespace = 'public'::regnamespace
     and ${noEsDeExtension('pg_proc', 'p')}
   order by p.proname, pg_get_function_identity_arguments(p.oid)`

const SQL_RESTRICCIONES = `
  select c.relname as tabla,
         format('public.%I', c.relname) as tabla_q,
         quote_literal(format('public.%I', c.relname)) as tabla_lit,
         k.conname as nombre,
         quote_ident(k.conname) as nombre_q,
         quote_literal(k.conname) as nombre_lit,
         k.contype::text as clase,
         pg_get_constraintdef(k.oid) as definicion,
         (k.contype = 'f' and k.confrelid = k.conrelid) as autorreferencia,
         rn.nspname as ref_esquema,
         rc.relname as ref_tabla,
         (select array_agg(a.attname::text order by u.ord)
            from unnest(k.conkey) with ordinality as u(attnum, ord)
            join pg_attribute a on a.attrelid = k.conrelid and a.attnum = u.attnum) as columnas
    from pg_constraint k
    join pg_class c on c.oid = k.conrelid
    left join pg_class rc on rc.oid = k.confrelid
    left join pg_namespace rn on rn.oid = rc.relnamespace
   where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r', 'p')
     and k.contype in ('p', 'u', 'x', 'c', 'f')
     and k.conislocal
     and ${noEsDeExtension('pg_class', 'c')}
   order by c.relname, k.conname`

// Índices "sueltos": los que crean solas la clave primaria y las reglas
// únicas no se listan (se recrean al recrear esas reglas).
const SQL_INDICES = `
  select c.relname as tabla, i.relname as nombre, pg_get_indexdef(x.indexrelid) as definicion
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    join pg_class c on c.oid = x.indrelid
   where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r', 'p')
     and not exists (select 1 from pg_constraint k
                      where k.conindid = x.indexrelid and k.conrelid = x.indrelid
                        and k.contype in ('p', 'u', 'x'))
     and ${noEsDeExtension('pg_class', 'i')}
   order by c.relname, i.relname`

const SQL_VISTAS = `
  select c.relname as nombre,
         format('public.%I', c.relname) as nombre_q,
         c.relkind::text as clase,
         pg_get_viewdef(c.oid) as definicion,
         array_to_string(c.reloptions, ', ') as opciones
    from pg_class c
   where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('v', 'm')
     and ${noEsDeExtension('pg_class', 'c')}
   order by c.relname`

// Disparadores de nuestras tablas, y también los de auth/storage que llaman
// a funciones nuestras (el típico: crear el perfil al registrarse).
const SQL_DISPARADORES = `
  select n.nspname as esquema,
         c.relname as tabla,
         format('%I.%I', n.nspname, c.relname) as tabla_q,
         quote_literal(format('%I.%I', n.nspname, c.relname)) as tabla_lit,
         t.tgname as nombre,
         quote_ident(t.tgname) as nombre_q,
         quote_literal(t.tgname) as nombre_lit,
         pg_get_triggerdef(t.oid) as definicion,
         pn.nspname as funcion_esquema,
         p.proname as funcion,
         t.tgenabled::text as estado
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace pn on pn.oid = p.pronamespace
   where not t.tgisinternal
     and (n.nspname = 'public' or (n.nspname in ('auth', 'storage') and pn.nspname = 'public'))
   order by n.nspname, c.relname, t.tgname`

const SQL_POLITICAS = `
  select p.schemaname as esquema,
         p.tablename as tabla,
         format('%I.%I', p.schemaname, p.tablename) as tabla_q,
         p.policyname as nombre,
         quote_ident(p.policyname) as nombre_q,
         p.permissive as tipo,
         p.roles::text[] as roles,
         array(select case when r = 'public' then 'public' else quote_ident(r) end
                 from unnest(p.roles) as r)::text[] as roles_q,
         p.cmd as comando,
         p.qual as usando,
         p.with_check as chequeo
    from pg_policies p
   where p.schemaname in ('public', 'storage')
   order by p.schemaname, p.tablename, p.policyname`

// Todos los objetos con permisos propios (tablas, vistas, secuencias)...
const SQL_OBJETOS_CON_PERMISOS = `
  select format('public.%I', c.relname) as objeto_q, c.relkind::text as clase
    from pg_class c
   where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r', 'p', 'v', 'm', 'S')
     and not c.relispartition
     and ${noEsDeExtension('pg_class', 'c')}
   order by c.relname`

// ...y qué permiso tiene cada rol sobre cada uno. aclexplode() "desarma" la
// lista de permisos que Postgres guarda en relacl. grantee = 0 es PUBLIC
// (todos los roles a la vez).
const SQL_PERMISOS_TABLAS = `
  select format('public.%I', c.relname) as objeto_q,
         case when g.grantee = 0 then 'public' else quote_ident(r.rolname) end as rol,
         lower(g.privilege_type) as privilegio
    from pg_class c
   cross join lateral aclexplode(c.relacl) as g
    left join pg_roles r on r.oid = g.grantee
   where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r', 'p', 'v', 'm', 'S')
     and not c.relispartition
     and (g.grantee = 0 or r.rolname in ('anon', 'authenticated', 'service_role'))
     and ${noEsDeExtension('pg_class', 'c')}
   order by 1, 2, 3`

// Permisos de ejecutar cada función. proacl vacío (null) quiere decir "lo
// que viene de fábrica": cualquiera puede ejecutarla.
const SQL_PERMISOS_FUNCIONES = `
  select format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid)) as firma,
         p.prokind::text as clase,
         p.proacl is null as por_defecto,
         coalesce((select array_agg(distinct case when g.grantee = 0 then 'public' else quote_ident(r.rolname) end)
                     from aclexplode(p.proacl) as g
                     left join pg_roles r on r.oid = g.grantee
                    where g.privilege_type = 'EXECUTE'
                      and (g.grantee = 0 or r.rolname in ('anon', 'authenticated', 'service_role'))),
                  '{}')::text[] as roles
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.prokind in ('f', 'p')
     and ${noEsDeExtension('pg_proc', 'p')}
   order by p.proname, pg_get_function_identity_arguments(p.oid)`

const SQL_PUBLICACIONES = `
  select p.pubname as publicacion,
         quote_ident(p.pubname) as publicacion_q,
         quote_literal(p.pubname) as publicacion_lit,
         pt.tablename as tabla,
         format('public.%I', pt.tablename) as tabla_q,
         quote_literal(pt.tablename) as tabla_lit
    from pg_publication p
    join pg_publication_tables pt on pt.pubname = p.pubname
   where pt.schemaname = 'public'
     and not p.puballtables
   order by p.pubname, pt.tablename`

// Esquemas que no son nuestros ni de Supabase: si aparece alguno, el reporte
// avisa, porque la foto no los incluye.
const SQL_OTROS_ESQUEMAS = `
  select n.nspname as nombre
    from pg_namespace n
   where n.nspname not like 'pg\\_%'
     and n.nspname not in ('public', 'information_schema', 'auth', 'storage', 'extensions',
                           'graphql', 'graphql_public', 'realtime', '_realtime',
                           'supabase_functions', 'supabase_migrations', 'vault', 'pgsodium',
                           'pgsodium_masks', 'net', 'cron', 'pgbouncer', '_analytics', 'pgmq',
                           'pgmq_public', 'pgtle', 'repack', '_supavisor', 'topology')
     and ${noEsDeExtension('pg_namespace', 'n')}
   order by 1`

/**
 * Lee todo el catálogo y devuelve un objeto con una lista por tipo de cosa.
 * `q` es una función (sql) => filas. Se espera que la conexión ya esté en
 * modo solo lectura y con search_path vacío (ver lib/postgres.mjs).
 */
export async function leerEsquema(q) {
  const [{ server_version: version }] = await q('show server_version')
  const [{ hay: hayStorage }] = await q("select to_regclass('storage.buckets') is not null as hay")
  return {
    version,
    extensiones: await q(SQL_EXTENSIONES),
    tipos: await q(SQL_TIPOS),
    secuencias: await q(SQL_SECUENCIAS),
    tablas: await q(SQL_TABLAS),
    columnas: await q(SQL_COLUMNAS),
    funciones: await q(SQL_FUNCIONES),
    restricciones: await q(SQL_RESTRICCIONES),
    indices: await q(SQL_INDICES),
    vistas: await q(SQL_VISTAS),
    disparadores: await q(SQL_DISPARADORES),
    politicas: await q(SQL_POLITICAS),
    objetosConPermisos: await q(SQL_OBJETOS_CON_PERMISOS),
    permisosTablas: await q(SQL_PERMISOS_TABLAS),
    permisosFunciones: await q(SQL_PERMISOS_FUNCIONES),
    publicaciones: await q(SQL_PUBLICACIONES),
    buckets: hayStorage
      ? (await q('select to_jsonb(b) as fila from storage.buckets as b order by b.id')).map((r) => r.fila)
      : [],
    otrosEsquemas: (await q(SQL_OTROS_ESQUEMAS)).map((r) => r.nombre),
  }
}

// ─── Ayudantes para escribir SQL ─────────────────────────────────────────────

/** Agrupa una lista de objetos por el valor de una propiedad. */
function agruparPor(lista, clave) {
  const grupos = {}
  for (const item of lista) (grupos[item[clave]] ??= []).push(item)
  return grupos
}

/** Frena si un texto trae el delimitador de bloque (rompería el archivo). */
function controlarDelimitador(...textos) {
  if (textos.some((t) => t.includes(DELIM))) {
    throw new Error(`Una definición contiene ${DELIM} y rompería el archivo generado.`)
  }
}

/**
 * Cierre de bloque para cosas que viven en esquemas de Supabase (auth,
 * storage) o que dependen del proyecto (extensiones): si fallan, en vez de
 * frenar toda la migración, se muestra un aviso con ⚠️ y se sigue. La
 * comparación posterior deja ver qué quedó sin crear.
 * (En el texto del aviso, % es un comodín de Postgres: por eso se duplica.)
 */
function avisoSiFalla(descripcion) {
  const texto = descripcion.replace(/'/g, "''").replace(/%/g, '%%')
  return `exception when others then\n  raise notice '⚠️ No se pudo crear ${texto} (%): se saltea.', sqlerrm;\n`
}

/**
 * Corre `instruccion` solo si la consulta `condicion` no devuelve filas.
 * Con `descripcionSiFalla`, un error se convierte en aviso (ver avisoSiFalla).
 */
function siNoExiste(condicion, instruccion, descripcionSiFalla = null) {
  controlarDelimitador(condicion, instruccion)
  const sangrada = instruccion.split('\n').map((l) => `    ${l}`).join('\n')
  return `do ${DELIM} begin\n  if not exists (${condicion}) then\n${sangrada}\n  end if;\n` +
    (descripcionSiFalla ? avisoSiFalla(descripcionSiFalla) : '') +
    `end ${DELIM};`
}

/** Corre `instruccion` y, si falla, avisa y sigue (ver avisoSiFalla). */
function tolerante(instruccion, descripcion) {
  controlarDelimitador(instruccion)
  const sangrada = instruccion.split('\n').map((l) => `  ${l}`).join('\n')
  return `do ${DELIM} begin\n${sangrada}\n${avisoSiFalla(descripcion)}end ${DELIM};`
}

/** Convierte un valor de JavaScript en un literal de SQL ('texto', 12, true, null). */
function literal(valor) {
  if (valor === null || valor === undefined) return 'null'
  if (typeof valor === 'boolean') return valor ? 'true' : 'false'
  if (typeof valor === 'number') return String(valor)
  if (Array.isArray(valor)) return `array[${valor.map(literal).join(', ')}]::text[]`
  return `'${String(valor).replace(/'/g, "''")}'`
}

/** Comenta cada línea de un bloque (para dejar algo escrito pero sin ejecutarse). */
function comentado(texto) {
  return texto.split('\n').map((l) => `-- ${l}`).join('\n')
}

/** Escribe la definición de una columna: nombre, tipo, valor por defecto, obligatoria. */
function definirColumna(c) {
  let d = `${c.nombre_q} ${c.tipo}`
  if (c.intercalacion) d += ` collate ${c.intercalacion}`
  if (c.generada === 's') d += ` generated always as (${c.defecto}) stored`
  else if (c.generada === 'v') d += ` generated always as (${c.defecto}) virtual`
  else if (c.identidad === 'a') d += ' generated always as identity'
  else if (c.identidad === 'd') d += ' generated by default as identity'
  else if (c.defecto != null) d += ` default ${c.defecto}`
  if (c.no_nula) d += ' not null'
  return d
}

// Esquemas desde donde un disparador puede llamar funciones y aun así
// recrearse en un proyecto nuevo (extensions trae, por ejemplo, moddatetime).
const ESQUEMAS_FUNCION_OK = ['public', 'extensions', 'pg_catalog']

// Orden de las reglas dentro de cada tabla: primaria, únicas, exclusión, checks.
const ORDEN_REGLAS = { p: 0, u: 1, x: 2, c: 3 }

const LINEA = '-- ════════════════════════════════════════════════════════════════════════════'

/** Línea que marca el comienzo de cada sección (compararSQL la usa para cortar). */
function marcaSeccion(n, titulo) {
  return `-- ══ ${n} · ${titulo} ══`
}
const RE_MARCA = /^-- ══ (\d+) · (.+) ══$/

/**
 * Arma el texto completo de la migración base a partir del esquema leído.
 * `meta` = { fecha, origen, version } — solo se usa en el encabezado.
 */
export function generarSQL(e, meta) {
  const sec = Object.fromEntries(SECCIONES.map((s) => [s.n, []]))

  // 1. Extensiones. Si un proyecto nuevo ya no ofrece alguna (pasa con
  // extensiones viejas de Supabase), se avisa y se sigue.
  for (const x of e.extensiones) sec[1].push(tolerante(x.sql, `la extensión ${x.nombre}`))

  // 2. Tipos propios
  for (const t of e.tipos) {
    const condicion = `select 1 from pg_type where typname = ${t.nombre_lit} and typnamespace = 'public'::regnamespace`
    if (t.clase === 'e') {
      sec[2].push(siNoExiste(condicion, `create type ${t.nombre_q} as enum (${t.etiquetas ?? ''});`))
    } else if (t.clase === 'd') {
      let def = `create domain ${t.nombre_q} as ${t.base}`
      if (t.defecto) def += ` default ${t.defecto}`
      if (t.no_nulo) def += ' not null'
      if (t.checks) def += ` ${t.checks}`
      sec[2].push(siNoExiste(condicion, `${def};`))
    } else {
      sec[2].push(`-- ⚠️ El tipo ${t.nombre_q} (clase "${t.clase}") no se exporta solo: hay que crearlo a mano.`)
    }
  }

  // 3. Secuencias sueltas
  for (const s of e.secuencias) {
    sec[3].push(
      `create sequence if not exists ${s.nombre_q} as ${s.tipo} increment by ${s.incremento}` +
        ` minvalue ${s.minimo} maxvalue ${s.maximo} start with ${s.inicio} cache ${s.cache}` +
        `${s.ciclica ? ' cycle' : ''};`,
    )
  }

  // 4 y 6. Funciones: las que usan los valores por defecto van antes que las tablas.
  for (const f of e.funciones) {
    if (f.clase !== 'f' && f.clase !== 'p') {
      sec[6].push(`-- ⚠️ ${f.firma} es un agregado o función de ventana: no se exporta solo.`)
      continue
    }
    sec[f.usada_en_defaults ? 4 : 6].push(`${f.definicion.trimEnd()};`)
  }

  // 5. Tablas (solo columnas)
  const columnasPorTabla = agruparPor(e.columnas, 'tabla')
  for (const t of e.tablas) {
    if (t.clase === 'p' || t.es_particion) {
      sec[5].push(`-- ⚠️ ${t.nombre_q} es una tabla particionada (o una partición): no se exporta sola.`)
      continue
    }
    const columnas = (columnasPorTabla[t.nombre] ?? []).map((c) => `  ${definirColumna(c)}`)
    sec[5].push(`create table if not exists ${t.nombre_q} (\n${columnas.join(',\n')}\n);`)
  }

  // 7. Secuencias: dueña
  for (const s of e.secuencias) {
    if (s.duena) sec[7].push(`alter sequence ${s.nombre_q} owned by ${s.duena};`)
  }

  // 8. Reglas (sin claves foráneas) y 9. claves foráneas
  const reglaSiNoExiste = (k) =>
    siNoExiste(
      `select 1 from pg_constraint where conname = ${k.nombre_lit} and conrelid = ${k.tabla_lit}::regclass`,
      `alter table ${k.tabla_q} add constraint ${k.nombre_q} ${k.definicion};`,
    )
  const reglas = e.restricciones
    .filter((k) => k.clase !== 'f')
    .sort((a, b) =>
      a.tabla.localeCompare(b.tabla) ||
      ORDEN_REGLAS[a.clase] - ORDEN_REGLAS[b.clase] ||
      a.nombre.localeCompare(b.nombre))
  for (const k of reglas) sec[8].push(reglaSiNoExiste(k))
  for (const k of e.restricciones.filter((x) => x.clase === 'f')) sec[9].push(reglaSiNoExiste(k))

  // 10. Índices
  for (const i of e.indices) {
    sec[10].push(`${i.definicion.replace(/^CREATE (UNIQUE )?INDEX /, (_, u) => `CREATE ${u ?? ''}INDEX IF NOT EXISTS `)};`)
  }

  // 11. Vistas
  for (const v of e.vistas) {
    if (v.clase === 'm') {
      sec[11].push(`-- ⚠️ ${v.nombre_q} es una vista materializada: no se exporta sola.`)
      continue
    }
    const opciones = v.opciones ? ` with (${v.opciones})` : ''
    sec[11].push(`create or replace view ${v.nombre_q}${opciones} as\n${v.definicion.trim().replace(/;$/, '')};`)
  }

  // 12. Disparadores. Los que van sobre tablas de Supabase (auth.users,
  // storage.objects) son tolerantes: si el proyecto no deja crearlos, avisa.
  for (const d of e.disparadores) {
    const bloque = siNoExiste(
      `select 1 from pg_trigger where tgname = ${d.nombre_lit} and tgrelid = ${d.tabla_lit}::regclass`,
      `${d.definicion};`,
      d.esquema === 'public' ? null : `el disparador ${d.nombre} de ${d.esquema}.${d.tabla}`,
    )
    if (!ESQUEMAS_FUNCION_OK.includes(d.funcion_esquema)) {
      sec[12].push(
        `-- ⚠️ El disparador ${d.nombre_q} llama a ${d.funcion_esquema}.${d.funcion}, que no es nuestra\n` +
          `-- (por ejemplo, un webhook armado desde el panel). Queda escrito pero sin ejecutarse:\n` +
          comentado(bloque),
      )
      continue
    }
    sec[12].push(bloque)
    if (d.estado === 'D') sec[12].push(`alter table ${d.tabla_q} disable trigger ${d.nombre_q};`)
  }

  // 13. RLS
  for (const t of e.tablas) {
    if (t.rls) sec[13].push(`alter table ${t.nombre_q} enable row level security;`)
    if (t.rls_forzado) sec[13].push(`alter table ${t.nombre_q} force row level security;`)
  }

  // 14. Políticas (se borran y se vuelven a crear: así quedan exactamente iguales)
  for (const p of e.politicas) {
    let def =
      `create policy ${p.nombre_q} on ${p.tabla_q}\n` +
      `  as ${p.tipo.toLowerCase()}\n` +
      `  for ${p.comando.toLowerCase()}\n` +
      `  to ${p.roles_q.join(', ')}`
    if (p.usando != null) def += `\n  using (${p.usando})`
    if (p.chequeo != null) def += `\n  with check (${p.chequeo})`
    const sql = `drop policy if exists ${p.nombre_q} on ${p.tabla_q};\n${def};`
    // Las de Storage son tolerantes (la tabla es de Supabase, no nuestra).
    sec[14].push(p.esquema === 'public' ? sql : tolerante(sql, `la política "${p.nombre}" de ${p.esquema}.${p.tabla}`))
  }

  // 15. Permisos: primero se limpian y después se dan los mismos del original.
  const permisos = {}
  for (const p of e.permisosTablas) ((permisos[p.objeto_q] ??= {})[p.rol] ??= []).push(p.privilegio)
  for (const o of e.objetosConPermisos) {
    const tipo = o.clase === 'S' ? 'sequence' : 'table'
    const lineas = [`revoke all on ${tipo} ${o.objeto_q} from public, anon, authenticated, service_role;`]
    for (const [rol, privs] of Object.entries(permisos[o.objeto_q] ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
      lineas.push(`grant ${[...privs].sort().join(', ')} on ${tipo} ${o.objeto_q} to ${rol};`)
    }
    sec[15].push(lineas.join('\n'))
  }
  for (const f of e.permisosFunciones) {
    const tipo = f.clase === 'p' ? 'procedure' : 'function'
    const roles = f.por_defecto ? ['public'] : [...f.roles].sort()
    const lineas = [`revoke all on ${tipo} ${f.firma} from public, anon, authenticated, service_role;`]
    for (const rol of roles) lineas.push(`grant execute on ${tipo} ${f.firma} to ${rol};`)
    sec[15].push(lineas.join('\n'))
  }

  // 16. Comentarios
  for (const t of e.tablas) {
    if (t.comentario_lit !== 'NULL') sec[16].push(`comment on table ${t.nombre_q} is ${t.comentario_lit};`)
  }
  for (const c of e.columnas) {
    if (c.comentario_lit !== 'NULL') sec[16].push(`comment on column ${c.tabla_q}.${c.nombre_q} is ${c.comentario_lit};`)
  }
  for (const f of e.funciones) {
    if (f.comentario_lit !== 'NULL' && (f.clase === 'f' || f.clase === 'p')) {
      sec[16].push(`comment on ${f.clase === 'p' ? 'procedure' : 'function'} ${f.firma} is ${f.comentario_lit};`)
    }
  }

  // 17. Realtime: solo si en el destino existe la misma publicación.
  for (const p of e.publicaciones) {
    sec[17].push(
      `do ${DELIM} begin\n` +
        `  if exists (select 1 from pg_publication where pubname = ${p.publicacion_lit})\n` +
        `     and not exists (select 1 from pg_publication_tables\n` +
        `                      where pubname = ${p.publicacion_lit} and schemaname = 'public' and tablename = ${p.tabla_lit}) then\n` +
        `    alter publication ${p.publicacion_q} add table ${p.tabla_q};\n` +
        `  end if;\n` +
        `end ${DELIM};`,
    )
  }

  // 18. Buckets de Storage
  for (const b of e.buckets) {
    const cols = ['id', 'name', 'public', 'file_size_limit', 'allowed_mime_types'].filter((k) => k in b)
    sec[18].push(tolerante(
      `insert into storage.buckets (${cols.join(', ')})\n` +
        `values (${cols.map((k) => literal(b[k])).join(', ')})\n` +
        `on conflict (id) do nothing;`,
      `el bucket ${b.id}`,
    ))
  }

  // ── Armado final ──
  const partes = [
    '-- ============================================================================',
    '-- Migración 0000: esquema base (foto de la base de producción)',
    '--',
    `-- Generado por scripts/exportar-esquema.mjs el ${meta.fecha}`,
    `-- desde ${meta.origen} (Postgres ${meta.version}).`,
    '--',
    '-- QUÉ ES: la estructura completa que tenía la base de producción en ese',
    '-- momento (tablas, reglas, funciones, disparadores, políticas RLS y',
    '-- permisos), escrita como instrucciones SQL. Antes vivía solo en Supabase;',
    '-- ahora queda versionada.',
    '--',
    '-- PARA QUÉ SIRVE: corrida sobre una base de Supabase vacía (la de',
    '-- desarrollo) da una copia con la misma estructura. Después se corren 0001',
    '-- a 0004, que sobre esta foto no cambian nada porque ya están incluidas',
    '-- (están escritas para poder correrse dos veces), y de la 0005 en adelante,',
    '-- los cambios para muchos locales.',
    '--',
    '-- REGLA: este archivo no se edita para arreglar cosas. Si algo está mal, el',
    '-- arreglo va en una migración nueva (0005, 0006...). Esta foto tiene que',
    '-- coincidir siempre con la base de producción el día que se sacó.',
    '--',
    '-- Se aplica con: node scripts/migrate.mjs (que la envuelve en una transacción:',
    '-- o entra completa o no entra nada).',
    '-- ============================================================================',
    '',
    '-- Permite crear funciones que mencionan tablas o funciones que todavía no',
    '-- existen en este punto del archivo. Se vuelve a activar al final.',
    'set check_function_bodies = false;',
    '',
  ]
  for (const s of SECCIONES) {
    partes.push(LINEA, marcaSeccion(s.n, s.titulo), ...s.explicacion.map((l) => `-- ${l}`), LINEA, '')
    partes.push(sec[s.n].length ? sec[s.n].join('\n\n') : '-- (nada en esta sección)', '')
  }
  partes.push(LINEA, '-- Fin de la foto: se vuelve a validar el código de las funciones al crearlas.', 'reset check_function_bodies;', '')
  return partes.join('\n')
}

// ─── Datos de ejemplo para desarrollo ────────────────────────────────────────

/**
 * Tablas cuyos datos se copian a desarrollo. Son las del catálogo del local:
 * lo mismo que ya muestra la web pública. NO se copian cuentas (profiles),
 * turnos, pedidos, transacciones ni tokens de Mercado Pago (mp_conexion).
 */
export const TABLAS_SEED = ['categorias', 'servicios', 'barberos', 'productos', 'resenas']

/**
 * Ordena las tablas para que cada una se cargue después de las que necesita
 * (por ejemplo, categorías antes que productos, porque cada producto apunta a
 * una categoría). Es un "orden topológico": se visita primero lo que cada
 * tabla necesita y recién después la tabla.
 */
function ordenarPorDependencias(tablas, fks) {
  const necesita = new Map(tablas.map((t) => [t, new Set()]))
  for (const k of fks) {
    if (tablas.includes(k.tabla) && k.ref_esquema === 'public' && tablas.includes(k.ref_tabla) && k.ref_tabla !== k.tabla) {
      necesita.get(k.tabla).add(k.ref_tabla)
    }
  }
  const orden = []
  const listas = new Set()
  const enCurso = new Set()
  const visitar = (t) => {
    if (listas.has(t) || enCurso.has(t)) return // ya está, o hay un círculo: no insistimos
    enCurso.add(t)
    for (const dep of [...necesita.get(t)].sort()) visitar(dep)
    enCurso.delete(t)
    listas.add(t)
    orden.push(t)
  }
  for (const t of [...tablas].sort()) visitar(t)
  return orden
}

/**
 * Genera el SQL que carga en desarrollo los datos de las TABLAS_SEED.
 *
 * Cómo carga cada tabla: mete todas sus filas como un texto JSON y deja que
 * Postgres lo convierta en filas con jsonb_populate_recordset(). Así no hay
 * que preocuparse por fechas, números o listas: Postgres los traduce solo.
 *
 * Detalles que resuelve:
 *   - Columnas que apuntan a tablas que NO se copian (por ejemplo, a una
 *     cuenta de usuario): se cargan vacías (null). Si la columna es
 *     obligatoria, esa tabla se saltea y se avisa.
 *   - Columnas que apuntan a la misma tabla (categorías con categoría madre):
 *     primero se cargan vacías y después se completan con un update, porque
 *     la madre podría cargarse después que la hija.
 *   - "on conflict do nothing": si el dato ya estaba, no se duplica. Se puede
 *     correr dos veces sin problema.
 */
export async function generarSeed(q, e, meta) {
  const existentes = new Set(e.tablas.map((t) => t.nombre))
  const tablas = TABLAS_SEED.filter((t) => existentes.has(t))
  const fks = e.restricciones.filter((k) => k.clase === 'f')
  const columnasPorTabla = agruparPor(e.columnas, 'tabla')
  const tablaPorNombre = Object.fromEntries(e.tablas.map((t) => [t.nombre, t]))
  const avisos = []
  const resumen = []
  const bloques = []
  const SEED = '$seed$'

  for (const tabla of ordenarPorDependencias(tablas, fks)) {
    const t = tablaPorNombre[tabla]
    const columnas = (columnasPorTabla[tabla] ?? []).filter((c) => !c.generada)
    const fksTabla = fks.filter((k) => k.tabla === tabla)
    const anular = new Set()
    const autorref = []
    let saltear = false

    for (const k of fksTabla) {
      const apuntaACopiada = k.ref_esquema === 'public' && tablas.includes(k.ref_tabla)
      if (k.autorreferencia) autorref.push(k)
      if (k.autorreferencia || !apuntaACopiada) {
        for (const col of k.columnas) {
          const c = columnas.find((x) => x.nombre === col)
          if (c?.no_nula) {
            saltear = true
            avisos.push(`\`${tabla}\` no se copió: la columna obligatoria \`${col}\` apunta a ${k.ref_esquema}.${k.ref_tabla}, que no se copia.`)
          } else if (c) {
            anular.add(col)
          }
        }
      }
    }
    if (saltear) continue

    const [{ filas }] = await q(
      `select coalesce(jsonb_agg(to_jsonb(t) order by t::text), '[]'::jsonb) as filas from ${t.nombre_q} as t`,
    )
    resumen.push({ tabla, filas: filas.length })
    if (filas.length === 0) continue

    const nombres = new Set(columnas.map((c) => c.nombre))
    const limpias = filas.map((fila) => {
      const limpia = {}
      for (const [k, v] of Object.entries(fila)) {
        if (nombres.has(k)) limpia[k] = anular.has(k) ? null : v
      }
      return limpia
    })
    const json = JSON.stringify(limpias, null, 2)
    if (json.includes(SEED)) throw new Error(`Los datos de ${tabla} contienen ${SEED}.`)

    const lista = columnas.map((c) => c.nombre_q).join(', ')
    const forzarIds = columnas.some((c) => c.identidad === 'a') ? '\noverriding system value' : ''
    bloques.push(
      `-- ${tabla}: ${filas.length} fila(s)` +
        (anular.size ? `. Se cargan vacías: ${[...anular].join(', ')} (apuntan a datos que no se copian).` : '') +
        `\ninsert into ${t.nombre_q} (${lista})${forzarIds}\n` +
        `select ${lista}\n` +
        `  from jsonb_populate_recordset(null::${t.nombre_q}, ${SEED}\n${json}\n${SEED}::jsonb)\n` +
        `on conflict do nothing;`,
    )

    // Segunda pasada para las columnas que apuntan a la misma tabla.
    const pk = e.restricciones.find((k) => k.tabla === tabla && k.clase === 'p')
    for (const k of autorref) {
      if (!pk || pk.columnas.length !== 1 || k.columnas.length !== 1) {
        avisos.push(`\`${tabla}\`: la referencia ${k.nombre} queda vacía (no se pudo completar sola).`)
        continue
      }
      const id = pk.columnas[0]
      const col = k.columnas[0]
      const pares = filas.filter((f) => f[col] != null).map((f) => ({ [id]: f[id], [col]: f[col] }))
      if (pares.length === 0) continue
      const idQ = columnas.find((c) => c.nombre === id).nombre_q
      const colQ = columnas.find((c) => c.nombre === col).nombre_q
      bloques.push(
        `-- ${tabla}: ahora que están todas las filas, se completa ${col}\n` +
          `update ${t.nombre_q} as destino\n` +
          `   set ${colQ} = origen.${colQ}\n` +
          `  from jsonb_populate_recordset(null::${t.nombre_q}, ${SEED}\n${JSON.stringify(pares, null, 2)}\n${SEED}::jsonb) as origen\n` +
          ` where destino.${idQ} = origen.${idQ};`,
      )
    }
  }

  const encabezado = [
    '-- ============================================================================',
    '-- Datos de ejemplo para el proyecto de DESARROLLO',
    '--',
    `-- Generado por scripts/exportar-esquema.mjs el ${meta.fecha}`,
    `-- desde ${meta.origen}.`,
    '--',
    `-- Copia el catálogo de Roble, el local de demostración (${TABLAS_SEED.join(', ')}):`,
    '-- lo mismo que ya muestra la web pública. NO incluye cuentas, turnos, pedidos,',
    '-- movimientos de caja ni tokens de Mercado Pago.',
    '--',
    '-- Se carga solo en desarrollo, con: node scripts/preparar-desarrollo.mjs',
    '-- ============================================================================',
    '',
  ]
  return {
    sql: encabezado.join('\n') + (bloques.length ? bloques.join('\n\n') : '-- (no había datos para copiar)') + '\n',
    resumen,
    avisos,
  }
}

// ─── Alertas y reporte ───────────────────────────────────────────────────────

/**
 * Busca problemas típicos de seguridad en el esquema leído. Son pistas para
 * revisar a mano, no veredictos: cada alerta dice qué mirar y por qué.
 *   🔴 grave · 🟠 revisar · ℹ️ informativo
 */
export function calcularAlertas(e) {
  const alertas = []
  const politicasPorTabla = agruparPor(e.politicas.filter((p) => p.esquema === 'public'), 'tabla')

  for (const t of e.tablas) {
    if (!t.rls) {
      alertas.push(['🔴', `La tabla \`${t.nombre}\` no tiene RLS activado: con la clave pública (la que viaja en el navegador) cualquiera podría leerla y modificarla.`])
    } else if (!politicasPorTabla[t.nombre]) {
      alertas.push(['ℹ️', `\`${t.nombre}\` tiene RLS y ninguna política: solo el servidor (service role) la puede usar. Está bien si es a propósito (por ejemplo, tokens).`])
    }
  }

  for (const f of e.funciones) {
    const fijaSearchPath = (f.config ?? []).some((c) => c.startsWith('search_path='))
    if (f.security_definer && !fijaSearchPath) {
      alertas.push(['🟠', `\`${f.firma}\` corre con permisos de su dueño (security definer) y no fija search_path: alguien podría engañarla creando objetos con el mismo nombre en otro esquema.`])
    }
    if (/raw_user_meta_data/i.test(f.fuente ?? '') && /\brole\b/i.test(f.fuente ?? '')) {
      alertas.push(['🔴', `\`${f.firma}\` lee \`raw_user_meta_data\` y menciona \`role\`. Revisar: si copia el rol que manda el navegador al registrarse, cualquiera podría crearse una cuenta de admin.`])
    }
  }

  for (const p of e.politicas) {
    const escribe = ['INSERT', 'UPDATE', 'DELETE', 'ALL'].includes(p.comando)
    const abierta = p.usando === 'true' || p.chequeo === 'true'
    const paraTodos = p.roles.some((r) => ['public', 'anon', 'authenticated'].includes(r))
    if (escribe && abierta && paraTodos) {
      alertas.push(['🔴', `La política "${p.nombre}" en \`${p.esquema}.${p.tabla}\` deja ${p.comando.toLowerCase()} sin condiciones a ${p.roles.join(', ')}.`])
    }
  }

  const editaPerfil = e.politicas.filter(
    (p) => p.esquema === 'public' && p.tabla === 'profiles' && ['UPDATE', 'ALL'].includes(p.comando) &&
      !/is_admin/i.test(`${p.usando ?? ''} ${p.chequeo ?? ''}`),
  )
  if (editaPerfil.length) {
    alertas.push(['🟠', `En \`profiles\` hay políticas que dejan a cada usuario editar su fila (${editaPerfil.map((p) => `"${p.nombre}"`).join(', ')}). Revisar que no pueda cambiarse su propia columna \`role\`.`])
  }

  for (const d of e.disparadores) {
    if (!ESQUEMAS_FUNCION_OK.includes(d.funcion_esquema)) {
      alertas.push(['🟠', `El disparador \`${d.nombre}\` (${d.esquema}.${d.tabla}) llama a \`${d.funcion_esquema}.${d.funcion}\`: no se recrea solo en desarrollo.`])
    }
  }
  for (const t of e.tipos) if (!['e', 'd'].includes(t.clase)) alertas.push(['🟠', `El tipo \`${t.nombre}\` no se exporta solo.`])
  for (const v of e.vistas) if (v.clase === 'm') alertas.push(['🟠', `La vista materializada \`${v.nombre}\` no se exporta sola.`])
  for (const t of e.tablas) if (t.clase === 'p' || t.es_particion) alertas.push(['🟠', `La tabla \`${t.nombre}\` es particionada: no se exporta sola.`])
  for (const f of e.funciones) if (f.clase !== 'f' && f.clase !== 'p') alertas.push(['🟠', `\`${f.firma}\` (agregado o de ventana) no se exporta sola.`])
  for (const n of e.otrosEsquemas) alertas.push(['🟠', `Existe el esquema \`${n}\`, que la foto no incluye. Revisar qué tiene.`])

  const orden = { '🔴': 0, '🟠': 1, 'ℹ️': 2 }
  return alertas.sort((a, b) => orden[a[0]] - orden[b[0]])
}

/** Escapa los | para que no rompan las tablas de Markdown. */
function md(texto) {
  return String(texto ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
}

/** Arma el reporte legible (Markdown) que acompaña a la foto. */
export function generarReporte(e, meta, { seed, alertas }) {
  const L = []
  const politicasPorTabla = agruparPor(e.politicas, 'tabla_q')
  const columnasPorTabla = agruparPor(e.columnas, 'tabla')
  const fksPorTabla = agruparPor(e.restricciones.filter((k) => k.clase === 'f'), 'tabla')

  L.push('# Esquema de la base — reporte', '')
  L.push(`Generado por \`scripts/exportar-esquema.mjs\` el ${meta.fecha} desde ${meta.origen} (Postgres ${meta.version}).`, '')
  L.push('> Resumen para leer de un vistazo lo que hay en `supabase/migrations/0000_base.sql`.')
  L.push('> No hace falta editarlo: se vuelve a generar con cada exportación.', '')

  L.push('## Resumen', '')
  L.push(`- **${e.tablas.length}** tablas, **${e.politicas.length}** políticas RLS, **${e.funciones.length}** funciones, **${e.disparadores.length}** disparadores, **${e.indices.length}** índices sueltos.`)
  L.push(`- Storage: ${e.buckets.length ? e.buckets.map((b) => `bucket \`${b.id}\` (${b.public ? 'público' : 'privado'})`).join(', ') : 'sin buckets'}.`)
  L.push('')

  L.push('## Alertas para revisar', '')
  if (alertas.length === 0) L.push('Ninguna. ✓')
  for (const [nivel, texto] of alertas) L.push(`- ${nivel} ${texto}`)
  L.push('', '🔴 grave · 🟠 revisar · ℹ️ informativo', '')

  L.push('## Tablas', '')
  for (const t of e.tablas) {
    const pols = politicasPorTabla[t.nombre_q] ?? []
    L.push(`### \`${t.nombre}\``, '')
    L.push(`- RLS: ${t.rls ? 'activado ✓' : '**desactivado** ✗'} · Políticas: ${pols.length}`)
    const cols = (columnasPorTabla[t.nombre] ?? []).map((c) => `\`${c.nombre}\` ${c.tipo}${c.no_nula ? ' (obligatoria)' : ''}`)
    L.push(`- Columnas: ${cols.join(', ')}`)
    const fks = fksPorTabla[t.nombre] ?? []
    if (fks.length) L.push(`- Apunta a: ${fks.map((k) => `\`${k.columnas.join(', ')}\` → \`${k.ref_esquema}.${k.ref_tabla}\``).join(', ')}`)
    for (const p of pols) {
      L.push(`- Política **"${md(p.nombre)}"** — ${p.comando.toLowerCase()} para ${p.roles.join(', ')}` +
        (p.usando != null ? ` · ve/toca filas si: \`${md(p.usando)}\`` : '') +
        (p.chequeo != null ? ` · escribe filas si: \`${md(p.chequeo)}\`` : ''))
    }
    L.push('')
  }

  const pStorage = e.politicas.filter((p) => p.esquema === 'storage')
  if (pStorage.length) {
    L.push('## Políticas de Storage', '')
    for (const p of pStorage) {
      L.push(`- **"${md(p.nombre)}"** en \`${p.tabla}\` — ${p.comando.toLowerCase()} para ${p.roles.join(', ')}` +
        (p.usando != null ? ` · si: \`${md(p.usando)}\`` : '') +
        (p.chequeo != null ? ` · escribe si: \`${md(p.chequeo)}\`` : ''))
    }
    L.push('')
  }

  L.push('## Funciones', '')
  if (e.funciones.length === 0) L.push('Ninguna.')
  for (const f of e.funciones) {
    const sp = (f.config ?? []).some((c) => c.startsWith('search_path='))
    L.push(`- \`${f.firma}\` — ${f.lenguaje}${f.security_definer ? ', security definer' : ''}${f.security_definer ? (sp ? ', search_path fijo ✓' : ', **sin search_path fijo**') : ''}`)
  }
  L.push('')

  L.push('## Disparadores', '')
  if (e.disparadores.length === 0) L.push('Ninguno.')
  for (const d of e.disparadores) L.push(`- \`${d.nombre}\` en \`${d.esquema}.${d.tabla}\` → \`${d.funcion_esquema}.${d.funcion}()\``)
  L.push('')

  L.push('## Datos de ejemplo para desarrollo (`supabase/seed-desarrollo.sql`)', '')
  if (seed.resumen.length === 0) L.push('No se copió ninguna tabla.')
  for (const r of seed.resumen) L.push(`- \`${r.tabla}\`: ${r.filas} fila(s)`)
  for (const a of seed.avisos) L.push(`- ⚠️ ${a}`)
  L.push('')
  return L.join('\n')
}

// ─── Comparar dos fotos ──────────────────────────────────────────────────────

/** Corta el texto en secciones y saca comentarios y líneas vacías. */
function seccionar(texto) {
  const secciones = new Map()
  let actual = null
  for (const linea of texto.split(/\r?\n/)) {
    const m = linea.match(RE_MARCA)
    if (m) {
      actual = Number(m[1])
      secciones.set(actual, [])
      continue
    }
    if (actual === null) continue // el encabezado (fecha, origen) no se compara
    const limpia = linea.trimEnd()
    if (limpia === '' || limpia.trimStart().startsWith('--')) continue
    secciones.get(actual).push(limpia)
  }
  return secciones
}

/** Líneas de `a` que no están en `b` (respetando repeticiones). */
function faltantes(a, b) {
  const cuenta = new Map()
  for (const l of b) cuenta.set(l, (cuenta.get(l) ?? 0) + 1)
  const solo = []
  for (const l of a) {
    const c = cuenta.get(l) ?? 0
    if (c > 0) cuenta.set(l, c - 1)
    else solo.push(l)
  }
  return solo
}

/**
 * Compara la foto "esperada" (el archivo guardado) con la "actual" (recién
 * leída de una base). Devuelve una fila por sección con las diferencias.
 */
export function compararSQL(esperado, actual) {
  const a = seccionar(esperado)
  const b = seccionar(actual)
  return SECCIONES.map((s) => {
    const la = a.get(s.n) ?? []
    const lb = b.get(s.n) ?? []
    const soloEsperado = faltantes(la, lb)
    const soloActual = faltantes(lb, la)
    return {
      n: s.n,
      titulo: s.titulo,
      informativa: Boolean(s.informativa),
      igual: soloEsperado.length === 0 && soloActual.length === 0,
      soloEsperado,
      soloActual,
    }
  })
}

/** Muestra el resultado de compararSQL en pantalla. Devuelve true si no hay diferencias graves. */
export function imprimirComparacion(resultados) {
  let ok = true
  for (const r of resultados) {
    if (r.igual) {
      console.log(`  ✓ ${r.n}. ${r.titulo}`)
      continue
    }
    if (!r.informativa) ok = false
    console.log(`  ${r.informativa ? '⚠️ ' : '✗'} ${r.n}. ${r.titulo}${r.informativa ? ' (diferencia informativa)' : ''}`)
    for (const l of r.soloEsperado.slice(0, 15)) console.log(`      falta acá:   ${l}`)
    for (const l of r.soloActual.slice(0, 15)) console.log(`      sobra acá:   ${l}`)
    const resto = r.soloEsperado.length + r.soloActual.length - Math.min(15, r.soloEsperado.length) - Math.min(15, r.soloActual.length)
    if (resto > 0) console.log(`      ... y ${resto} línea(s) más`)
  }
  return ok
}
