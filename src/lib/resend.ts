/**
 * src/lib/resend.ts
 *
 * Cliente de Resend y funciones de envío de correo de los turnos.
 *
 * Cada mail sale con el nombre del local del turno (Fase 6: hasta ahí decían
 * "Roble Barbería" para cualquier local), y solo si el local está ACTIVO: en
 * una muestra las reservas son de prueba y no se le escribe a nadie.
 *
 * Este módulo es exclusivamente de servidor (Node.js runtime).
 * NUNCA importarlo en Client Components ("use client") porque expone la API key.
 *
 * Convenciones de retorno:
 *  Las funciones retornan un discriminated union { ok: true, id } | { ok: false, error }
 *  para que el llamador pueda manejar errores sin excepciones no capturadas.
 */

import { Resend } from 'resend'
import type { LocalPublico } from '@/lib/local-datos'
import { conMayuscula } from '@/lib/rubros'

// ─── Variables de entorno ────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY

// Evitar inicializar con error a nivel de módulo para no romper el build estático
export const resend = new Resend(RESEND_API_KEY || 'dummy_key_for_build')

/**
 * Devuelve el motivo por el que no se puede enviar, o null si se puede.
 *
 * ⚠️ NO lanza. Estas funciones documentan que devuelven { ok, error }, y el
 * envío del mail ocurre SIEMPRE despues de haber tocado la base: si tirara,
 * se caeria una reserva ya confirmada por no poder avisar de ella.
 */
