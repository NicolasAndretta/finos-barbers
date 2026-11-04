import { ImageResponse } from 'next/og'
import { PRODUCTO } from '@/lib/producto'

// La imagen que se ve al compartir el link de Retoque (WhatsApp, Instagram).
// Solo para las páginas del producto: cada local se comparte con lo suyo.
export const alt = `${PRODUCTO.nombre}: turnos online para barberías`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Imagen() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 96px',
          background: 'radial-gradient(70% 90% at 80% 20%, #2a1f14 0%, #0a0a0a 65%)',
          color: '#f4f1ec',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 64, height: 4, background: '#c79c64' }} />
          <div style={{ fontSize: 30, letterSpacing: 8, color: '#c79c64', fontWeight: 700 }}>TURNOS ONLINE</div>
        </div>
        <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -2, marginTop: 18, lineHeight: 1 }}>
          {PRODUCTO.nombre}
        </div>
        <div style={{ fontSize: 44, color: '#d4d4d8', marginTop: 28, lineHeight: 1.25, maxWidth: 900 }}>
          La página de tu barbería, donde tus clientes reservan solos.
        </div>
      </div>
    ),
    { ...size },
  )
}
