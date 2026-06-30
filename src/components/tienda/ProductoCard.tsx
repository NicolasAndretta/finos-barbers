'use client'

import { useCart } from '@/lib/cart-context'
import { formatPrecio } from '@/lib/format'
import type { Producto } from '@/types'

const CATEGORIA_META: Record<string, { label: string; emoji: string; badgeClass: string; gradientClass: string }> = {
  'cuidado-cabello': {
    label: 'Cuidado del cabello',
    emoji: '✂️',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    gradientClass: 'from-blue-900/50 to-zinc-900',
  },
  'barba': {
    label: 'Barba',
    emoji: '🪒',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    gradientClass: 'from-amber-900/40 to-zinc-900',
  },
  'accesorios': {
    label: 'Accesorios',
    emoji: '🎒',
    badgeClass: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    gradientClass: 'from-violet-900/40 to-zinc-900',
  },
  'otros': {
    label: 'Otros',
    emoji: '📦',
    badgeClass: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    gradientClass: 'from-zinc-800 to-zinc-900',
  },
}

export function ProductoCard({ producto }: { producto: Producto }) {
  const { items, addItem, updateCantidad } = useCart()
  const itemEnCarrito = items.find(i => i.id === producto.id)
  const meta = CATEGORIA_META[producto.categoria] ?? CATEGORIA_META['otros']
  const sinStock = producto.stock === 0

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden flex flex-col group hover:border-zinc-700 transition-colors">
      {/* Imagen / placeholder */}
      <div className={`relative h-44 bg-gradient-to-br ${meta.gradientClass} overflow-hidden`}>
        {producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-60 group-hover:scale-110 transition-transform duration-500">
              {meta.emoji}
            </span>
          </div>
        )}

        {/* Badge de stock bajo */}
        {producto.stock > 0 && producto.stock <= 3 && (
          <span className="absolute top-2 right-2 bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ¡Últimas {producto.stock}!
          </span>
        )}
        {sinStock && (
          <div className="absolute inset-0 bg-zinc-950/70 flex items-center justify-center">
            <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-3 py-1 rounded-full border border-zinc-700">
              Sin stock
            </span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Categoría */}
        <span className={`self-start text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
          {meta.label}
        </span>

        {/* Nombre y descripción */}
        <div className="flex-1">
          <h3 className="text-white font-bold text-base leading-tight">{producto.nombre}</h3>
          <p className="text-zinc-500 text-xs mt-1 leading-relaxed line-clamp-2">{producto.descripcion}</p>
        </div>

        {/* Precio + acción */}
        <div className="flex items-center justify-between gap-3 mt-1">
          <span className="text-amber-400 font-black text-xl">{formatPrecio(producto.precio)}</span>

          {sinStock ? (
            <span className="text-zinc-600 text-xs font-medium">No disponible</span>
          ) : itemEnCarrito ? (
            /* Controles de cantidad cuando está en el carrito */
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateCantidad(producto.id, itemEnCarrito.cantidad - 1)}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-colors cursor-pointer font-bold"
              >
                −
              </button>
              <span className="text-white font-bold text-sm w-4 text-center tabular-nums">
                {itemEnCarrito.cantidad}
              </span>
              <button
                onClick={() => updateCantidad(producto.id, itemEnCarrito.cantidad + 1)}
                disabled={itemEnCarrito.cantidad >= producto.stock}
                className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black flex items-center justify-center transition-colors cursor-pointer font-bold"
              >
                +
              </button>
            </div>
          ) : (
            /* Botón agregar */
            <button
              onClick={() => addItem({
                id: producto.id,
                nombre: producto.nombre,
                precio: producto.precio,
                imagen_url: producto.imagen_url,
                categoria: producto.categoria,
              })}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Agregar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