function motivoParaNoEnviar(datos: DatosTurno): string | null {
  if (datos.estadoLocal !== 'activo') return 'El local no está activo (es una muestra): no se mandan mails.'
  if (!process.env.RESEND_API_KEY) {
    return 'Falta la variable de entorno RESEND_API_KEY. Cargala en .env.local ' +
      'con el valor de https://resend.com/api-keys'
  }
  return null
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

/**
 * La dirección del remitente; el nombre que se ve es el del local.
 * ⚠️ Este dominio no existe: los envíos de verdad necesitan el dominio del
 * producto verificado en Resend (cuando tenga nombre), y cambiarlo acá.
 */
const DIRECCION_REMITENTE = 'turnos@roblebarberia.com.ar'

/** "El Tano" <turnos@...>, sin los caracteres que romperían el encabezado del mail. */
function remitente(negocio: string): string {
  const nombre = negocio.replace(/["<>\r\n]/g, '').trim() || 'Turnos'
  return `${nombre} <${DIRECCION_REMITENTE}>`
}

export interface DatosTurno {
  /** El nombre del local (va como remitente y en el encabezado). */
  negocio: string
  /** El estado del local: solo uno activo manda mails. */
  estadoLocal: string
  /** Cómo se llama quien atiende en este rubro ("Barbero", "Manicura"...). */
  profesional: string
  /** Nombre completo del cliente */
  nombreCliente: string
  /** Email del cliente */
  emailCliente: string
  /** Nombre completo del barbero */
  nombreBarbero: string
  /** Nombre del servicio reservado */
  servicio: string
  /** Fecha del turno en formato legible, ej: "viernes 7 de junio de 2026" */
  fecha: string
  /** Hora del turno en formato legible, ej: "10:30" */
  hora: string
}

/** Lo que un mail necesita saber del local del turno. */
export function datosDelLocal(local: LocalPublico): Pick<DatosTurno, 'negocio' | 'estadoLocal' | 'profesional'> {
  return { negocio: local.nombre, estadoLocal: local.estado, profesional: conMayuscula(local.palabras.profesional) }
}

/** Resultado exitoso de un envío */
export interface EnvioExitoso {
  ok: true
  id: string
}

/** Resultado fallido de un envío */
export interface EnvioFallido {
  ok: false
  error: string
}

export type ResultadoEnvio = EnvioExitoso | EnvioFallido

// ─── Funciones de envío ───────────────────────────────────────────────────────

/**
 * Envía un correo de confirmación de turno al cliente.
 *
 * Llamar desde un Route Handler o Server Action después de insertar el turno
 * en la base de datos.
 *
 * @param datos - Datos del turno a confirmar
 * @returns ResultadoEnvio — union discriminada para manejo seguro de errores
 *
 * @example
 * const resultado = await sendConfirmacionTurno({
 *   nombreCliente: 'Juan Pérez',
 *   emailCliente: 'juan@example.com',
 *   nombreBarbero: 'Carlos López',
 *   servicio: 'Corte clásico',
 *   fecha: 'viernes 7 de junio de 2026',
 *   hora: '10:30',
 * })
 * if (!resultado.ok) console.error(resultado.error)
 */
export async function sendConfirmacionTurno(datos: DatosTurno): Promise<ResultadoEnvio> {
  const motivo = motivoParaNoEnviar(datos)
  if (motivo) return { ok: false, error: motivo }

  const { data, error } = await resend.emails.send({
    from: remitente(datos.negocio),
    to: datos.emailCliente,
    subject: `✅ Turno confirmado — ${datos.fecha} a las ${datos.hora}`,
    html: buildConfirmacionHtml(datos),
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, id: data!.id }
}

/**
 * Envía un correo de cancelación de turno al cliente.
 *
 * @param datos - Datos del turno cancelado
 * @returns ResultadoEnvio — union discriminada para manejo seguro de errores
 */
export async function sendCancelacionTurno(datos: DatosTurno): Promise<ResultadoEnvio> {
  const motivo = motivoParaNoEnviar(datos)
  if (motivo) return { ok: false, error: motivo }

  const { data, error } = await resend.emails.send({
    from: remitente(datos.negocio),
    to: datos.emailCliente,
    subject: `❌ Turno cancelado — ${datos.fecha} a las ${datos.hora}`,
    html: buildCancelacionHtml(datos),
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, id: data!.id }
}

// ─── Helpers de plantillas HTML ───────────────────────────────────────────────
// Se usan strings HTML en lugar de React para evitar dependencias del runtime de
// React en el servidor de correos y mantener el módulo portable.

function buildConfirmacionHtml(datos: DatosTurno): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Turno confirmado</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

          <!-- Cabecera -->
          <tr>
            <td style="background:#18181b;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                ${escapeHtml(datos.negocio)}
              </h1>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">
                ¡Tu turno está confirmado!
              </h2>
              <p style="margin:0 0 32px;color:#71717a;font-size:15px;line-height:1.6;">
                Hola <strong>${escapeHtml(datos.nombreCliente)}</strong>, te esperamos con todo preparado.
              </p>

              <!-- Tarjeta de detalles -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;border:1px solid #e4e4e7;">
                <tr><td style="padding:24px;">
                  ${buildDetalleRow('📅 Fecha', datos.fecha)}
                  ${buildDetalleRow('🕐 Hora', datos.hora)}
                  ${buildDetalleRow(`✂️ ${datos.profesional}`, datos.nombreBarbero)}
                  ${buildDetalleRow('💈 Servicio', datos.servicio)}
                </td></tr>
              </table>

              <p style="margin:32px 0 0;color:#71717a;font-size:13px;line-height:1.6;">
                Si necesitás cancelar o modificar tu turno, hacelo con al menos 2 horas de anticipación.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f4f5;padding:20px 40px;text-align:center;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">
                © ${new Date().getFullYear()} ${escapeHtml(datos.negocio)} · Este correo fue generado automáticamente.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

function buildCancelacionHtml(datos: DatosTurno): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Turno cancelado</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

          <!-- Cabecera -->
          <tr>
            <td style="background:#18181b;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                ${escapeHtml(datos.negocio)}
              </h1>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">
                Tu turno fue cancelado
              </h2>
              <p style="margin:0 0 32px;color:#71717a;font-size:15px;line-height:1.6;">
                Hola <strong>${escapeHtml(datos.nombreCliente)}</strong>, te informamos que el siguiente turno fue cancelado.
              </p>

              <!-- Tarjeta de detalles -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff5f5;border-radius:8px;border:1px solid #fecaca;">
                <tr><td style="padding:24px;">
                  ${buildDetalleRow('📅 Fecha', datos.fecha)}
                  ${buildDetalleRow('🕐 Hora', datos.hora)}
                  ${buildDetalleRow(`✂️ ${datos.profesional}`, datos.nombreBarbero)}
                  ${buildDetalleRow('💈 Servicio', datos.servicio)}
                </td></tr>
              </table>

              <p style="margin:32px 0 0;color:#71717a;font-size:13px;line-height:1.6;">
                Podés reservar un nuevo turno cuando quieras desde nuestra plataforma.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f4f5;padding:20px 40px;text-align:center;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">
                © ${new Date().getFullYear()} ${escapeHtml(datos.negocio)} · Este correo fue generado automáticamente.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/** Fila de detalle para la tarjeta del email */
function buildDetalleRow(label: string, value: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="font-size:12px;color:#a1a1aa;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding-bottom:2px;">
          ${escapeHtml(label)}
        </td>
      </tr>
      <tr>
        <td style="font-size:15px;color:#18181b;font-weight:500;">
          ${escapeHtml(value)}
        </td>
      </tr>
    </table>
  `
}

/** Escapa caracteres HTML para evitar inyección en el cuerpo del mail */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
