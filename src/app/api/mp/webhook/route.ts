import { NextResponse, type NextRequest } from 'next/server'
import crypto from 'node:crypto'
import { verificarPago } from '@/lib/cobros'
import { refrescarLocales } from '@/lib/refrescar'

// El aviso de Mercado Pago (webhook): cada vez que un pago cambia, Mercado Pago
// llama acá. Es lo que decide si algo está pagado, aunque el cliente cierre el
// navegador antes de volver a la página.
//
// Cada cobro lleva su propia dirección de aviso, con el local:
//   /api/mp/webhook?local=<id del local>
// (Mercado Pago le agrega el número de pago). El local de la dirección se usa
// solo para saber con qué cuenta preguntar: lo que se cree es la respuesta de
// Mercado Pago, verificada en lib/cobros.ts (que lo haya cobrado esa cuenta,
// que sea de ese local, que el monto sea el justo). Un aviso inventado, a lo
// sumo, hace que se consulte un pago y se descarte.
//
// Mercado Pago reintenta si no le contestamos 200, y puede mandar el mismo
// aviso más de una vez: todo lo de acá se puede repetir sin efecto.

export const dynamic = 'force-dynamic'

const esId = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

/**
 * La firma con la que Mercado Pago firma cada aviso (si se cargó la clave).
 *
 * Mercado Pago manda `x-signature` ("ts=...,v1=...") y `x-request-id`. El v1
 * es un HMAC-SHA256 de "id:<número de pago>;request-id:<x-request-id>;ts:<ts>;"
 * con la clave secreta del webhook, que se genera en la aplicación de Mercado
 * Pago (MP_WEBHOOK_SECRET).
 *
 * Igual que en Código Rojo: sin la clave no se rechaza (si no, ningún pago se
 * confirmaría), y con una clave equivocada se rechazarían TODOS. Por eso se
 * carga el mismo día que se hace un pago real de prueba, nunca suelta. La
 * defensa de fondo no es esta: es volver a consultar el pago con la cuenta del
 * local. Esto suma.
 */
function firmaValida(req: NextRequest, pagoId: string): boolean {
  const secreto = process.env.MP_WEBHOOK_SECRET
  if (!secreto) return true

  const firma = req.headers.get('x-signature')
  const requestId = req.headers.get('x-request-id')
  if (!firma || !requestId) return false

  // "ts=1704908010,v1=618c85..." → { ts, v1 }
  const partes = Object.fromEntries(
    firma.split(',').map((p) => {
      const [clave, ...resto] = p.split('=')
      return [clave.trim(), resto.join('=').trim()]
    }),
  )
  if (!partes.ts || !partes.v1) return false

  const plantilla = `id:${pagoId.toLowerCase()};request-id:${requestId};ts:${partes.ts};`
  const esperado = crypto.createHmac('sha256', secreto).update(plantilla).digest('hex')
  // Comparación en tiempo constante: con === se filtra información por el
  // tiempo que tarda en encontrar la primera diferencia.
  const a = Buffer.from(esperado, 'utf8')
  const b = Buffer.from(partes.v1, 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const url = req.nextUrl
  const cuerpo = (await req.json().catch(() => null)) as { type?: string; data?: { id?: string | number } } | null

  // Mercado Pago avisa de dos formas: la nueva (type + data.id) y la vieja
  // (topic + id). Solo interesan los pagos.
  const tipo = cuerpo?.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic')
  const pagoId = String(cuerpo?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '')
  const localId = url.searchParams.get('local') ?? ''

  if (tipo !== 'payment' || !pagoId) return NextResponse.json({ ok: true })
  if (!esId(localId)) {
    console.warn(`[webhook] Aviso del pago ${pagoId} sin local: se descarta.`)
    return NextResponse.json({ ok: true })
  }
  if (!firmaValida(req, pagoId)) {
    console.error(`[webhook] Firma inválida para el pago ${pagoId}: se descarta.`)
    return NextResponse.json({ error: 'firma inválida' }, { status: 401 })
  }

  const { resultado } = await verificarPago(localId, pagoId)

  // Si se cambió algo, las pantallas (panel, mis turnos) se rearman.
  if (resultado === 'confirmado' || resultado === 'devuelto' || resultado === 'revisar') refrescarLocales()

  // 500 solo cuando vale la pena que Mercado Pago reintente (no contestó él o
  // la base). Para todo lo demás, 200: reintentar no lo va a cambiar. La
  // respuesta no dice qué pasó: eso queda en el registro del servidor.
  if (resultado === 'reintentar') return NextResponse.json({ error: 'reintentar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
