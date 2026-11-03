'use client'

/**
 * El cartel de las muestras (Fase 6): en la web pública de un local en
 * "demo", una franja arriba avisa que es una muestra y que lo que se reserve
 * o se compre es de prueba. En el panel no va (ahí ya se sabe).
 * Al activar el local, el estado cambia y el cartel se va solo.
 *
 * Un local archivado o suspendido, el público no lo ve ("no disponible"): solo
 * quien lo edita (el equipo, su dueño). A ellos, una franja les avisa que lo
 * están viendo igual, en la web y en el panel.
 */

import { usePathname } from 'next/navigation'
import { useLocal } from '@/components/local/LocalProvider'

export function CartelMuestra() {
  const local = useLocal()
  const pathname = usePathname()
  const area = pathname.split('/')[2]
  if (local.estado === 'archivado' || local.estado === 'suspendido') {
    return (
      <div role="note" className="w-full bg-zinc-800 text-zinc-100 text-center text-xs sm:text-sm font-semibold px-4 py-1.5">
        {local.estado === 'archivado'
          ? 'Archivada: el público no la ve (dice "Esta página ya no está disponible"). La ves vos porque la administrás.'
          : 'Suspendido: el público no puede reservar. Lo ves vos porque lo administrás.'}
      </div>
    )
  }
  if (local.estado !== 'demo' || area === 'admin' || area === 'barbero') return null
  return (
    <div role="note" className="w-full bg-amber-500 text-zinc-950 text-center text-xs sm:text-sm font-semibold px-4 py-1.5">
      Esto es una muestra: las reservas y las compras son de prueba.
    </div>
  )
}
