'use client'

import { useEffect } from 'react'
import { useCart } from '@/lib/cart-context'

export function SuccessContent() {
  const { clearCart } = useCart()

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    clearCart()
  }, [clearCart])
  /* eslint-enable react-hooks/set-state-in-effect */

  return null
}
