'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart-context'
import { formatPrecio } from '@/lib/format'

export function CartDrawer() {
  const { items, isOpen, count, total, removeItem, updateCantidad, closeCart } = useCart()

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 z-50 bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Tu carrito</h2>
            {count > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {count} {count === 1 ? 'producto' : 'productos'}
              </p>
            )}
          </div>
          <button
            onClick={closeCart}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">Tu carrito está vacío</p>
              <p className="text-zinc-500 text-sm mt-1">Explorá nuestra tienda y agregá productos</p>
            </div>
            <button
              onClick={closeCart}
              className="text-amber-400 hover:text-amber-300 text-sm font-semibold transition-colors cursor-pointer"
            >
              Ver productos →
            </button>
          </div>
        ) : (
          <>
            {/* Lista de items */}
            <div className="flex-1 overflow-y-auto py-4 px-5 space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex gap-3">
                  {/* Imagen / placeholder */}
                  <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden flex items-center justify-center">
                    {item.imagen_url ? (
                      <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{getCategoryEmoji(item.categoria)}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm leading-tight truncate">{item.nombre}</p>
                    <p className="text-amber-400 font-bold text-sm mt-0.5">{formatPrecio(item.precio)}</p>

                    {/* Controles de cantidad */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateCantidad(item.id, item.cantidad - 1)}
                        className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 text-white text-sm flex items-center justify-center transition-colors cursor-pointer"
                      >
                        −
                      </button>
                      <span className="text-white text-sm font-medium w-4 text-center tabular-nums">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => updateCantidad(item.id, item.cantidad + 1)}
                        className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 text-white text-sm flex items-center justify-center transition-colors cursor-pointer"
                      >
                        +
                      </button>
                      <span className="text-zinc-600 text-xs ml-1">
                        = {formatPrecio(item.precio * item.cantidad)}
                      </span>
                    </div>
                  </div>

                  {/* Eliminar */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors p-1 self-start cursor-pointer shrink-0"
                    aria-label="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 px-5 py-4 space-y-4 shrink-0">
              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">Subtotal</span>
                <span className="text-white font-bold text-xl">{formatPrecio(total)}</span>
              </div>

              {/* CTAs */}
              <Link
                href="/checkout"
                onClick={closeCart}
                className="block w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm py-3 rounded-xl text-center transition-colors"
              >
                Ir al checkout →
              </Link>
              <button
                onClick={closeCart}
                className="w-full text-zinc-400 hover:text-white text-sm font-medium py-2 transition-colors cursor-pointer"
              >
                Seguir comprando
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function getCategoryEmoji(categoria: string): string {
  const map: Record<string, string> = {
    'cuidado-cabello': '✂️',
    'barba': '🪒',
    'accesorios': '🎒',
    'otros': '📦',
  }
  return map[categoria] ?? '📦'
}
