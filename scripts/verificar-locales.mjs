/**
 * scripts/verificar-locales.mjs
 *
 * Comprueba que la base está bien armada "por local" (Fase 1 en adelante) y
 * que nada de la web de 369 cambió.
 *
 *   node scripts/verificar-locales.mjs
 *
 * Solo corre en DESARROLLO: una de las pruebas crea un segundo local de
 * mentira para intentar mezclas. Lo hace dentro de una transacción que se
 * deshace al final (rollback), así que no deja nada, pero igual no es algo
 * para correr contra producción.
 *
 * Qué controla:
 *   1. Toda tabla está clasificada: lleva local, no lleva (y por qué) o es de
 *      369. Una tabla nueva sin clasificar hace fallar la prueba: es la red
 *      contra "me olvidé de ponerle local_id".
 *   2. No hay filas sin local.
 *   3. Los vínculos entre tablas de la barbería son "dobles" (apuntan con
 *      local_id + id), y no queda ninguna regla "único en toda la base".
 *   4. Lo de 369 está igual que en la foto, y ninguna migración lo nombra.
 *   5. El candado doble funciona: la base rechaza las mezclas entre locales.
 *   6. Las consultas de la app que traen un turno con su barbero y su servicio
 *      siguen respondiendo.
 *
 * Opciones:
 *   --env ARCHIVO   de qué archivo leer las credenciales (por defecto .env.local)
 */
import { readdirSync, readFileSync } from 'fs'
import path from 'path'
import { describirDestino, exigirDesarrollo, leerArgumentos, leerEnv } from './lib/entorno.mjs'
import { compararSQL, generarSQL, leerEsquema } from './lib/esquema.mjs'
import { abrirSoloLectura, conectar, consultor } from './lib/postgres.mjs'

// ─── La clasificación de las tablas ──────────────────────────────────────────
// Si se crea una tabla nueva, hay que anotarla en alguna de estas tres listas.

/** Tablas de la barbería: cada fila pertenece a un local. */
const CON_LOCAL = [
  'barberos', 'categorias', 'servicios', 'productos', 'resenas',
  'turnos', 'pedidos', 'items_pedido', 'transacciones', 'mp_conexion',
  'membresias', // Fase 2: qué es cada persona en cada local
  'horarios', 'ausencias', // Fase 3b: horarios reales de cada local
]

/** Tablas de la plataforma, que no pertenecen a un local (y por qué). */
const SIN_LOCAL = {
  locales: 'es la lista de locales',
  profiles: 'una cuenta es de toda la plataforma; qué es en cada local lo dice membresias',
  equipo: 'el equipo de la plataforma no pertenece a ningún local',
}

/** Lo de la web de 369: no se toca (ver docs/MULTITENANT.md). */
const TABLAS_369 = ['trabajos', 'fotos', 'videos']
const RE_369 = /\b(trabajos|fotos|videos|galeria)\b/

/**
 * Reglas "único" que no incluyen local_id y están bien así.
 * turnos_no_overlap_idx: un barbero no puede tener dos turnos a la misma hora.
 * El barbero ya es de un solo local, así que no hace falta sumar local_id.
 */
const UNICOS_PERMITIDOS = ['turnos_no_overlap_idx']

const ROBLE = '00000000-0000-4000-a000-000000000001'
const CARPETA_MIGRACIONES = path.join('supabase', 'migrations')
const FOTO = path.join(CARPETA_MIGRACIONES, '0000_base.sql')

const { opciones } = leerArgumentos(['env'])
const env = leerEnv(opciones.env || '.env.local')
exigirDesarrollo(env) // este script nunca corre fuera de desarrollo

let fallas = 0
const anotar = (ok, texto, detalle = '') => {
  if (!ok) fallas++
  console.log(`  ${ok ? '✓' : '✗'} ${texto}${detalle ? ` — ${detalle}` : ''}`)
}
const titulo = (texto) => console.log(`\n${texto}`)

console.log(`Verificando locales (${describirDestino(env)})`)
const cliente = await conectar(env)
const q = consultor(cliente)

