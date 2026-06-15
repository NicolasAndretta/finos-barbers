import Link from 'next/link'
import { actualizarEstadoPedido } from '@/app/actions/checkout'
import { SuccessContent } from '@/components/checkout/SuccessContent'

export const metadata = { title: 'Pago exitoso | Finos Barbers' }

type SearchParams = Promise<{
  payment_id?: string
  external_reference?: string
  status?: string
  collection_status?: string
}>

export default async function SuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const params    = await searchParams
  const paymentId = params.payment_id
  const pedidoId  = params.external_reference
  const status    = params.status ?? params.collection_status

  // Update pedido status (idempotent — safe to call multiple times)
  if (pedidoId && paymentId && (status === 'approved' || status === 'pending')) {
    try {
      await actualizarEstadoPedido(pedidoId, paymentId)
    } catch {
      // Silently ignore — pedido may already be updated
    }
  }

  const isPending = status === 'pending'

  return (
    <div className="w-full flex flex-col items-center justify-center py-16 text-center gap-6">
      {/* Clear cart client-side */}
      <SuccessContent />

      {/* Icon */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
        isPending ? 'bg-yellow-500/15' : 'bg-emerald-500/15'
      }`}>
        {isPending ? (
          <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">
          {isPending ? '¡Pedido recibido!' : '¡Pago exitoso!'}
        </h1>
        <p className="text-zinc-400 mt-2 max-w-sm">
          {isPending
            ? 'Tu pago está siendo procesado. Te avisaremos cuando se confirme.'
            : 'Tu pedido fue confirmado. ¡Gracias por tu compra!'}
        </p>
      </div>

      {/* Pedido ID */}
      {pedidoId && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold mb-1">Número de pedido</p>
          <p className="text-white font-mono text-sm">{pedidoId.slice(0, 8).toUpperCase()}</p>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <Link
          href="/dashboard"
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm px-6 py-3 rounded-xl transition-colors"
        >
          Ir al inicio
        </Link>
        <Link
          href="/tienda"
          className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors border border-zinc-700"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}
