'use client'

/**
 * El cartel de las muestras (Fase 6): en la web pública de un local en
 * "demo", una franja arriba avisa que es una muestra y que lo que se reserve
 * o se compre es de prueba. En el panel no va (ahí ya se sabe).
 * Al activar el local, el estado cambia y el cartel se va solo.
 */

import { usePathname } from 'next/navigation'
import { useLocal } from '@/components/local/LocalProvider'

export function CartelMuestra() {
  const local = useLocal()
  const pathname = usePathname()
  const area = pathname.split('/')[2]
  if (local.estado !== 'demo' || area === 'admin' || area === 'barbero') return null
  return (
    <div role="note" className="w-full bg-amber-500 text-zinc-950 text-center text-xs sm:text-sm font-semibold px-4 py-1.5">
      Esto es una muestra: las reservas y las compras son de prueba.
    </div>
  )
}
