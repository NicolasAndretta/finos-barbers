/**
 * src/app/(producto)/layout.tsx — las páginas de Retoque, el producto.
 *
 * La página del producto (/) y sus páginas legales (/terminos, /privacidad,
 * /arrepentimiento y /baja) comparten la cabecera y el pie. No son de ningún local: el logo dibuja el nombre del
 * producto (src/lib/producto.ts).
 *
 * El llamado principal depende de si hay WhatsApp del producto: sin número,
 * "Mirá la demo"; con número, "Pedí tu muestra" (lo carga Nico).
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { PRODUCTO, whatsappProducto } from '@/lib/producto'
import { rutaLocal } from '@/lib/local-datos'
import { LINKS_LEGALES } from '@/components/producto/Legal'

const DESCRIPCION =
  'La página de tu barbería, con turnos online, seña y reseñas de clientes que fueron de verdad. ' +
  'Te armamos una muestra con el nombre de tu barbería, gratis por 30 días.'

/** La dirección pública del sitio, para que Open Graph lleve links completos. */
function base(): URL | undefined {
  try {
    return process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined
  } catch {
    return undefined
  }
}

export const metadata: Metadata = {
  metadataBase: base(),
  title: {
    default: `${PRODUCTO.nombre}: turnos online para barberías`,
    template: `%s | ${PRODUCTO.nombre}`,
  },
  description: DESCRIPCION,
  applicationName: PRODUCTO.nombre,
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: PRODUCTO.nombre,
    title: `${PRODUCTO.nombre}: turnos online para barberías`,
    description: DESCRIPCION,
  },
  twitter: { card: 'summary_large_image' },
}

export default function ProductoLayout({ children }: { children: React.ReactNode }) {
  const whatsapp = whatsappProducto()
  const demo = rutaLocal(PRODUCTO.localPorDefecto)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <header className="border-b border-white/5 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" aria-label={`${PRODUCTO.nombre}: inicio`} className="shrink-0">
            <Logo size={32} priority />
          </Link>

          <nav aria-label="Secciones" className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-300">
            <Link href="/#como-funciona" className="hover:text-white transition-colors">Cómo funciona</Link>
            <Link href="/#planes" className="hover:text-white transition-colors">Planes</Link>
            <Link href="/#preguntas" className="hover:text-white transition-colors">Preguntas</Link>
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/login" className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors">
              Ingresar
            </Link>
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-amber-400 hover:bg-amber-300 text-zinc-950 text-sm font-bold px-3.5 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                Pedí tu muestra
              </a>
            ) : (
              <Link
                href={demo}
                className="bg-amber-400 hover:bg-amber-300 text-zinc-950 text-sm font-bold px-3.5 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                Mirá la demo
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      <footer className="border-t border-white/5 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex flex-col gap-3 max-w-sm">
              <Logo size={30} className="self-start" />
              <p className="text-zinc-400 text-sm leading-relaxed">
                Turnos online y la página propia de tu barbería. Hecho en Buenos Aires.
              </p>
              <p className="text-zinc-500 text-sm">
                {PRODUCTO.nombre} es un producto de <span className="text-zinc-300 font-semibold">{PRODUCTO.marca}</span>.
              </p>
            </div>
            <nav aria-label="Pie" className="flex flex-col gap-2.5 text-sm">
              <Link href={demo} className="text-zinc-300 hover:text-white transition-colors">La demo: Roble</Link>
              <Link href="/#planes" className="text-zinc-300 hover:text-white transition-colors">Planes</Link>
              <Link href="/#preguntas" className="text-zinc-300 hover:text-white transition-colors">Preguntas frecuentes</Link>
              <Link href="/login" className="text-zinc-300 hover:text-white transition-colors">Ingresar a tu panel</Link>
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white transition-colors">
                  WhatsApp
                </a>
              )}
            </nav>
          </div>
          {/* Los dos botones de la Disposición 954/2025: visibles y con su nombre. */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/arrepentimiento"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Botón de arrepentimiento
            </Link>
            <Link
              href="/baja"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Botón de baja
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs">
            <p className="text-zinc-600">© {new Date().getFullYear()} {PRODUCTO.nombre}</p>
            <nav aria-label="Legales" className="flex flex-wrap gap-x-5 gap-y-2">
              {LINKS_LEGALES.map((l) => (
                <Link key={l.href} href={l.href} className="text-zinc-400 hover:text-white transition-colors">
                  {l.texto}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
