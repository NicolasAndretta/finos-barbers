/**
 * scripts/preparar-desarrollo.mjs
 *
 * Deja lista la base de DESARROLLO (el Supabase local de la PC) con un solo
 * comando:
 *
 *   node scripts/preparar-desarrollo.mjs
 *
 * Qué hace, en orden:
 *   1. Controla que .env.local apunte a desarrollo (SUPABASE_ENTORNO=desarrollo)
 *      y que NO sea la base de producción. Si algo no cierra, frena sin tocar
 *      nada.
 *   2. Aplica todas las migraciones de supabase/migrations, en orden (0000,
 *      0001, 0002...). Cada una en su transacción: si una falla, se deshace y
 *      el script se detiene.
 *   3. Carga los datos de ejemplo (supabase/seed-desarrollo.sql).
 *   4. Crea tu usuario admin de prueba con DEV_ADMIN_EMAIL y DEV_ADMIN_PASSWORD
 *      (si están en .env.local), ya confirmado y con rol admin.
 *
 * Se puede correr más de una vez: lo que ya existe no se duplica.
 *
 * Necesita en .env.local (los valores del proyecto de desarrollo):
 *   SUPABASE_ENTORNO=desarrollo
 *   SUPABASE_DB_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD   (opcionales)
 */
import { existsSync, readdirSync } from 'fs'
import path from 'path'
import { describirDestino, exigirDesarrollo, leerArgumentos, leerEnv, refsDelProyecto } from './lib/entorno.mjs'
import { aplicarArchivo, conectar } from './lib/postgres.mjs'

const CARPETA_MIGRACIONES = path.join('supabase', 'migrations')
const ARCHIVO_SEED = path.join('supabase', 'seed-desarrollo.sql')

const { opciones } = leerArgumentos(['env'])
const env = leerEnv(opciones.env || '.env.local')

// ── 1. Controles ────────────────────────────────────────────────────────────
// Este script NUNCA corre fuera de desarrollo: no acepta --produccion.
exigirDesarrollo(env)

// La URL pública y la conexión a la base tienen que ser del mismo proyecto.
// Si no, estaríamos armando la base en un proyecto y creando el usuario en otro.
const { desdeUrl, desdeDb } = refsDelProyecto(env)
if (desdeUrl && desdeDb && !desdeDb.startsWith('local:') && desdeUrl !== desdeDb) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL y SUPABASE_DB_URL son de proyectos distintos')
  console.error(`  (${desdeUrl} y ${desdeDb}). Copiá las dos del proyecto de desarrollo.`)
  process.exit(1)
}

if (!existsSync(path.join(CARPETA_MIGRACIONES, '0000_base.sql'))) {
  console.error('✗ Falta supabase/migrations/0000_base.sql.')
  console.error('  Primero hay que sacar la foto de producción: node scripts/exportar-esquema.mjs --env .env.produccion.local')
  process.exit(1)
}

console.log(`Preparando desarrollo (${describirDestino(env)})\n`)
const cliente = await conectar(env)

try {
  // ── 2. Migraciones ────────────────────────────────────────────────────────
  // sort() ordena por nombre: por eso los archivos empiezan con 0000, 0001...
  const migraciones = readdirSync(CARPETA_MIGRACIONES).filter((f) => f.endsWith('.sql')).sort()
  for (const archivo of migraciones) {
    const ruta = path.join(CARPETA_MIGRACIONES, archivo)
    if (!(await aplicarArchivo(cliente, ruta))) process.exit(1)
    console.log(`✓ ${archivo}`)
  }

  // ── 3. Datos de ejemplo ───────────────────────────────────────────────────
  if (existsSync(ARCHIVO_SEED)) {
    if (!(await aplicarArchivo(cliente, ARCHIVO_SEED))) process.exit(1)
    console.log('✓ Datos de ejemplo cargados')
  } else {
    console.log('ℹ️  No hay supabase/seed-desarrollo.sql: la base queda sin datos de ejemplo.')
  }

  // ── 4. Usuario admin de prueba ────────────────────────────────────────────
  await asegurarAdmin()
} finally {
  await cliente.end()
}

