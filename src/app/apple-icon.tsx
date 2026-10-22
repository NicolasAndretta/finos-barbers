import { ImageResponse } from 'next/og'
import { dibujoIcono, iniciales } from '@/lib/icono'
import { PRODUCTO } from '@/lib/producto'

// Ícono de las páginas que no son de un local (el login, por ejemplo): el del
// producto. Cada local tiene el suyo en app/[local]/apple-icon.tsx.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    dibujoIcono({ dim: 180, iniciales: iniciales(PRODUCTO.nombre), etiqueta: 'Reservas' }),
    { ...size }
  )
}
