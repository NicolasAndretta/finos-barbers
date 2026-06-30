'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'

type NavLink = { href: string; label: string }

const NAV: NavLink[] = [
  { href: '#servicios', label: 'Servicios' },
  { href: '/tienda', label: 'Tienda' },
  { href: '#barberos', label: 'Barberos' },
  { href: '#ubicacion', label: 'Ubicación' },
]

export function MobileMenu({
  panelLink,
  panelLabel,
}: {
  panelLink: string | null
  panelLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Solo portamos al body tras montar (evita desajustes con SSR).
  useEffect(() => setMounted(true), [])

  // Bloquea el scroll del body mientras el menú está abierto.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // El overlay y el panel se renderizan en un portal a document.body para que
  // `position: fixed` se ancle al viewport y no al header (que usa backdrop-blur
  // y crea un containing block que rompería el fixed).
  const overlay = (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      <div
        className={`fixed top-0 right-0 h-full w-72 max-w-[85%] z-[70] bg-zinc-950 border-l border-white/10 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/5">
          <span className="text-xs uppercase tracking-[0.3em] text-amber-400/70 font-bold">Menú</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="p-1.5 -mr-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col px-3 py-4 gap-1">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="px-3 py-3 rounded-lg text-base font-medium text-zinc-200 hover:bg-white/5 hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto px-4 py-5 border-t border-white/5 flex flex-col gap-3">
          {panelLink ? (
            <Link
              href={panelLink}
              onClick={() => setOpen(false)}
              className="w-full text-center bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-bold px-4 py-3 rounded-lg transition-colors"
            >
              {panelLabel}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="w-full text-center text-sm font-semibold text-zinc-300 hover:text-white border border-white/15 hover:bg-white/5 px-4 py-3 rounded-lg transition-colors"
              >
                Ingresar
              </Link>
              <Link
                href="/reservar"
                onClick={() => setOpen(false)}
                className="w-full text-center bg-amber-400 hover:bg-amber-300 text-zinc-950 text-sm font-bold px-4 py-3 rounded-lg transition-colors"
              >
                Reservar turno
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  )

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="p-2 -mr-2 text-zinc-300 hover:text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {mounted && createPortal(overlay, document.body)}
    </div>
  )
}
