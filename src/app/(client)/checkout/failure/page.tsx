import Link from 'next/link'

export const metadata = { title: 'Pago fallido | Finos Barbers' }

export default function FailurePage() {
  return (
    <div className="w-full flex flex-col items-center justify-center py-16 text-center gap-6">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center">
        <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">El pago no fue aprobado</h1>
        <p className="text-zinc-400 mt-2 max-w-sm">
          Hubo un problema al procesar tu pago. Tu carrito sigue intacto.
        </p>
      </div>

      {/* Possible reasons */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-4 text-left max-w-sm w-full">
        <p className="text-zinc-400 text-sm font-semibold mb-2">Posibles causas:</p>
        <ul className="space-y-1.5 text-zinc-500 text-sm list-disc list-inside">
          <li>Fondos insuficientes</li>
          <li>Datos de tarjeta incorrectos</li>
          <li>Pago rechazado por el banco</li>
          <li>Cancelaste el proceso</li>
        </ul>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <Link
          href="/checkout"
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm px-6 py-3 rounded-xl transition-colors"
        >
          Reintentar pago
        </Link>
        <Link
          href="/tienda"
          className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors border border-zinc-700"
        >
          Volver a la tienda
        </Link>
      </div>
    </div>
  )
}
