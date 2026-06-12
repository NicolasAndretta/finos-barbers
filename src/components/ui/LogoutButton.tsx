'use client'

import React from 'react'
import { useFormStatus } from 'react-dom'
import { logoutAction } from '@/app/actions/auth'
import { Spinner } from './Spinner'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all disabled:opacity-50">
      {pending ? (
        <>
          <Spinner className="h-4 w-4 text-zinc-400" />
          <span>Cerrando...</span>
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Cerrar Sesión</span>
        </>
      )}
    </button>
  )
}

export function LogoutButton() {
  return (
    <form action={logoutAction} className="w-full">
      <SubmitButton />
    </form>
  )
}