'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
  const [items, setItems]     = useState<CartItem[]>([])
  const [isOpen, setIsOpen]   = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Cargar carrito desde localStorage al montar
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const stored = localStorage.getItem('finos-cart')
      if (stored) setItems(JSON.parse(stored))
    } catch {}
    setHydrated(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persistir en localStorage cuando cambia
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem('finos-cart', JSON.stringify(items))
    }
  }, [items, hydrated])

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
