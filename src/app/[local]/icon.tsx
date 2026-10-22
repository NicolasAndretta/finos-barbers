import { ImageResponse } from 'next/og'
import { getLocal } from '@/lib/local'
import { dibujoIcono, iniciales } from '@/lib/icono'
import { PRODUCTO } from '@/lib/producto'

// Ícono de un local: sus iniciales y su rubro (RB / BARBERÍA para Roble).
// Next lo arma para cada dirección (/roble/icon) y lo enlaza solo en sus páginas.
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default async function Icon({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  return new ImageResponse(
    dibujoIcono({
      dim: 512,
      iniciales: iniciales(local?.nombre ?? PRODUCTO.nombre),
      etiqueta: local?.palabras.negocio ?? 'Reservas',
    }),
    { ...size }
  )
}
