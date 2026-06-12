/**
 * src/lib/resend.ts
 *
 * Finos Barbers — cliente de Resend y funciones de envío de correo.
 *
 * Este módulo es exclusivamente de servidor (Node.js runtime).
 * NUNCA importarlo en Client Components ("use client") porque expone la API key.
 *
 * Convenciones de retorno:
 *  Las funciones retornan un discriminated union { ok: true, id } | { ok: false, error }
 *  para que el llamador pueda manejar errores sin excepciones no capturadas.
 */

import { Resend } from 'resend'

// ─── Variables de entorno ────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY

// Evitar inicializar con error a nivel de módulo para no romper el build estático
export const resend = new Resend(RESEND_API_KEY || 'dummy_key_for_build')

function checkApiKey() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      'Falta la variable de entorno RESEND_API_KEY.\n' +
        'Añádela a .env.local con el valor obtenido en https://resend.com/api-keys'
    )
  }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Dirección del remitente. Reemplazar con el dominio verificado en Resend. */
const FROM_ADDRESS = 'Finos Barbers <turnos@finosbarbers.com>'

export interface DatosTurno {
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
  checkApiKey()
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
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
  checkApiKey()
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
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
                ✂️ Finos Barbers
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
                  ${buildDetalleRow('✂️ Barbero', datos.nombreBarbero)}
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
                © ${new Date().getFullYear()} Finos Barbers · Este correo fue generado automáticamente.
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
                ✂️ Finos Barbers
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
                  ${buildDetalleRow('✂️ Barbero', datos.nombreBarbero)}
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
                © ${new Date().getFullYear()} Finos Barbers · Este correo fue generado automáticamente.
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
