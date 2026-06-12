import React from 'react'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { LogoutButton } from '@/components/ui/LogoutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <Link href="/admin/dashboard" className="flex flex-col focus:outline-none">
            <span className="text-xl font-black tracking-widest text-white">FINOS</span>
            <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Panel Admin</span>
          </Link>
        </div>

        <nav className="flex items-center gap-6 text-sm font-semibold text-zinc-400">
          <Link href="/admin/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/admin/servicios" className="hover:text-white transition-colors">Servicios</Link>
          <Link href="/admin/turnos" className="hover:text-white transition-colors">Turnos</Link>
        </nav>

        <div className="flex items-center gap-4 w-full sm:w-auto border-t border-zinc-900 sm:border-t-0 pt-4 sm:pt-0">
          <div className="text-right hidden md:block">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white border border-white/20">
              <span className="w-1 h-1 rounded-full bg-white" />
              Administrador
            </span>
            <p className="text-sm font-bold text-white mt-1">{profile.nombre} {profile.apellido}</p>
          </div>
          <div className="w-full sm:w-36">
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative">
        <div className="relative z-10 p-6 md:p-10 w-full max-w-5xl mx-auto flex flex-col gap-8">
          {children}
        </div>
      </main>
    </div>
  )
}