/**
 * La marca que se ve arriba del login, del registro y de la confirmación.
 *
 * El login es uno solo para todos los locales. Si la persona llegó desde un
 * local (?local=roble), se ve el logo de ese local y el link vuelve a él. Si
 * no, se ve el del producto. Componente de servidor: busca el local en la base.
 */

import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { LocalProvider } from '@/components/local/LocalProvider'
import { getLocal } from '@/lib/local'
import { localVisible, rutaLocal } from '@/lib/local-datos'

export async function MarcaAcceso({ slug, size = 52 }: { slug?: string | null; size?: number }) {
  const local = slug ? await getLocal(slug) : null

  if (local && localVisible(local)) {
    return (
      <LocalProvider local={local}>
        <Link href={rutaLocal(local.slug)} aria-label={`Volver a ${local.nombre}`}>
          <Logo size={size} priority />
        </Link>
      </LocalProvider>
    )
  }

  return (
    <Link href="/" aria-label="Inicio">
      <Logo size={size} priority />
    </Link>
  )
}
