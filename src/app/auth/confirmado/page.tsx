import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function ConfirmadoPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const isError = sp.error === '1'

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-zinc-950 font-sans text-zinc-100 px-4 py-12 overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-white/5 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-zinc-800/20 to-transparent rounded-full blur-[120px] pointer-events-none" />

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
            <h1 className="text-2xl font-extrabold text-white">No pudimos confirmar tu cuenta</h1>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              El enlace puede haber vencido o ya haber sido usado. Probá iniciar sesión:
              si tu cuenta ya estaba confirmada, vas a poder entrar normalmente.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white hover:bg-zinc-200 px-4 py-3 text-sm font-black text-zinc-950 transition-all"
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
            <h1 className="text-2xl font-extrabold text-white">¡Cuenta confirmada!</h1>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              Tu email quedó verificado. Ya podés iniciar sesión y reservar tu turno.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white hover:bg-zinc-200 px-4 py-3 text-sm font-black text-zinc-950 transition-all"
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
