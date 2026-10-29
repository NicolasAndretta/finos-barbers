'use server'

/**
 * src/app/actions/plataforma.ts
 *
 * Lo que hace el equipo desde /plataforma (Fase 6): crear una muestra, invitar
 * al dueño, activar, y los otros cambios de estado.
 *
 * Todo pasa por las funciones de la base de la migración 0014, con la sesión
 * de quien toca el botón: ellas revisan si puede. Lo único que usa la llave
 * del servidor es la cuenta del dueño (buscarla por su mail, crearla y sacar el
 * link para que elija su contraseña), porque eso es administrar cuentas: lo
 * revisa scripts/verificar-llave-servidor.mjs.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient, createServiceClient } from '@/lib/supabase'
import { localDeAccion } from '@/lib/local'
import { getRolEquipo } from '@/lib/plataforma'
import { refrescarLocales } from '@/lib/refrescar'
import { urlPublica } from '@/lib/sitio'
import { esRubro, PLANTILLAS, profesionalesDe, slugDe } from '@/lib/plantillas'
import { errorDeUsuario, errorDeWhatsapp, normalizarUsuario, normalizarWhatsapp } from '@/lib/contacto'

/** Las pantallas de la plataforma y las de todos los locales, con los datos nuevos. */
function refrescarTodo(): void {
  revalidatePath('/plataforma', 'layout')
  refrescarLocales()
}

const texto = (formData: FormData, campo: string, max = 200) =>
  ((formData.get(campo) as string | null) ?? '').trim().slice(0, max)

// ─── Crear una muestra ──────────────────────────────────────────────────────

export type EstadoCrear = { error?: string }

export async function crearMuestra(_prev: EstadoCrear, formData: FormData): Promise<EstadoCrear> {
  if (!(await getRolEquipo())) return { error: 'Solo el equipo de la plataforma crea locales.' }

  const nombre = texto(formData, 'nombre', 80)
  const slug = (texto(formData, 'slug', 40) || slugDe(nombre)).toLowerCase()
  const rubro = formData.get('rubro')
  const whatsapp = normalizarWhatsapp(texto(formData, 'whatsapp', 30))
  const instagram = normalizarUsuario(texto(formData, 'instagram', 80))

  if (nombre.length < 2) return { error: 'Poné el nombre del local.' }
  if (!esRubro(rubro)) return { error: 'Elegí el rubro.' }
  const errorDeContacto = errorDeWhatsapp(whatsapp) ?? errorDeUsuario(instagram, 'Instagram')
  if (errorDeContacto) return { error: errorDeContacto }

  const supabase = await createClient()
  const { error } = await supabase.rpc('crear_local', {
    p_nombre: nombre,
    p_slug: slug,
    p_rubro: rubro,
    p_datos: { whatsapp, instagram, direccion: texto(formData, 'direccion', 120), ciudad: texto(formData, 'ciudad', 80) },
    p_servicios: PLANTILLAS[rubro],
    p_profesionales: profesionalesDe(texto(formData, 'profesionales', 2000), rubro),
  })
  if (error) return { error: error.message }

  refrescarTodo()
  redirect(`/plataforma/${slug}?nueva=1`)
}

// ─── El dueño ───────────────────────────────────────────────────────────────

export type EstadoInvitar = {
  error?: string
  /** El mail del dueño que se sumó. */
  email?: string
  /** El link para que elija su contraseña (solo si la cuenta es nueva). */
  link?: string
  /** Ya tenía cuenta: entra con su contraseña de siempre. */
  yaTeniaCuenta?: boolean
}

/** ¿Quien llama puede sumar o sacar dueños en este local? Lo decide la base. */
async function puedeManejarDuenos(supabase: SupabaseClient, localId: string): Promise<boolean> {
  const { data } = await supabase.rpc('puede_manejar_duenos', { p_local: localId })
  return data === true
}

/**
 * A una cuenta se le puede sacar un link para elegir contraseña solo si la
 * creó una invitación y nunca entró: es una cuenta que todavía no usa nadie.
 * A una cuenta en uso, jamás: quien invita podría quedarse con la cuenta de otro.
 */
function cuentaSinEstrenar(user: User): boolean {
  return Boolean(user.app_metadata?.invitado_a) && !user.last_sign_in_at
}

/**
 * El link para elegir la contraseña. Es un link de "recuperar contraseña" que
 * no se manda por mail: lo copia quien invita. Pasa por /auth/callback (que
 * deja la sesión iniciada) y lleva a /restablecer, que después manda al dueño
 * a su panel. Sirve una vez y vence (1 hora, la regla de Supabase).
 */
async function linkParaElegirContrasena(service: SupabaseClient, email: string, slug: string): Promise<string | null> {
  const base = urlPublica()
  if (!base) return null
  const { data, error } = await service.auth.admin.generateLink({ type: 'recovery', email })
  const token = data?.properties?.hashed_token
  if (error || !token) return null
  const despues = `/restablecer?bienvenida=${slug}`
  return `${base}/auth/callback?token_hash=${encodeURIComponent(token)}&type=recovery&next=${encodeURIComponent(despues)}`
}

