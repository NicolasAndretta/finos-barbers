'use client'

import React, { useActionState } from 'react'
import Link from 'next/link'
import { Spinner } from './Spinner'

export type AuthFormState = {
  error?: string
  success?: boolean
}

type AuthFormProps = {
  type: 'login' | 'register'
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>
}

const inputClass =
  'w-full rounded-xl bg-zinc-800/70 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 transition-all'

const labelClass =
  'block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5'

export function AuthForm({ type, action }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, {})

  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 shadow-2xl shadow-black/40">
      <div className="text-center mb-8">
        <h2 className="font-display uppercase text-4xl font-bold tracking-wide text-white">
          {type === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {type === 'login'
            ? 'Ingresá a tu panel de reservas'
            : 'Registrate para reservar tu turno'}
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        {state.error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm flex items-center gap-2.5 animate-fade-in-fast">
            <svg className="h-5 w-5 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{state.error}</span>
          </div>
        )}

        {type === 'register' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre" className={labelClass}>Nombre</label>
              <input id="nombre" name="nombre" type="text" required className={inputClass} placeholder="Juan" />
            </div>
            <div>
              <label htmlFor="apellido" className={labelClass}>Apellido</label>
              <input id="apellido" name="apellido" type="text" required className={inputClass} placeholder="Pérez" />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} placeholder="juan@ejemplo.com" />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>Contraseña</label>
          <input id="password" name="password" type="password" autoComplete={type === 'login' ? 'current-password' : 'new-password'} required className={inputClass} placeholder="••••••••" />
        </div>

        <button type="submit" disabled={isPending}
          className="w-full flex items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-3.5 text-sm font-bold text-zinc-950 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]">
          {isPending ? (
            <span className="flex items-center gap-2">
              <Spinner className="h-4 w-4 text-zinc-950" />
              <span>Cargando...</span>
            </span>
          ) : (
            <span>{type === 'login' ? 'Entrar' : 'Crear mi cuenta'}</span>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-zinc-400">
          {type === 'login' ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
        </span>
        <Link href={type === 'login' ? '/register' : '/login'} className="font-bold text-amber-400 hover:text-amber-300 transition-colors">
          {type === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
        </Link>
      </div>
    </div>
  )
}
