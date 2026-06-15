'use client'

import { useState, useMemo } from 'react'
import { ProductoCard } from './ProductoCard'
import type { Producto, CategoriaProducto } from '@/types'

const CATEGORIAS: { value: CategoriaProducto | 'todas'; label: string; emoji: string }[] = [
  { value: 'todas',           label: 'Todos',           emoji: '🛒' },
  { value: 'cuidado-cabello', label: 'Cabello',         emoji: '✂️' },
  { value: 'barba',           label: 'Barba',           emoji: '🪒' },
  { value: 'accesorios',      label: 'Accesorios',      emoji: '🎒' },
  { value: 'otros',           label: 'Otros',           emoji: '📦' },
]

export function TiendaCatalogo({ productos }: { productos: Producto[] }) {
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaProducto | 'todas'>('todas')
  const [busqueda, setBusqueda] = useState('')

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchCategoria = categoriaActiva === 'todas' || p.categoria === categoriaActiva
      const matchBusqueda  = !busqueda.trim() || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      return matchCategoria && matchBusqueda
    })
  }, [productos, categoriaActiva, busqueda])

  return (
    <div className="space-y-6">
      {/* Buscador */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filtros de categoría */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIAS.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategoriaActiva(cat.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
              categoriaActiva === cat.value
                ? 'bg-amber-500 text-black border-amber-500'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
            }`}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de productos */}
      {productosFiltrados.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-lg">
            {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay productos en esta categoría'}
          </p>
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="mt-3 text-amber-400 hover:text-amber-300 text-sm font-semibold transition-colors cursor-pointer"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-zinc-500 text-xs">
            {productosFiltrados.length} {productosFiltrados.length === 1 ? 'producto' : 'productos'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productosFiltrados.map(producto => (
              <ProductoCard key={producto.id} producto={producto} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