try {
  // ── 1. Toda tabla está clasificada ────────────────────────────────────────
  titulo('1. Cada tabla, en su lugar')
  const tablas = await q(`
    select c.relname as tabla,
           c.relrowsecurity as rls,
           a.attname is not null as tiene_local,
           coalesce(a.attnotnull, false) as obligatoria,
           pg_get_expr(d.adbin, d.adrelid) as defecto,
           exists (select 1 from pg_constraint k
                    where k.conrelid = c.oid and k.contype = 'f'
                      and k.confrelid = to_regclass('public.locales')
                      and k.conkey = array[a.attnum]) as apunta_a_locales
      from pg_class c
      left join pg_attribute a on a.attrelid = c.oid and a.attname = 'local_id' and not a.attisdropped
      left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
     order by c.relname`)
  const porNombre = Object.fromEntries(tablas.map((t) => [t.tabla, t]))

  for (const nombre of CON_LOCAL) {
    const t = porNombre[nombre]
    if (!t) { anotar(false, `${nombre}: no existe`); continue }
    const ok = t.tiene_local && t.obligatoria && t.apunta_a_locales && t.rls
    const faltas = [
      !t.tiene_local && 'sin local_id',
      t.tiene_local && !t.obligatoria && 'local_id puede quedar vacío',
      t.tiene_local && !t.apunta_a_locales && 'local_id no apunta a locales',
      !t.rls && 'sin RLS',
    ].filter(Boolean)
    anotar(ok, `${nombre}: lleva local`, faltas.join(', '))
  }
  for (const [nombre, motivo] of Object.entries(SIN_LOCAL)) {
    const t = porNombre[nombre]
    anotar(Boolean(t) && !t.tiene_local && t.rls, `${nombre}: sin local a propósito`, t ? motivo : 'no existe')
  }
  for (const nombre of TABLAS_369) {
    const t = porNombre[nombre]
    anotar(Boolean(t) && !t.tiene_local, `${nombre}: de 369, sin tocar`, t ? '' : 'no existe')
  }
  const conocidas = new Set([...CON_LOCAL, ...Object.keys(SIN_LOCAL), ...TABLAS_369])
  const sinClasificar = tablas.filter((t) => !conocidas.has(t.tabla)).map((t) => t.tabla)
  anotar(sinClasificar.length === 0, 'no hay tablas sin clasificar',
    sinClasificar.length ? `${sinClasificar.join(', ')}: decidí si llevan local y anotalas en este script` : '')

  // Desde la 0009 (Fase 3a) ninguna tabla tiene "Roble por defecto", salvo
  // mp_conexion, que lo conserva hasta la Fase 4 (Mercado Pago por local).
  const conDefecto = CON_LOCAL.filter((n) => porNombre[n]?.defecto)
  const deMas = conDefecto.filter((n) => n !== 'mp_conexion')
  anotar(deMas.length === 0, 'ninguna tabla guarda en Roble lo que llega sin local (salvo mp_conexion, hasta la Fase 4)',
    deMas.length ? `todavía con valor por defecto: ${deMas.join(', ')}` : '')

  // ── 2. No hay filas sin local ─────────────────────────────────────────────
  titulo('2. Cada fila, con su local')
  for (const nombre of CON_LOCAL.filter((n) => porNombre[n]?.tiene_local)) {
    const filas = await q(`
      select coalesce(l.slug, '(sin local)') as local, count(*)::int as cantidad
        from public.${nombre} t left join public.locales l on l.id = t.local_id
       group by 1 order by 1`)
    const sinLocal = filas.find((f) => f.local === '(sin local)')?.cantidad ?? 0
    const reparto = filas.map((f) => `${f.local}: ${f.cantidad}`).join(', ') || 'vacía'
    anotar(sinLocal === 0, nombre, reparto)
  }

  // ── 3. Vínculos dobles y reglas "único" ───────────────────────────────────
  titulo('3. Vínculos entre tablas de la barbería')
  const vinculos = await q(`
    select k.conname as regla, c.relname as tabla, rc.relname as destino,
           (select array_agg(a.attname::text order by u.ord)
              from unnest(k.conkey) with ordinality as u(attnum, ord)
              join pg_attribute a on a.attrelid = k.conrelid and a.attnum = u.attnum) as columnas
      from pg_constraint k
      join pg_class c on c.oid = k.conrelid
      join pg_class rc on rc.oid = k.confrelid
     where k.contype = 'f'
       and c.relnamespace = 'public'::regnamespace
       and rc.relnamespace = 'public'::regnamespace
     order by c.relname, k.conname`)
  for (const v of vinculos.filter((x) => CON_LOCAL.includes(x.tabla) && CON_LOCAL.includes(x.destino))) {
    anotar(v.columnas.includes('local_id'), `${v.tabla} → ${v.destino}`,
      v.columnas.includes('local_id') ? `(${v.columnas.join(', ')})` : `${v.regla} apunta solo con ${v.columnas.join(', ')}: falta el candado`)
  }

  const unicos = await q(`
    select i.relname as nombre, c.relname as tabla,
           (select array_agg(a.attname::text)
              from unnest(x.indkey::int2[]) as k(attnum)
              join pg_attribute a on a.attrelid = x.indrelid and a.attnum = k.attnum) as columnas
      from pg_index x
      join pg_class i on i.oid = x.indexrelid
      join pg_class c on c.oid = x.indrelid
     where x.indisunique and not x.indisprimary
       and c.relnamespace = 'public'::regnamespace
     order by c.relname, i.relname`)
  const globales = unicos.filter((u) =>
    CON_LOCAL.includes(u.tabla) && !(u.columnas ?? []).includes('local_id') && !UNICOS_PERMITIDOS.includes(u.nombre))
  anotar(globales.length === 0, 'ninguna regla "único en toda la base"',
    globales.map((u) => `${u.nombre} (${(u.columnas ?? []).join(', ')})`).join('; '))

  // ── 4. Lo de 369, igual que en la foto ────────────────────────────────────
  titulo('4. Lo de 369')
  const foto = readFileSync(FOTO, 'utf8')
  await abrirSoloLectura(cliente)
  const esquema = await leerEsquema(q)
  await cliente.query('rollback')
  const ahora = generarSQL(esquema, { fecha: '', origen: '', version: esquema.version })
  const cambios = compararSQL(foto, ahora).flatMap((s) => [...s.soloEsperado, ...s.soloActual])
  const cambios369 = cambios.filter((l) => RE_369.test(l))
  anotar(RE_369.test(foto), 'la foto incluye lo de 369 (si no, esta prueba no diría nada)')
  anotar(cambios369.length === 0, 'tablas, reglas, políticas y bucket de 369: iguales a la foto',
    cambios369.slice(0, 3).join(' | '))
  // Ninguna migración posterior a la foto lo nombra (sin contar comentarios).
  // 0001 a 0004 no se revisan: ya están incluidas en la foto.
  const posteriores = readdirSync(CARPETA_MIGRACIONES).filter((f) => f.endsWith('.sql') && f >= '0005').sort()
  for (const archivo of posteriores) {
    const sql = readFileSync(path.join(CARPETA_MIGRACIONES, archivo), 'utf8')
      .split(/\r?\n/).map((l) => l.replace(/--.*$/, '')).join('\n')
    anotar(!RE_369.test(sql), `${archivo} no nombra nada de 369`)
  }

  // ── 5. El candado doble, en acción ────────────────────────────────────────
  titulo('5. El candado doble (se prueba y se deshace)')
  /** Corre algo que la base TIENE que rechazar con ese código de error. */
  const debeFallar = async (texto, codigo, sql, params = []) => {
    await cliente.query('savepoint intento')
    try {
      await cliente.query(sql, params)
      await cliente.query('rollback to savepoint intento')
      anotar(false, `${texto}: LA BASE LO ACEPTÓ`)
    } catch (e) {
      await cliente.query('rollback to savepoint intento')
      anotar(e.code === codigo, `${texto}: rechazado`, e.code === codigo ? '' : `error inesperado ${e.code}: ${e.message}`)
    }
  }
  /** Corre algo que TIENE que andar y devuelve la primera fila. */
  const debeAndar = async (texto, sql, params = []) => {
    await cliente.query('savepoint intento')
    try {
      const { rows } = await cliente.query(sql, params)
      await cliente.query('release savepoint intento')
      anotar(true, texto)
      return rows[0]
    } catch (e) {
      await cliente.query('rollback to savepoint intento')
      anotar(false, texto, `${e.code}: ${e.message}`)
      return null
    }
  }
  // 23503 = "apunta a algo que no existe" (clave foránea) · 23505 = "ya existe" (único)
  const NO_EXISTE = '23503'
  const REPETIDO = '23505'

  await cliente.query('begin')
  try {
    const otro = await debeAndar('crear un segundo local de prueba',
      `insert into public.locales (slug, nombre) values ('prueba-candado', 'Prueba del candado') returning id`)
    const [{ id: cuenta } = {}] = await q('select id from public.profiles order by created_at limit 1')
    if (otro) {
      const barberoOtro = await debeAndar('cargarle un barbero',
        `insert into public.barberos (nombre, apellido, local_id) values ('Ajeno', 'Prueba', $1) returning id`, [otro.id])
      const servicioOtro = await debeAndar('cargarle un servicio',
        `insert into public.servicios (nombre, precio, duracion_minutos, local_id) values ('Corte ajeno', 1000, 30, $1) returning id`, [otro.id])
      const categoriaOtro = await debeAndar('cargarle una categoría "cortes" (Roble ya tiene la suya)',
        `insert into public.categorias (nombre, slug, tipo, local_id) values ('Cortes', 'cortes', 'servicio', $1) returning id`, [otro.id])
      const productoOtro = await debeAndar('cargarle un producto',
        `insert into public.productos (nombre, descripcion, precio, local_id) values ('Pomada ajena', 'x', 1000, $1) returning id`, [otro.id])

      await debeFallar('repetir esa categoría dentro del mismo local', REPETIDO,
        `insert into public.categorias (nombre, slug, tipo, local_id) values ('Cortes', 'cortes', 'servicio', $1)`, [otro.id])

      const [barberoRoble] = await q('select id from public.barberos where local_id = $1 limit 1', [ROBLE])
      const [servicioRoble] = await q('select id from public.servicios where local_id = $1 limit 1', [ROBLE])

      if (categoriaOtro) {
        await debeFallar('producto de Roble con la categoría del otro local', NO_EXISTE,
          `insert into public.productos (nombre, descripcion, precio, categoria_id, local_id) values ('Mezcla', 'x', 1, $1, $2)`, [categoriaOtro.id, ROBLE])
        await debeFallar('servicio de Roble con la categoría del otro local', NO_EXISTE,
          `insert into public.servicios (nombre, precio, duracion_minutos, categoria_id, local_id) values ('Mezcla', 1, 30, $1, $2)`, [categoriaOtro.id, ROBLE])
      }
      if (productoOtro) {
        const pedidoRoble = await debeAndar('crear un pedido en Roble',
          `insert into public.pedidos (total, local_id) values (1, $1) returning id`, [ROBLE])
        if (pedidoRoble) {
          await debeFallar('renglón de ese pedido con un producto del otro local', NO_EXISTE,
            `insert into public.items_pedido (pedido_id, producto_id, nombre, precio, cantidad, local_id) values ($1, $2, 'Mezcla', 1, 1, $3)`,
            [pedidoRoble.id, productoOtro.id, ROBLE])
        }
      }
      if (cuenta && barberoOtro && servicioOtro && barberoRoble && servicioRoble) {
        await debeFallar('turno de Roble con el barbero del otro local', NO_EXISTE,
          `insert into public.turnos (cliente_id, barbero_id, servicio_id, fecha, hora, local_id) values ($1, $2, $3, '2031-02-01', '10:00', $4)`,
          [cuenta, barberoOtro.id, servicioRoble.id, ROBLE])
        await debeFallar('turno de Roble con el servicio del otro local', NO_EXISTE,
          `insert into public.turnos (cliente_id, barbero_id, servicio_id, fecha, hora, local_id) values ($1, $2, $3, '2031-02-01', '11:00', $4)`,
          [cuenta, barberoRoble.id, servicioOtro.id, ROBLE])
        const turnoOtro = await debeAndar('turno completo dentro del otro local (esto sí tiene que andar)',
          `insert into public.turnos (cliente_id, barbero_id, servicio_id, fecha, hora, local_id) values ($1, $2, $3, '2031-02-01', '12:00', $4) returning id`,
          [cuenta, barberoOtro.id, servicioOtro.id, otro.id])
        if (turnoOtro) {
          await debeFallar('mudar ese turno a Roble dejando atrás a su barbero', NO_EXISTE,
            `update public.turnos set local_id = $1 where id = $2`, [ROBLE, turnoOtro.id])
        }
      } else {
        console.log('  ℹ️  Sin cuentas o sin catálogo en Roble: no se prueban los turnos. Corré antes node scripts/preparar-desarrollo.mjs')
      }
      await debeFallar('borrar un local que todavía tiene datos', NO_EXISTE,
        `delete from public.locales where id = $1`, [otro.id])
    }
  } finally {
    // Se deshace TODO lo de este punto: el local de prueba nunca existió.
    await cliente.query('rollback')
  }
  const [{ quedo }] = await q(`select count(*)::int as quedo from public.locales where slug = 'prueba-candado'`)
  anotar(quedo === 0, 'la prueba no dejó nada en la base')

  // ── 6. Las consultas de la app que cruzan tablas ──────────────────────────
  // La app pide "el turno con su barbero y su servicio" sin decir por qué
  // vínculo. Si entre dos tablas hubiera más de un vínculo, esto daría error.
  titulo('6. Consultas de la app que traen datos de varias tablas')
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const llave = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !llave) {
    console.log('  ℹ️  Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY: no se prueba.')
  } else {
    const consultas = [
      ['turnos con cliente, barbero y servicio', 'turnos?select=id,profiles(nombre,apellido,email),barberos(nombre,apellido),servicios(nombre,duracion_minutos,precio)&limit=1'],
      ['barberos con su cuenta', 'barberos?select=*,cuentas:profiles(id,email)&limit=1'],
    ]
    for (const [texto, ruta] of consultas) {
      try {
        const r = await fetch(`${url}/rest/v1/${ruta}`, { headers: { apikey: llave, Authorization: `Bearer ${llave}` } })
        const cuerpo = r.ok ? '' : (await r.text()).slice(0, 160)
        anotar(r.ok, texto, r.ok ? '' : `respuesta ${r.status}: ${cuerpo}`)
      } catch (e) {
        anotar(false, texto, `no respondió: ${e.message}`)
      }
    }
  }
} finally {
  await cliente.query('rollback').catch(() => {})
  await cliente.end()
}

console.log(fallas === 0 ? '\n✓ Todo en orden.' : `\n✗ ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
