import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requirePanelBarbero } from '@/lib/auth'
import { getLocal } from '@/lib/local'
import { rutaLocal } from '@/lib/local-datos'
import { conMayuscula } from '@/lib/rubros'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { Logo } from '@/components/ui/Logo'

// La agenda del barbero en un local: entra quien es barbero de ESE local
// (y quien lo administra, para revisarla).
export default async function BarberoLayout({ children, params }: { children: React.ReactNode; params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  if (!local) notFound()
  const { profile } = await requirePanelBarbero(local)
  const ruta = (r: string) => rutaLocal(local.slug, r)
  const Profesional = conMayuscula(local.palabras.profesional)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <Link href={ruta('/barbero/calendario')} className="flex items-center gap-3 focus:outline-none">
            <Logo size={30} />
            <span className="text-[9px] uppercase tracking-[0.3em] text-amber-400/70 font-bold hidden sm:block">
              Panel
              <br />
              {Profesional}
            </span>
          </Link>
        </div>

        <nav className="flex items-center gap-6 text-sm font-semibold text-zinc-400">
          <Link href={ruta('/barbero/calendario')} className="hover:text-white transition-colors">Mi agenda</Link>
          <Link href={ruta('/barbero/clientes')} className="hover:text-white transition-colors">Clientes</Link>
        </nav>

        <div className="flex items-center gap-4 w-full sm:w-auto border-t border-zinc-900 sm:border-t-0 pt-4 sm:pt-0">
          <div className="text-right hidden md:block">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-400/10 text-amber-300 border border-amber-400/20">
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              {Profesional}
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
