import React from 'react'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { LogoutButton } from '@/components/ui/LogoutButton'

const navLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/servicios', label: 'Servicios' },
  { href: '/admin/turnos', label: 'Turnos' },
  { href: '/admin/calendario', label: 'Calendario' },
  { href: '/admin/productos', label: 'Productos' },
  { href: '/admin/finanzas', label: 'Finanzas' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800/60 bg-zinc-950/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="h-16 flex items-center justify-between gap-4">
            <Link href="/admin/dashboard" className="flex flex-col leading-none focus:outline-none">
              <span className="font-display text-2xl font-extrabold tracking-[0.2em] text-white">
                FIN<span className="text-amber-500">O</span>S
              </span>
              <span className="text-[9px] uppercase tracking-[0.3em] text-amber-500/80 font-bold">Panel Admin</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-zinc-400">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-amber-400 transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                  Administrador
                </span>
                <p className="text-xs font-bold text-white mt-1">{profile.nombre} {profile.apellido}</p>
              </div>
              <div className="w-32 hidden sm:block">
                <LogoutButton />
              </div>
            </div>
          </div>

          {/* Nav mobile/tablet — scroll horizontal */}
          <nav className="lg:hidden flex items-center gap-1 -mx-5 px-5 pb-2 overflow-x-auto scrollbar-hide">
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

      <main className="flex-1 flex flex-col relative">
        <div className="relative z-10 p-5 sm:p-8 md:p-10 w-full max-w-7xl mx-auto flex flex-col gap-8">
          {children}
        </div>
      </main>
    </div>
  )
}
