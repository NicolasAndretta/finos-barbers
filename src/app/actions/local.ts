'use server'

/**
 * src/app/actions/local.ts
 *
 * Panel → Datos del local (Fase 6): lo que la web muestra del negocio (nombre,
 * lema, dirección, WhatsApp, redes, seña). Hasta la Fase 6 esto solo se cambiaba
 * en la base.
 *
 * Lo pueden guardar el dueño y el equipo (la política de `locales` de la Fase 2).
 * El estado, la dirección web y el registro de alta NO se cambian acá: la
 * guardia de la base los frena (migración 0014).
 */

import { createClient } from '@/lib/supabase'
import { exigirPermiso } from '@/lib/auth'
import { localDeAccion } from '@/lib/local'
import { refrescarLocales } from '@/lib/refrescar'
import { errorDeUsuario, errorDeWhatsapp, normalizarUsuario, normalizarWhatsapp } from '@/lib/contacto'
import { MEDIOS_DE_PAGO } from '@/lib/local-datos'

export type EstadoDatosLocal = { error?: string; guardado?: boolean }

export async function guardarDatosDelLocal(_prev: EstadoDatosLocal, formData: FormData): Promise<EstadoDatosLocal> {
  const local = await localDeAccion(formData.get('local'))
  await exigirPermiso(local, 'editaCatalogo')

  const texto = (campo: string, max: number) => ((formData.get(campo) as string | null) ?? '').trim().slice(0, max)
  // Vacío se guarda como "sin cargar" (null): la plataforma muestra qué falta.
  const opcional = (campo: string, max: number) => texto(campo, max) || null

  const nombre = texto('nombre', 80)
  const email = texto('email', 120).toLowerCase()
  const whatsapp = normalizarWhatsapp(texto('whatsapp', 30))
  const instagram = normalizarUsuario(texto('instagram', 80))
  const tiktok = normalizarUsuario(texto('tiktok', 80))
  const sena = Number(formData.get('sena_porcentaje'))
  const medios = formData.getAll('medios_pago').filter((m): m is string => typeof m === 'string' && MEDIOS_DE_PAGO.includes(m))

  if (nombre.length < 2) return { error: 'El nombre tiene que tener al menos 2 letras.' }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'El mail no parece válido.' }
  const errorDeContacto = errorDeWhatsapp(whatsapp) ?? errorDeUsuario(instagram, 'Instagram') ?? errorDeUsuario(tiktok, 'TikTok')
  if (errorDeContacto) return { error: errorDeContacto }
  if (!Number.isInteger(sena) || sena < 0 || sena > 100) return { error: 'La seña tiene que ser un porcentaje entre 0 y 100.' }
  if (!medios.length) return { error: 'Elegí al menos un medio de pago.' }

  const direccion = opcional('direccion', 120)
  const ciudad = opcional('ciudad', 80)
  // Si cambió la dirección, el mapa la sigue: se olvida lo que se le pedía antes.
  const cambioLaDireccion = (direccion ?? '') !== local.direccion || (ciudad ?? '') !== local.ciudad

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('locales')
    .update({
      nombre,
      nombre_corto: opcional('nombre_corto', 30),
      lema: opcional('lema', 120),
      descripcion: opcional('descripcion', 600),
      direccion,
      ciudad,
      ...(cambioLaDireccion ? { mapa_query: null } : {}),
      email: email || null,
      whatsapp: whatsapp || null,
      whatsapp_mensaje: opcional('whatsapp_mensaje', 300),
      instagram: instagram || null,
      tiktok: tiktok || null,
      alias_pago: opcional('alias_pago', 60),
      sena_porcentaje: sena,
      medios_pago: medios,
    })
    .eq('id', local.id)
    .select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No tenés permiso para cambiar los datos de este local.' }

  refrescarLocales()
  return { guardado: true }
}
