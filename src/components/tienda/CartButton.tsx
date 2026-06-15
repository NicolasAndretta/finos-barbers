'use client'

import { useCart } from '@/lib/cart-context'

export function CartButton() {
  const { count, openCart } = useCart()

  return (
    <button
      onClick={openCart}
      className="relative p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
      aria-label={`Carrito — ${count} ${count === 1 ? 'item' : 'items'}`}
    >
      {/* Bolsa de compras */}
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>

      {/* Badge de cantidad */}
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-amber-500 text-black text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