console.log('\nListo. Próximos pasos:')
console.log('  - Comprobar que quedó igual a la foto:')
console.log('      node scripts/exportar-esquema.mjs --comparar supabase/migrations/0000_base.sql')
// Con números y no "localhost": así coincide con la dirección del Supabase local.
console.log('  - Levantar la app contra desarrollo: npm run dev  →  http://127.0.0.1:3000')

/**
 * Crea (si no existe) la cuenta DEV_ADMIN_EMAIL y le da rol admin.
 *
 * La cuenta se crea con la API de administración de Supabase (la misma que
 * usa el panel para crear cuentas de barbero), porque las contraseñas se
 * guardan cifradas y no conviene escribirlas a mano en la base. El rol se
 * asigna después, directamente en la tabla profiles.
 *
 * Por qué se llama a esa API con fetch y no con la librería de Supabase: la
 * librería, al crearse, prepara también su parte de "tiempo real", que
 * necesita WebSocket. Node 20 (el de .nvmrc) no lo trae y el script se caía
 * antes de hacer nada. Acá hace falta una sola llamada, y fetch viene con Node.
 */
async function asegurarAdmin() {
  const email = (env.DEV_ADMIN_EMAIL || '').trim().toLowerCase()
  const password = env.DEV_ADMIN_PASSWORD || ''
  if (!email || !password) {
    console.log('ℹ️  Sin DEV_ADMIN_EMAIL / DEV_ADMIN_PASSWORD en .env.local: no creo el usuario admin.')
    return
  }
  if (password.length < 6) {
    console.error('✗ DEV_ADMIN_PASSWORD tiene que tener al menos 6 caracteres.')
    process.exitCode = 1
    return
  }

  // ¿Ya existe la cuenta? (auth.users es la tabla de cuentas de Supabase)
  const existente = await cliente.query('select id from auth.users where lower(email) = $1', [email])
  let id = existente.rows[0]?.id

  if (!id) {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('✗ Para crear el admin faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
      process.exitCode = 1
      return
    }
    // La llave maestra (service role) va en los dos encabezados que pide
    // Supabase. Nunca se muestra en pantalla.
    let respuesta
    try {
      respuesta = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        // Mismos datos que manda el formulario de registro de la app, para que
        // el disparador que crea el perfil reciba lo que espera.
        body: JSON.stringify({
          email,
          password,
          email_confirm: true, // ya confirmada: no hace falta abrir ningún mail
          user_metadata: { nombre: 'Admin', apellido: 'Desarrollo', role: 'client' },
        }),
      })
    } catch (e) {
      console.error(`✗ No pude hablar con Supabase para crear el usuario admin: ${e.message}`)
      console.error('  ¿Está levantado? Probá con: npx supabase status')
      process.exitCode = 1
      return
    }
    // Si sale bien, la respuesta es la cuenta creada (con su id).
    const cuenta = await respuesta.json().catch(() => ({}))
    if (!respuesta.ok || !cuenta.id) {
      const motivo = cuenta.msg || cuenta.message || cuenta.error_description || `respuesta ${respuesta.status}`
      console.error(`✗ No pude crear el usuario admin: ${motivo}`)
      process.exitCode = 1
      return
    }
    id = cuenta.id
  }

  // Rol admin: si el perfil ya existe se actualiza; si no, se crea.
  const actualizado = await cliente.query(`update public.profiles set role = 'admin' where id = $1`, [id])
  if (actualizado.rowCount === 0) {
    await cliente.query(
      `insert into public.profiles (id, email, nombre, apellido, role)
       values ($1, $2, 'Admin', 'Desarrollo', 'admin')`,
      [id, email],
    )
  }

  // Desde la Fase 2, ver los datos depende de estar en el equipo de la
  // plataforma (tabla `equipo`), no del rol del perfil. Si la tabla existe,
  // la cuenta de prueba entra como admin del equipo.
  const [{ hayEquipo }] = (await cliente.query(`select to_regclass('public.equipo') is not null as "hayEquipo"`)).rows
  if (hayEquipo) {
    await cliente.query(
      `insert into public.equipo (user_id, rol) values ($1, 'admin')
       on conflict (user_id) do update set rol = 'admin'`,
      [id],
    )
  }
  console.log(`✓ Usuario admin listo: ${email}${hayEquipo ? ' (admin del equipo)' : ''}`)
}
