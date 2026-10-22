/**
 * src/lib/local-datos.ts
 *
 * Los datos públicos de un local, con la forma que usa la web. Reemplaza al
 * viejo `lib/site.ts` (que tenía a Roble escrito a mano): ahora cada local
 * tiene los suyos en la base (tabla `locales`, Fase 1) y la web los lee por la
 * dirección (/roble, /otro-local).
 *
 * Este archivo no habla con la base: solo define la forma de los datos y
 * cuentas chicas (links de WhatsApp, rutas). Por eso lo pueden importar tanto
 * el servidor como el navegador. La lectura está en `lib/local.ts`.
 */

import { palabrasDe, type Palabras } from '@/lib/rubros'

export type HorarioTexto = { dia: string; horas: string }

export type LocalPublico = {
  id: string
  /** El nombre en la dirección: sitio.com/<slug> */
  slug: string
  nombre: string
  /** demo · activo · suspendido · archivado */
  estado: string
  rubro: string
  palabras: Palabras
  nombreCorto: string
  lema: string
  descripcion: string
  direccion: string
  ciudad: string
  mapaQuery: string
  email: string
  /** Solo números, con código de país (para los links de WhatsApp). */
  whatsapp: string
  /** El mismo número, para mostrar. */
  whatsappMostrar: string
  whatsappMensaje: string
  instagram: string
  instagramUrl: string
  tiktok: string
  tiktokUrl: string
  aliasPago: string
  senaPorcentaje: number
  mediosPago: string[]
  horarios: HorarioTexto[]
}

/** Una fila de `datos_del_local(slug)` (migración 0008), tal como llega. */
export type FilaLocal = {
  id: string; slug: string; nombre: string; estado: string; rubro: string
  nombre_corto: string | null; lema: string | null; descripcion: string | null
  direccion: string | null; ciudad: string | null; mapa_query: string | null; email: string | null
  whatsapp: string | null; whatsapp_mensaje: string | null; instagram: string | null; tiktok: string | null
  alias_pago: string | null; sena_porcentaje: number; medios_pago: string[] | null; horarios: unknown
}

/** "5491157641147" → "+54 9 11 5764-1147". Si no reconoce la forma, lo deja con "+". */
export function formatearWhatsapp(numero: string): string {
  const m = numero.match(/^549(11)(\d{4})(\d{4})$/)
  if (m) return `+54 9 ${m[1]} ${m[2]}-${m[3]}`
  return numero ? `+${numero}` : ''
}

/** Pasa la fila de la base a la forma que usa la web, con valores por defecto. */
export function aLocalPublico(f: FilaLocal): LocalPublico {
  const horarios = Array.isArray(f.horarios)
    ? (f.horarios as HorarioTexto[]).filter((h) => h && typeof h.dia === 'string' && typeof h.horas === 'string')
    : []
  const nombreCorto = f.nombre_corto?.trim() || f.nombre
  return {
    id: f.id,
    slug: f.slug,
    nombre: f.nombre,
    estado: f.estado,
    rubro: f.rubro,
    palabras: palabrasDe(f.rubro),
    nombreCorto,
    lema: f.lema ?? '',
    descripcion: f.descripcion ?? '',
    direccion: f.direccion ?? '',
    ciudad: f.ciudad ?? '',
    mapaQuery: f.mapa_query || [f.direccion, f.ciudad].filter(Boolean).join(', '),
    email: f.email ?? '',
    whatsapp: f.whatsapp ?? '',
    whatsappMostrar: formatearWhatsapp(f.whatsapp ?? ''),
    whatsappMensaje: f.whatsapp_mensaje || `¡Hola ${nombreCorto}! Quería hacer una consulta / reservar un turno.`,
    instagram: f.instagram ?? '',
    instagramUrl: f.instagram ? `https://instagram.com/${f.instagram}` : '',
    tiktok: f.tiktok ?? '',
    tiktokUrl: f.tiktok ? `https://tiktok.com/@${f.tiktok}` : '',
    aliasPago: f.alias_pago ?? '',
    senaPorcentaje: f.sena_porcentaje,
    mediosPago: f.medios_pago ?? [],
    horarios,
  }
}

/** Link de WhatsApp del local, con un mensaje cargado. */
export function whatsappLink(local: LocalPublico, mensaje: string = local.whatsappMensaje): string {
  return `https://wa.me/${local.whatsapp}?text=${encodeURIComponent(mensaje)}`
}

/** Una dirección dentro del local: rutaLocal('roble', '/tienda') → '/roble/tienda'. */
export function rutaLocal(slug: string, ruta: string = ''): string {
  return `/${slug}${ruta}`
}

/** ¿Tiene forma de nombre de local? (minúsculas, números y guiones; como en la base) */
export function esSlug(valor: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(valor) && valor.length >= 2 && valor.length <= 40
}

/** Los estados en los que el local se muestra al público. */
export function localVisible(local: LocalPublico): boolean {
  return local.estado === 'demo' || local.estado === 'activo'
}
