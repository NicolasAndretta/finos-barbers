'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'

export function PwaInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // No mostrar si ya está instalada como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // No mostrar si el usuario ya la descartó
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      // Pequeño delay para que no aparezca al instante de cargar
      setTimeout(() => setVisible(true), 2500)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Registrar el service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // El SW falla silenciosamente si no está en HTTPS (dev local)
      })
    }
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
    setPrompt(null)
  }

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-[slide-up_0.35s_cubic-bezier(0.16,1,0.3,1)]">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Franja superior con el color de marca */}
        <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-400" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Ícono */}
            <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
              <span className="text-amber-400 font-black text-lg leading-none tracking-tighter">FB</span>
            </div>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">
                Instalar Finos Barbers
              </p>
              <p className="text-zinc-400 text-xs mt-0.5 leading-snug">
                Añadí la app a tu pantalla de inicio para acceder más rápido.
              </p>
            </div>

            {/* Cerrar */}
            <button
              onClick={handleDismiss}
              className="text-zinc-600 hover:text-zinc-400 transition-colors p-0.5 shrink-0 cursor-pointer"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Botones */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Ahora no
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Instalar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
