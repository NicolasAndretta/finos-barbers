'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useLocal } from '@/components/local/LocalProvider'

export type CartItem = {
  id: string
  nombre: string
  precio: number
  imagen_url: string | null
  categoria: string
  cantidad: number
}

type CartContextType = {
  items: CartItem[]
  isOpen: boolean
  count: number
  total: number
  addItem: (item: Omit<CartItem, 'cantidad'>) => void
  removeItem: (id: string) => void
  updateCantidad: (id: string, cantidad: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  // Un carrito por local: lo que se agrega en la tienda de Roble no aparece en
  // la de otro local (y su checkout lo rechazaría). Se guarda en el navegador.
  const local = useLocal()
  const clave = `carrito-${local.slug}`
  const [items, setItems]     = useState<CartItem[]>([])
  const [isOpen, setIsOpen]   = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Cargar carrito desde localStorage al montar
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      // Roble usaba la clave "roble-cart" antes de la Fase 3a: se lee una vez
      // para que nadie pierda lo que tenía cargado.
      const stored = localStorage.getItem(clave) ?? (local.slug === 'roble' ? localStorage.getItem('roble-cart') : null)
      if (stored) setItems(JSON.parse(stored))
    } catch {}
    setHydrated(true)
  }, [clave, local.slug])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persistir en localStorage cuando cambia
  useEffect(() => {
    if (hydrated) {
      try { localStorage.setItem(clave, JSON.stringify(items)) } catch {}
    }
  }, [items, hydrated, clave])

  const addItem = (item: Omit<CartItem, 'cantidad'>) => {
    setItems(prev => {
      const existe = prev.find(i => i.id === item.id)
      if (existe) {
        return prev.map(i => i.id === item.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { ...item, cantidad: 1 }]
    })
    setIsOpen(true)
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const updateCantidad = (id: string, cantidad: number) => {
    if (cantidad <= 0) { removeItem(id); return }
    setItems(prev => prev.map(i => i.id === id ? { ...i, cantidad } : i))
  }

  const clearCart = () => setItems([])

  const count = items.reduce((acc, i) => acc + i.cantidad, 0)
  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)

  return (
    <CartContext.Provider value={{
      items, isOpen, count, total,
      addItem, removeItem, updateCantidad, clearCart,
      openCart:  () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
