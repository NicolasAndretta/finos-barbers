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

export function AuthForm({ type, action }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, {})

  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 shadow-2xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          {type === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {type === 'login'
            ? 'Ingresa a tu panel de reservas'
            : 'Regístrate para reservar tu turno'}
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        {state.error && (
          <div className="p-4 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-sm flex items-center gap-2">
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{state.error}</span>
          </div>
        )}

        {type === 'register' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="nombre" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nombre</label>
              <input id="nombre" name="nombre" type="text" required
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/10 transition-all"
                placeholder="Juan" />
            </div>
            <div className="space-y-1">
              <label htmlFor="apellido" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Apellido</label>
              <input id="apellido" name="apellido" type="text" required
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/10 transition-all"
                placeholder="Pérez" />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required
            className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/10 transition-all"
            placeholder="juan@ejemplo.com" />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required
            className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/10 transition-all"
            placeholder="••••••••" />
          {type === 'login' && (
            <div className="text-right pt-1">
              <Link href="/recuperar" className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          )}
        </div>

        <button type="submit" disabled={isPending}
          className="w-full flex items-center justify-center rounded-xl bg-white hover:bg-zinc-200 px-4 py-3 text-sm font-black text-zinc-950 transition-all disabled:opacity-50 shadow-lg hover:scale-[1.02] active:scale-[0.98]">
          {isPending ? (
            <span className="flex items-center gap-2">
              <Spinner className="h-4 w-4 text-zinc-950" />
              <span>Cargando...</span>
            </span>
          ) : (
            <span>{type === 'login' ? 'Entrar' : 'Registrarme'}</span>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-zinc-400">
          {type === 'login' ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
        </span>
        <Link href={type === 'login' ? '/register' : '/login'} className="font-bold text-white hover:text-zinc-300 transition-colors">
          {type === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
        </Link>
      </div>
    </div>
  )
}