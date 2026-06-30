'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/cart-context'
import { crearPedido } from '@/app/actions/checkout'
import { Spinner } from '@/components/ui/Spinner'
import { formatPrecio } from '@/lib/format'
import type { TipoEntrega } from '@/types'

const CATEGORIA_EMOJI: Record<string, string> = {
  'cuidado-cabello': '✂️',
  'barba': '🪒',
  'accesorios': '🎒',
  'otros': '📦',
}

export function CheckoutForm({ loggedIn }: { loggedIn: boolean }) {
  const { items, total } = useCart()
  const [mounted, setMounted]             = useState(false)
  const [tipoEntrega, setTipoEntrega]     = useState<TipoEntrega>('retiro')
  const [direccion, setDireccion]         = useState('')
  const [nombre, setNombre]               = useState('')
  const [email, setEmail]                 = useState('')
  const [telefono, setTelefono]           = useState('')
  const [error, setError]                 = useState('')
  const [isPending, startTransition]      = useTransition()

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setMounted(true) }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8 text-amber-400" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <p className="text-zinc-300 font-semibold text-lg">Tu carrito está vacío</p>
        <p className="text-zinc-500 text-sm mt-1">Agregá productos antes de continuar</p>
        <Link
          href="/tienda"
          className="inline-block mt-6 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm px-6 py-2.5 rounded-lg transition-colors"
        >
          Ir a la tienda
        </Link>
      </div>
    )
  }

  const handlePagar = () => {
    setError('')

    if (tipoEntrega === 'envio' && !direccion.trim()) {
      setError('Ingresá la dirección de envío')
      return
    }

    if (!loggedIn) {
      if (!nombre.trim()) { setError('Ingresá tu nombre'); return }
      if (!email.trim() && !telefono.trim()) {
        setError('Dejá un email o teléfono de contacto'); return
      }
    }

    startTransition(async () => {
      const fd = new FormData()
      fd.append('items', JSON.stringify(items.map(i => ({ id: i.id, cantidad: i.cantidad }))))
      fd.append('tipo_entrega', tipoEntrega)
      if (tipoEntrega === 'envio') fd.append('direccion_envio', direccion.trim())
      if (!loggedIn) {
        fd.append('cliente_nombre', nombre.trim())
        fd.append('cliente_email', email.trim())
        fd.append('cliente_telefono', telefono.trim())
      }

      const result = await crearPedido(fd)

      if ('error' in result) {
        setError(result.error ?? 'Error desconocido')
        return
      }

      if (result.url_checkout) {
        window.location.href = result.url_checkout
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Izq: resumen del pedido (3/5) */}
      <div className="lg:col-span-3 space-y-4">
        <h2 className="text-lg font-bold text-white">Resumen del pedido</h2>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4">
              {/* Imagen / emoji */}
              <div className="w-14 h-14 rounded-xl bg-zinc-800 shrink-0 flex items-center justify-center overflow-hidden">
                {item.imagen_url ? (
                  <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{CATEGORIA_EMOJI[item.categoria] ?? '📦'}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{item.nombre}</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {formatPrecio(item.precio)} × {item.cantidad}
                </p>
              </div>

              {/* Subtotal */}
              <span className="text-amber-400 font-bold text-sm shrink-0">
                {formatPrecio(item.precio * item.cantidad)}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex justify-between items-center">
          <span className="text-zinc-400 font-medium">Total</span>
          <span className="text-white font-black text-2xl">{formatPrecio(total)}</span>
        </div>
      </div>

      {/* Der: entrega + pago (2/5) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Datos del invitado (solo si no hay sesión) */}
        {!loggedIn && (
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Tus datos</h2>
            <p className="text-zinc-500 text-xs mb-4">
              Comprá sin crear cuenta. Te contactamos por acá.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Nombre y apellido"
                className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50"
              />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email (para el comprobante)"
                className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50"
              />
              <input
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="WhatsApp / teléfono"
                className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50"
              />
            </div>
          </div>
        )}

        {/* Método de entrega */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Método de entrega</h2>

          <div className="space-y-3">
            {/* Retiro */}
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                tipoEntrega === 'retiro'
                  ? 'border-amber-500/60 bg-amber-500/5'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <input
                type="radio"
                name="entrega"
                value="retiro"
                checked={tipoEntrega === 'retiro'}
                onChange={() => setTipoEntrega('retiro')}
                className="mt-0.5 accent-amber-500"
              />
              <div>
                <p className="text-white font-semibold text-sm">Retiro en el local</p>
                <p className="text-zinc-500 text-xs mt-0.5">Sin costo adicional</p>
              </div>
              <span className="ml-auto text-emerald-400 font-bold text-sm shrink-0">Gratis</span>
            </label>

            {/* Envío */}
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                tipoEntrega === 'envio'
                  ? 'border-amber-500/60 bg-amber-500/5'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <input
                type="radio"
                name="entrega"
                value="envio"
                checked={tipoEntrega === 'envio'}
                onChange={() => setTipoEntrega('envio')}
                className="mt-0.5 accent-amber-500"
              />
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Envío a domicilio</p>
                <p className="text-zinc-500 text-xs mt-0.5">Costo a coordinar</p>

                {tipoEntrega === 'envio' && (
                  <textarea
                    value={direccion}
                    onChange={e => setDireccion(e.target.value)}
                    placeholder="Calle, número, piso, ciudad..."
                    rows={3}
                    className="mt-3 w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                    onClick={e => e.stopPropagation()}
                  />
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Pago */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Pago</h2>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 mb-4">
              {error}
            </p>
          )}

          <button
            onClick={handlePagar}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-3 bg-[#009ee3] hover:bg-[#008fcf] disabled:bg-[#009ee3]/50 text-white font-bold text-sm py-4 rounded-xl transition-colors cursor-pointer"
          >
            {isPending ? (
              <Spinner className="w-5 h-5 text-white" />
            ) : (
              <MercadoPagoIcon />
            )}
            {isPending ? 'Procesando...' : 'Pagar con MercadoPago'}
          </button>

          <p className="text-zinc-600 text-xs text-center mt-3">
            Serás redirigido a la plataforma segura de MercadoPago
          </p>

          {/* Volver */}
          <Link
            href="/tienda"
            className="block text-center text-zinc-500 hover:text-zinc-300 text-xs font-medium mt-4 transition-colors"
          >
            ← Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  )
}

function MercadoPagoIcon() {
  return (
    <svg viewBox="0 0 36 18" className="h-5 w-auto" fill="none">
      <path
        d="M18 0C8.06 0 0 4.03 0 9c0 4.97 8.06 9 18 9s18-4.03 18-9c0-4.97-8.06-9-18-9z"
        fill="white"
        fillOpacity="0.15"
      />
      <text x="50%" y="13" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
        MercadoPago
      </text>
    </svg>
  )
}
