'use client'

/**
 * El local de la página, disponible para los componentes del navegador.
 *
 * El layout de `app/[local]` lee el local de la base y lo pone acá. Así un
 * componente (el formulario de reserva, el botón de WhatsApp, el logo) sabe de
 * qué local es sin volver a preguntarlo. Solo viajan datos públicos.
 */

import { createContext, useContext } from 'react'
import type { LocalPublico } from '@/lib/local-datos'

const LocalContext = createContext<LocalPublico | null>(null)

export function LocalProvider({ local, children }: { local: LocalPublico; children: React.ReactNode }) {
  return <LocalContext.Provider value={local}>{children}</LocalContext.Provider>
}

/** El local de la página. Falla si se usa fuera de `app/[local]`. */
export function useLocal(): LocalPublico {
  const local = useContext(LocalContext)
  if (!local) throw new Error('useLocal: este componente tiene que estar dentro de una página de local')
  return local
}

/** El local de la página, o null si no hay (por ejemplo, en el login). */
export function useLocalOpcional(): LocalPublico | null {
  return useContext(LocalContext)
}
