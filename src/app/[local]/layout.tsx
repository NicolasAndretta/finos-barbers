/**
 * src/app/[local]/layout.tsx
 *
 * La puerta de cada local: todo lo que vive en /<local>/... pasa por acá.
 *
 *  1. Busca el local de la dirección en la base (`getLocal`).
 *  2. Si no existe → página "no existe" (404).
 *  3. Si está suspendido o archivado → un aviso, salvo para quien lo
 *     administra o edita (dueño, equipo), que lo sigue viendo para arreglarlo.
 *  4. Si está bien → lo pone a disposición de los componentes del navegador
 *     (`LocalProvider`) y muestra la página.
 *  5. Si es una muestra (Fase 6): el cartel de "Muestra" en la web pública, y
 *     que Google no la indexe. Solo un local activo aparece en Google.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLocal, getPermisos } from '@/lib/local'
import { localVisible } from '@/lib/local-datos'
import { LocalProvider } from '@/components/local/LocalProvider'
import { PwaInstallPrompt } from '@/components/ui/PwaInstallPrompt'
import { CartelMuestra } from '@/components/local/CartelMuestra'
import { PRODUCTO } from '@/lib/producto'
import { cssDelAcento } from '@/lib/acentos'

type Props = { children: React.ReactNode; params: Promise<{ local: string }> }

export async function generateMetadata({ params }: { params: Promise<{ local: string }> }): Promise<Metadata> {
  const local = await getLocal((await params).local)
  if (!local) return { title: PRODUCTO.nombre }
  const lugar = local.ciudad ? ` en ${local.ciudad}` : ''
  return {
    title: `${local.nombre} | ${local.palabras.negocio}${lugar}`,
    description: local.descripcion || `Reservá tu turno online en ${local.nombre}.`,
    appleWebApp: { capable: true, title: local.nombre, statusBarStyle: 'black-translucent' },
    // La app instalable de ESTE local (app/[local]/manifest.webmanifest).
    manifest: `/${local.slug}/manifest.webmanifest`,
    // Las muestras (y lo suspendido o archivado) no van a Google.
    ...(local.estado === 'activo' ? {} : { robots: { index: false, follow: false } }),
  }
}

export default async function LocalLayout({ children, params }: Props) {
  const local = await getLocal((await params).local)
  if (!local) notFound()

  if (!localVisible(local)) {
    const permisos = await getPermisos(local.id)
    if (!permisos.editaCatalogo) return <LocalNoDisponible nombre={local.nombre} estado={local.estado} />
  }

  // Su color de acento (0017): redefine las 11 variables de la escala de
  // acentos. Va en un <style> dentro de este layout (no "hoisted"): al salir del
  // local, se va con él. El texto sale de la paleta curada, no de lo que se cargó.
  const acento = cssDelAcento(local.acento)

  return (
    <LocalProvider local={local}>
      {acento && <style dangerouslySetInnerHTML={{ __html: acento }} />}
      <CartelMuestra />
      {children}
      <PwaInstallPrompt />
    </LocalProvider>
  )
}

function LocalNoDisponible({ nombre, estado }: { nombre: string; estado: string }) {
  const texto = estado === 'archivado'
    ? 'Esta página ya no está disponible.'
    : 'Por el momento no está tomando reservas desde acá.'
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-white">{nombre}</h1>
      <p className="text-zinc-400 max-w-sm">{texto}</p>
      <Link href="/" className="text-sm text-zinc-500 hover:text-white underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  )
}
