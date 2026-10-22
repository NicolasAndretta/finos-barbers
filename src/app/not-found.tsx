/**
 * src/app/not-found.tsx — "esta dirección no existe".
 * Se muestra, por ejemplo, para /un-local-que-no-existe.
 */

import Link from 'next/link'

export default function NoEncontrado() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">404</p>
      <h1 className="text-2xl font-bold text-white">No encontramos esta página</h1>
      <p className="text-zinc-400 max-w-sm">Revisá que la dirección esté bien escrita.</p>
      <Link href="/" className="text-sm text-zinc-500 hover:text-white underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  )
}
