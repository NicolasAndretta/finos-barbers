import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Finos Barbers',
    short_name: 'Finos',
    description: 'Agenda tu turno y gestioná tu barbería desde cualquier dispositivo.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090b',
    theme_color: '#f59e0b',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Reservar turno',
        short_name: 'Reservar',
        url: '/reservar',
        description: 'Agenda un turno rápidamente',
      },
      {
        name: 'Mis turnos',
        short_name: 'Mis turnos',
        url: '/turnos',
        description: 'Ver mis reservas',
      },
    ],
    categories: ['business', 'lifestyle'],
    lang: 'es',
  }
}
