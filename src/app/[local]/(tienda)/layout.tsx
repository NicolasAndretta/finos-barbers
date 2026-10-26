import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { getLocal, getPermisos } from '@/lib/local'
import { rutaLocal } from '@/lib/local-datos'
import { Logo } from '@/components/ui/Logo'
import { CartProvider } from '@/lib/cart-context'
import { CartButton } from '@/components/tienda/CartButton'
import { CartDrawer } from '@/components/tienda/CartDrawer'
import { modoDeCobro } from '@/lib/cobros'

// Layout PÚBLICO de la tienda y el checkout: cualquiera puede ver productos y
// comprar sin cuenta (guest checkout). Si hay sesión, mostramos acceso a la cuenta.
// Si el local no cobra online, la tienda es un catálogo: sin carrito (cada
// producto se consulta por WhatsApp).
export default async function TiendaLayout({ children, params }: { children: React.ReactNode; params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  if (!local) notFound()
  const ruta = (r: string = '') => rutaLocal(local.slug, r)
  const conCarrito = (await modoDeCobro(local)) !== 'sin_mercadopago'
  // "Mi cuenta" lleva a lo que es en ESTE local: su panel o su área de cliente.
  const profile = await getProfile()
  const permisos = profile ? await getPermisos(local.id) : null
  const cuentaLink = !profile
    ? null
    : permisos?.editaCatalogo
      ? ruta('/admin/dashboard')
      : ruta('/dashboard')

  return (
    <CartProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
        <header className="border-b border-white/5 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 h-16 flex items-center justify-between">
            <Link href={ruta()} aria-label={`${local.nombre} — inicio`} className="flex items-center">
              <Logo size={32} />
            </Link>

            <nav className="hidden sm:flex items-center gap-7 text-sm font-medium text-zinc-300">
              <Link href={ruta()} className="hover:text-white transition-colors">Inicio</Link>
              <Link href={ruta('/tienda')} className="hover:text-white transition-colors">Tienda</Link>
              <Link href={ruta('/reservar')} className="hover:text-white transition-colors">Reservar</Link>
            </nav>

            <div className="flex items-center gap-3">
              {conCarrito && <CartButton />}
              {cuentaLink ? (
                <Link
                  href={cuentaLink}
                  className="bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Mi cuenta
                </Link>
              ) : (
                <Link
                  href={`/login?local=${local.slug}`}
                  className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Ingresar
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-5 sm:px-6 py-8 md:py-12">
          {children}
        </main>

        {conCarrito && <CartDrawer />}
      </div>
    </CartProvider>
  )
}
