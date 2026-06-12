import React from 'react'
import { AuthForm } from '@/components/ui/AuthForm'
import { loginAction } from './actions'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams
  const registered = resolvedSearchParams.registered === '1'

  return (
    <div className="flex flex-col items-center w-full">
      {registered && (
        <div className="mb-6 w-full max-w-md p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-400 text-sm flex items-center gap-2">
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Cuenta creada con exito! Por favor, inicia sesion.</span>
        </div>
      )}
      <AuthForm type="login" action={loginAction} />
    </div>
  )
}
