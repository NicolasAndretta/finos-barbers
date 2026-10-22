import React from 'react'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/ui/AuthForm'
import { MarcaAcceso } from '@/components/ui/MarcaAcceso'
import { createClient } from '@/lib/supabase'
import { destinoDespuesDeEntrar, esVueltaSegura } from '@/lib/auth'
import { esSlug } from '@/lib/local-datos'
import { loginAction } from './actions'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams
  const confirmar = resolvedSearchParams.confirmar === '1'
  const reset = resolvedSearchParams.reset === '1'
  // A dónde volver y desde qué local llegó (solo si tienen forma válida).
  const volverRaw = resolvedSearchParams.next
  const volver = esVueltaSegura(volverRaw) ? volverRaw : null
  const localRaw = resolvedSearchParams.local
  const local = typeof localRaw === 'string' && esSlug(localRaw) ? localRaw : null

  // Si ya tiene la sesión iniciada, no tiene sentido mostrarle el login:
  // va directo a donde iba (antes lo hacía el proxy).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(volver ?? await destinoDespuesDeEntrar(supabase, user.id, local))

  return (
    <div className="flex flex-col items-center w-full">
      <div className="mb-8">
        <MarcaAcceso slug={local} />
      </div>
      {reset && (
        <div className="mb-6 w-full max-w-md p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-400 text-sm flex items-start gap-2">
          <svg className="h-5 w-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Tu contraseña se actualizó. <strong className="font-semibold text-emerald-300">Iniciá sesión con la nueva.</strong></span>
        </div>
      )}
      {confirmar && (
        <div className="mb-6 w-full max-w-md p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-400 text-sm flex items-start gap-2">
          <svg className="h-5 w-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>Te enviamos un email de confirmación. <strong className="font-semibold text-emerald-300">Confirmalo antes de iniciar sesión.</strong> Revisá también la carpeta de spam.</span>
        </div>
      )}
      <AuthForm type="login" action={loginAction} volver={volver} local={local} />
    </div>
  )
}
