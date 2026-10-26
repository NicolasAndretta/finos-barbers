import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SuccessContent } from '@/components/checkout/SuccessContent'
import { getLocal } from '@/lib/local'
import { rutaLocal } from '@/lib/local-datos'
import { createServiceClient } from '@/lib/supabase'
import { leerReferencia, verificarPago } from '@/lib/cobros'

export async function generateMetadata({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  return { title: `Tu compra | ${local?.nombre ?? ''}` }
}

type SearchParams = Promise<{ payment_id?: string; external_reference?: string }>

/**
 * A donde vuelve el cliente después de pagar en la tienda.
 *
 * Lo que trae la dirección (estado, número de pago) NO se cree: cualquiera la
 * puede escribir a mano. Se le pregunta el pago a Mercado Pago con la cuenta
 * del local (la misma verificación que hace el aviso de pago, lib/cobros.ts),
 * y lo que se muestra sale de la base. Si Mercado Pago no contesta, se muestra
 * "estamos confirmando" y el aviso lo termina después.
 */
export default async function SuccessPage({ params: rutaParams, searchParams }: { params: Promise<{ local: string }>; searchParams: SearchParams }) {
  const local = await getLocal((await rutaParams).local)
  if (!local) notFound()
  const slug = local.slug
  const params = await searchParams

  let estado: 'pagado' | 'confirmando' | null = null
  let pedidoId: string | null = null
  if (typeof params.payment_id === 'string' && params.payment_id) {
    const verificado = await verificarPago(local.id, params.payment_id)
    // Si Mercado Pago no pudo contestar, la referencia de la dirección sirve
    // para mostrar "estamos confirmando" de un pedido de este local (no cambia
    // nada). Si contestó que ese pago no es de acá, no se muestra ningún pedido.
    const referencia = verificado.referencia
      ?? (verificado.resultado === 'reintentar' ? leerReferencia(params.external_reference) : null)
    if (referencia?.tipo === 'pedido') {
      // Con la llave del servidor, porque la compra pudo ser sin cuenta.
      // Solo se lee el estado, y solo de un pedido de ESTE local.
      const { data: pedido } = await createServiceClient()
        .from('pedidos')
        .select('id, estado')
        .eq('id', referencia.id)
        .eq('local_id', local.id)
        .maybeSingle()
      if (pedido) {
        pedidoId = pedido.id
        estado = pedido.estado === 'pagado' || pedido.estado === 'enviado' ? 'pagado' : pedido.estado === 'pendiente' ? 'confirmando' : null
      }
    }
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-16 text-center gap-6">
      {/* Si hubo una compra, el carrito se vacía. */}
      {estado && <SuccessContent />}

      <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
        estado === 'pagado' ? 'bg-emerald-500/15' : 'bg-yellow-500/15'
      }`}>
        {estado === 'pagado' ? (
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-extrabold text-white">
          {estado === 'pagado' ? '¡Pago exitoso!' : estado === 'confirmando' ? '¡Pedido recibido!' : 'No encontramos un pago para mostrar'}
        </h1>
        <p className="text-zinc-400 mt-2 max-w-sm mx-auto">
          {estado === 'pagado'
            ? 'Tu pedido fue confirmado. ¡Gracias por tu compra!'
            : estado === 'confirmando'
              ? 'Estamos confirmando tu pago con Mercado Pago. Si ya pagaste, no hace falta que pagues de nuevo.'
              : 'Si pagaste, en unos minutos tu pedido queda confirmado. Ante cualquier duda, escribile al local.'}
        </p>
      </div>

      {pedidoId && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold mb-1">Número de pedido</p>
          <p className="text-white font-mono text-sm">{pedidoId.slice(0, 8).toUpperCase()}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <Link
          href={rutaLocal(slug)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm px-6 py-3 rounded-xl transition-colors"
        >
          Ir al inicio
        </Link>
        <Link
          href={rutaLocal(slug, '/tienda')}
          className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors border border-zinc-700"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}
