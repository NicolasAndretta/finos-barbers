import { ImageResponse } from 'next/og'
import { getLocal } from '@/lib/local'
import { dibujoIcono, iniciales } from '@/lib/icono'
import { PRODUCTO } from '@/lib/producto'

// Ícono de un local: sus iniciales y su rubro (RB / BARBERÍA para Roble).
// Next lo arma para cada dirección (/roble/apple-icon) y lo enlaza solo en sus páginas.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  return new ImageResponse(
    dibujoIcono({
      dim: 180,
      iniciales: iniciales(local?.nombre ?? PRODUCTO.nombre),
      etiqueta: local?.palabras.negocio ?? 'Reservas',
    }),
    { ...size }
  )
}
