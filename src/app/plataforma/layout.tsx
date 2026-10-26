/**
 * src/app/plataforma/layout.tsx — el panel de la plataforma (Fase 6).
 *
 * Solo el equipo (Nico, admin; Delfina, comercial): sin sesión, al login; con
 * sesión pero sin ser del equipo, al inicio. Lo que frena de verdad son las
 * funciones de la base (migración 0014), que lo revisan otra vez.
 *
 * Vive fuera de app/[local]: no es de ningún local, es de la plataforma. Por
 * eso el logo dibuja el nombre del producto.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireEquipo } from '@/lib/plataforma'
import { Logo } from '@/components/ui/Logo'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { PRODUCTO } from '@/lib/producto'

export const metadata: Metadata = {
  title: `Plataforma | ${PRODUCTO.nombre}`,
  robots: { index: false, follow: false },
}

export default async function PlataformaLayout({ children }: { children: React.ReactNode }) {
  const { rol, profile } = await requireEquipo()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
        <Link href="/plataforma" className="flex items-center gap-3 focus:outline-none min-w-0">
          <Logo size={30} />
          <span className="text-[9px] uppercase tracking-[0.3em] text-amber-400/70 font-bold hidden sm:block">
            Plata
            <br />
            forma
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden md:block">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white border border-white/20">
              <span className="w-1 h-1 rounded-full bg-white" />
              {rol === 'admin' ? 'Admin de la plataforma' : 'Equipo comercial'}
            </span>
            <p className="text-sm font-bold text-white mt-1">{profile.nombre} {profile.apellido}</p>
          </div>
          <div className="w-32 sm:w-36">
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-8">
        {children}
      </main>
    </div>
  )
}
