import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function ConfirmadoPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const isError = sp.error === '1'

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-zinc-950 text-zinc-100 px-4 py-12 overflow-hidden">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/12 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-zinc-800/30 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mb-8 flex flex-col items-center">
        <Link href="/">
          <Image src="/images/logo.png" alt="Finos Barbers" width={120} height={44} className="invert" />
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md p-8 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 shadow-2xl text-center">
        {isError ? (
          <>
            <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg className="h-7 w-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="font-display uppercase text-3xl font-bold tracking-wide text-white">No pudimos confirmar tu cuenta</h1>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              El enlace puede haber vencido o ya haber sido usado. Probá iniciar sesión:
              si tu cuenta ya estaba confirmada, vas a poder entrar normalmente.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-3.5 text-sm font-bold text-zinc-950 transition-all shadow-lg shadow-amber-500/20"
            >
              Ir a iniciar sesión
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <svg className="h-7 w-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="font-display uppercase text-3xl font-bold tracking-wide text-white">¡Cuenta confirmada!</h1>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              Tu email quedó verificado. Ya podés iniciar sesión y reservar tu turno.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-3.5 text-sm font-bold text-zinc-950 transition-all shadow-lg shadow-amber-500/20"
            >
              Ir a mi cuenta
            </Link>
            <Link
              href="/login"
              className="mt-3 inline-block text-sm font-bold text-zinc-400 hover:text-white transition-colors"
            >
              Iniciar sesión
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
