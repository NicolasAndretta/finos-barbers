import { ImageResponse } from 'next/og'
import { dibujoIcono, iniciales } from '@/lib/icono'
import { PRODUCTO } from '@/lib/producto'

// Ícono de las páginas que no son de un local (el login, por ejemplo): el del
// producto. Cada local tiene el suyo en app/[local]/icon.tsx.
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    dibujoIcono({ dim: 512, iniciales: iniciales(PRODUCTO.nombre), etiqueta: 'Reservas' }),
    { ...size }
  )
}
