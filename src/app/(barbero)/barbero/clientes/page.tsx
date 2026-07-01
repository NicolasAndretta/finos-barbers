import React from 'react'
import { getClientesLista } from '@/app/actions/barbero-panel'

export const dynamic = 'force-dynamic'

export default async function BarberoClientesPage() {
  const clientes = await getClientesLista()

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Clientes</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Los clientes registrados. Solo lectura.
        </p>
      </div>

      {clientes.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-10 text-center">
          <p className="text-zinc-400">Todavía no hay clientes registrados.</p>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl divide-y divide-zinc-900">
          {clientes.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-4">
              <div className="shrink-0 h-10 w-10 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center font-bold text-amber-400 uppercase">
                {(c.nombre?.[0] ?? '?')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{c.nombre} {c.apellido}</p>
                <p className="text-zinc-500 text-sm truncate">{c.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