export async function invitarDueno(_prev: EstadoInvitar, formData: FormData): Promise<EstadoInvitar> {
  const local = await localDeAccion(formData.get('local'))
  const supabase = await createClient()
  if (!(await puedeManejarDuenos(supabase, local.id))) {
    return { error: 'En un local que ya no es una muestra, los dueños los maneja solo el admin.' }
  }

  const nombre = texto(formData, 'nombre', 60)
  const apellido = texto(formData, 'apellido', 60)
  const email = texto(formData, 'email', 120).toLowerCase()
  if (!nombre) return { error: 'Poné el nombre del dueño.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Ese mail no parece válido.' }

  const service = createServiceClient()
  const { data: existente } = await service.from('profiles').select('id').eq('email', email).maybeSingle()

  if (existente) {
    // La base revisa otra vez el permiso, y que no sea una cuenta del equipo.
    const { error } = await supabase.rpc('sumar_dueno', { p_local: local.id, p_usuario: existente.id })
    if (error) return { error: error.message }
    refrescarTodo()
    const { data: cuenta } = await service.auth.admin.getUserById(existente.id)
    if (cuenta?.user && cuentaSinEstrenar(cuenta.user)) {
      const link = await linkParaElegirContrasena(service, email, local.slug)
      return link ? { email, link } : { email, error: 'Se sumó, pero no se pudo armar el link: probá "Sacar otro link".' }
    }
    return { email, yaTeniaCuenta: true }
  }

  // Cuenta nueva, ya confirmada y sin contraseña: la elige el dueño con el link.
  const { data: creada, error: errorCrear } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nombre, apellido },
    app_metadata: { invitado_a: local.id },
  })
  if (errorCrear || !creada?.user) return { error: `No se pudo crear la cuenta: ${errorCrear?.message ?? 'sin respuesta'}` }

  const { error: errorSumar } = await supabase.rpc('sumar_dueno', { p_local: local.id, p_usuario: creada.user.id })
  if (errorSumar) {
    // No queda una cuenta a medias.
    await service.auth.admin.deleteUser(creada.user.id)
    return { error: errorSumar.message }
  }

  refrescarTodo()
  const link = await linkParaElegirContrasena(service, email, local.slug)
  return link ? { email, link } : { email, error: 'Se sumó, pero no se pudo armar el link: probá "Sacar otro link".' }
}

/** Otro link para un dueño que todavía no entró nunca (el anterior venció o se perdió). */
export async function otroLinkDeDueno(formData: FormData): Promise<{ error?: string; link?: string }> {
  const local = await localDeAccion(formData.get('local'))
  const usuario = texto(formData, 'usuario', 40)
  const supabase = await createClient()
  if (!(await puedeManejarDuenos(supabase, local.id))) {
    return { error: 'En un local que ya no es una muestra, los dueños los maneja solo el admin.' }
  }

  const service = createServiceClient()
  const { data: membresia } = await service
    .from('membresias').select('user_id').eq('local_id', local.id).eq('user_id', usuario).eq('rol', 'dueno').maybeSingle()
  if (!membresia) return { error: 'Esa cuenta no es dueña de este local.' }

  const { data: cuenta } = await service.auth.admin.getUserById(usuario)
  if (!cuenta?.user?.email) return { error: 'Esa cuenta no existe.' }
  if (!cuentaSinEstrenar(cuenta.user)) {
    return { error: 'Ese dueño ya entró alguna vez. Si no se acuerda la contraseña, que toque "¿Olvidaste tu contraseña?" en el login.' }
  }
  const link = await linkParaElegirContrasena(service, cuenta.user.email, local.slug)
  return link ? { link } : { error: 'No se pudo armar el link.' }
}

export async function quitarDueno(formData: FormData): Promise<{ error?: string }> {
  const local = await localDeAccion(formData.get('local'))
  const supabase = await createClient()
  const { error } = await supabase.rpc('quitar_dueno', { p_local: local.id, p_usuario: texto(formData, 'usuario', 40) })
  if (error) return { error: error.message }
  refrescarTodo()
  return {}
}

// ─── Estados ────────────────────────────────────────────────────────────────

export type ResultadoActivar = { error?: string; borrados?: { turnos: number; pedidos: number; movimientos: number; clientes: number; resenas: number } }

const PLANES = ['basico', 'pro', 'premium']

/** Activa con el plan elegido (Fase 7): la base revisa que entren sus profesionales. */
export async function activarLocal(formData: FormData): Promise<ResultadoActivar> {
  const local = await localDeAccion(formData.get('local'))
  const plan = texto(formData, 'plan', 20)
  if (!PLANES.includes(plan)) return { error: 'Elegí el plan con el que arranca.' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('activar_local', { p_local: local.id, p_plan: plan })
  if (error) return { error: error.message }
  refrescarTodo()
  return { borrados: data as ResultadoActivar['borrados'] }
}

export async function cambiarEstadoLocal(formData: FormData): Promise<{ error?: string }> {
  const local = await localDeAccion(formData.get('local'))
  const estado = texto(formData, 'estado', 20)
  const supabase = await createClient()
  const { error } = await supabase.rpc('cambiar_estado_local', { p_local: local.id, p_estado: estado })
  if (error) return { error: error.message }
  refrescarTodo()
  return {}
}

/** Le suma 30 días a una muestra antes de que se archive sola (migración 0015). */
export async function extenderMuestra(formData: FormData): Promise<{ error?: string }> {
  const local = await localDeAccion(formData.get('local'))
  const supabase = await createClient()
  const { error } = await supabase.rpc('extender_muestra', { p_local: local.id })
  if (error) return { error: error.message }
  refrescarTodo()
  return {}
}

/**
 * Cambia el plan (Fase 7). En una muestra, el equipo (para mostrarla en cada
 * plan); en un local activo, solo el admin, y la base revisa que entren sus
 * profesionales.
 */
export async function cambiarPlan(formData: FormData): Promise<{ error?: string }> {
  const local = await localDeAccion(formData.get('local'))
  const plan = texto(formData, 'plan', 20)
  if (!PLANES.includes(plan)) return { error: 'Ese plan no existe.' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('cambiar_plan', { p_local: local.id, p_plan: plan })
  if (error) return { error: error.message }
  refrescarTodo()
  return {}
}
