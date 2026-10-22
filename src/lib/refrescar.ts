/**
 * src/lib/refrescar.ts — SOLO SERVIDOR (acciones y rutas de API).
 *
 * Después de guardar algo, las pantallas de los locales se tienen que volver a
 * armar con los datos nuevos. En vez de listar página por página (y olvidarse
 * alguna), se refresca todo lo que cuelga de app/[local]: esas páginas dependen
 * de la sesión, así que igual se arman en cada visita y no hay caché que perder.
 */

import { revalidatePath } from 'next/cache'

export function refrescarLocales(): void {
  revalidatePath('/[local]', 'layout')
}
