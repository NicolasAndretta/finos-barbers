import React from 'react'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { CartProvider } from '@/lib/cart-context'
import { CartButton } from '@/components/tienda/CartButton'
import { CartDrawer } from '@/components/tienda/CartDrawer'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <CartProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
        <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <Link href="/dashboard" className="flex flex-col focus:outline-none">
              <span className="text-xl font-black tracking-widest text-white">FINOS</span>
              <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-500">Panel Cliente</span>
            </Link>
          </div>

          <nav className="flex items-center gap-6 text-sm font-semibold text-zinc-400">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/reservar" className="hover:text-white transition-colors">Reservar Turno</Link>
            <Link href="/turnos" className="hover:text-white transition-colors">Mis Turnos</Link>
            <Link href="/tienda" className="hover:text-white transition-colors">Tienda</Link>
          </nav>

          <div className="flex items-center gap-4 w-full sm:w-auto border-t border-zinc-900 sm:border-t-0 pt-4 sm:pt-0">
            <div className="text-right hidden md:block">
              <p className="text-xs text-zinc-500">Cliente</p>
              <p className="text-sm font-bold text-white">{user.email}</p>
            </div>
            <CartButton />
            <div className="w-full sm:w-36">
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col relative overflow-x-hidden">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-white/3 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 p-6 md:p-10 w-full max-w-5xl mx-auto flex flex-col gap-8">
            {children}
          </div>
        </main>

        <CartDrawer />
      </div>
    </CartProvider>
  )
}