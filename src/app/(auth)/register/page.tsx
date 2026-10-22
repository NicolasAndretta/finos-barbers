import React from 'react'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/ui/AuthForm'
import { MarcaAcceso } from '@/components/ui/MarcaAcceso'
import { createClient } from '@/lib/supabase'
import { destinoDespuesDeEntrar, esVueltaSegura } from '@/lib/auth'
import { esSlug } from '@/lib/local-datos'
import { registerAction } from './actions'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const volver = esVueltaSegura(params.next) ? params.next : null
  const local = typeof params.local === 'string' && esSlug(params.local) ? params.local : null

  // Con la sesión ya iniciada, crear otra cuenta no tiene sentido.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(volver ?? await destinoDespuesDeEntrar(supabase, user.id, local))

  return (
    <div className="flex flex-col items-center w-full">
      <div className="mb-8">
        <MarcaAcceso slug={local} />
      </div>
      <AuthForm type="register" action={registerAction} volver={volver} local={local} />
    </div>
  )
}
