/**
 * El manifiesto de la app instalable de un local (/roble/manifest.webmanifest).
 *
 * Es lo que lee el celular cuando alguien "instala" la página en su pantalla
 * de inicio: nombre, ícono y a dónde abre. Antes había uno solo, con Roble
 * escrito a mano; ahora cada local tiene el suyo, con sus datos de la base.
 * El layout del local lo enlaza (generateMetadata → manifest).
 */

import { getLocal } from '@/lib/local'
import { rutaLocal } from '@/lib/local-datos'

export async function GET(_req: Request, { params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  if (!local) return new Response('No existe', { status: 404 })

  const ruta = (r: string = '') => rutaLocal(local.slug, r)
  const manifiesto = {
    name: local.nombre,
    short_name: local.nombreCorto,
    description: `Reservá tu turno en ${local.nombre} desde cualquier dispositivo.`,
    start_url: ruta(),
    // "/" y no la carpeta del local: así el login (que es de toda la
    // plataforma) también se abre dentro de la app instalada.
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090b',
    theme_color: '#f59e0b',
    icons: [
      { src: ruta('/icon'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: ruta('/icon'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: ruta('/apple-icon'), sizes: '180x180', type: 'image/png' },
    ],
    shortcuts: [
      { name: 'Reservar turno', short_name: 'Reservar', url: ruta('/reservar'), description: 'Reservá un turno rápido' },
      { name: 'Mis turnos', short_name: 'Mis turnos', url: ruta('/turnos'), description: 'Mirá tus reservas' },
    ],
    categories: ['business', 'lifestyle'],
    lang: 'es',
  }

  return Response.json(manifiesto, { headers: { 'Content-Type': 'application/manifest+json' } })
}
