import React from 'react'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { CartProvider } from '@/lib/cart-context'
import { CartButton } from '@/components/tienda/CartButton'
import { CartDrawer } from '@/components/tienda/CartDrawer'
import { WhatsAppFab } from '@/components/ui/WhatsAppFab'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/reservar', label: 'Reservar' },
  { href: '/turnos', label: 'Mis Turnos' },
  { href: '/tienda', label: 'Tienda' },
]

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <CartProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <header className="border-b border-zinc-800/60 bg-zinc-950/85 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-5 sm:px-6">
            {/* Fila principal */}
            <div className="h-16 flex items-center justify-between gap-4">
              <Link href="/dashboard" className="flex flex-col leading-none focus:outline-none">
                <span className="font-display text-2xl font-extrabold tracking-[0.2em] text-white">
                  FIN<span className="text-amber-500">O</span>S
                </span>
                <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-500">Panel Cliente</span>
              </Link>

              <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-zinc-400">
                {navLinks.map((l) => (
                  <Link key={l.href} href={l.href} className="hover:text-amber-400 transition-colors">
                    {l.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-3">
                <div className="text-right hidden lg:block">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">Cliente</p>
                  <p className="text-xs font-bold text-white truncate max-w-[160px]">{user.email}</p>
                </div>
                <CartButton />
                <div className="w-32 hidden sm:block">
                  <LogoutButton />
                </div>
              </div>
            </div>

            {/* Nav mobile — scroll horizontal */}
            <nav className="md:hidden flex items-center gap-1 -mx-5 px-5 pb-2 overflow-x-auto scrollbar-hide">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 hover:text-amber-400 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <div className="shrink-0 sm:hidden ml-1 w-28">
                <LogoutButton />
              </div>
            </nav>
          </div>
        </header>

        <main className="flex-1 flex flex-col relative overflow-x-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/[0.06] blur-[120px] pointer-events-none" />
          <div className="relative z-10 p-5 sm:p-8 md:p-10 w-full max-w-5xl mx-auto flex flex-col gap-8">
            {children}
          </div>
        </main>

        <CartDrawer />
        <WhatsAppFab />
      </div>
    </CartProvider>
  )
}
