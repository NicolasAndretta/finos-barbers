'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocal } from '@/components/local/LocalProvider'
import { rutaLocal } from '@/lib/local-datos'
import { conMayuscula } from '@/lib/rubros'

// Suscripción vacía: "estar en el navegador" no cambia nunca, no hay nada que escuchar.
const sinSuscripcion = () => () => {}

/**
 * Qué secciones ve cada uno (son las reglas de la Fase 2):
 *  - Turnos y Calendario: quien opera lo privado del local (el dueño, el admin
 *    de la plataforma, y la comercial solo en las demos).
 *  - Cobros y Finanzas: solo quien administra el local (la caja).
 *  - El catálogo: todos los que entran al panel.
 * Ocultar no es lo que protege (eso lo hace la base): es para no mostrar
 * botones que después dirían "no tenés permiso".
 */
export function AdminNav({ permisos }: { permisos: { administra: boolean; operaPrivado: boolean } }) {
  const pathname = usePathname()
  const local = useLocal()
  const ruta = (r: string) => rutaLocal(local.slug, r)
  const LINKS = [
    { href: ruta('/admin/dashboard'), label: 'Inicio', ver: true },
    { href: ruta('/admin/servicios'), label: 'Servicios', ver: true },
    { href: ruta('/admin/turnos'), label: 'Turnos', ver: permisos.operaPrivado },
    { href: ruta('/admin/calendario'), label: 'Calendario', ver: permisos.operaPrivado },
    { href: ruta('/admin/productos'), label: 'Productos', ver: true },
    { href: ruta('/admin/categorias'), label: 'Categorías', ver: true },
    { href: ruta('/admin/barberos'), label: conMayuscula(local.palabras.profesionales), ver: true },
    { href: ruta('/admin/resenas'), label: 'Reseñas', ver: true },
    { href: ruta('/admin/pagos'), label: 'Cobros', ver: permisos.administra },
    { href: ruta('/admin/finanzas'), label: 'Finanzas', ver: permisos.administra },
  ].filter((l) => l.ver)
  const [open, setOpen] = useState(false)
  // true solo en el navegador (en el servidor y durante la hidratación da false):
  // el drawer se porta a document.body recién cuando existe document.
  const mounted = useSyncExternalStore(sinSuscripcion, () => true, () => false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  // Desktop: nav en línea (con wrap por si hay muchos ítems en pantallas medianas).
  const desktopNav = (
    <nav className="hidden md:flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-zinc-400">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`transition-colors ${isActive(l.href) ? 'text-amber-400' : 'hover:text-white'}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )

  // Mobile: botón que abre un drawer con todos los links (portal al body).
  const drawer = (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />
      <div
        className={`fixed top-0 right-0 h-full w-72 max-w-[85%] z-[70] bg-zinc-950 border-l border-white/10 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/5">
          <span className="text-xs uppercase tracking-[0.3em] text-amber-400/70 font-bold">Panel</span>
          <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="p-1.5 -mr-1.5 text-zinc-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col px-3 py-4 gap-1 overflow-y-auto">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`px-3 py-3 rounded-lg text-base font-medium transition-colors ${isActive(l.href) ? 'bg-amber-400/10 text-amber-400' : 'text-zinc-200 hover:bg-white/5 hover:text-white'}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  )

  return (
    <>
      {desktopNav}

      {/* Botón mobile */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center gap-2 text-sm font-semibold text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        Menú
      </button>

      {mounted && createPortal(drawer, document.body)}
    </>
  )
}
