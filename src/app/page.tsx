/**
 * src/app/page.tsx — la dirección "/" sola.
 *
 * Por ahora lleva al local de demostración (decisión 4 de docs/MULTITENANT.md).
 * Cuando el producto tenga nombre y página propia, esa página va acá.
 */

import { redirect } from 'next/navigation'
import { PRODUCTO } from '@/lib/producto'

export default function Inicio() {
  redirect(`/${PRODUCTO.localPorDefecto}`)
}
