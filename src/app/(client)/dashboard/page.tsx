import React from 'react'
import Link from 'next/link'
import { requireClient } from '@/lib/auth'

export default async function ClientDashboardPage() {
  const profile = await requireClient()

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Bienvenido, <span className="text-zinc-300">{profile.nombre}</span>!
        </h1>
        <p className="text-zinc-400 mt-3 text-base leading-relaxed">
          Desde aquí podés gestionar tus reservas en Finos Barbers.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Link href="/reservar" className="group relative bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-8 transition-all shadow-xl">
          <div className="absolute top-6 right-6 text-zinc-700 group-hover:text-white transition-colors">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Reservar Turno</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[85%]">Elegí el servicio, el barbero y la hora para tu próxima visita.</p>
          <div className="mt-6 flex items-center text-sm font-bold text-zinc-300 gap-2">
            <span>Comenzar reserva</span>
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <Link href="/turnos" className="group relative bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-8 transition-all shadow-xl">
          <div className="absolute top-6 right-6 text-zinc-700 group-hover:text-white transition-colors">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Mis Turnos</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[85%]">Revisá tus turnos agendados, pendientes o cancelados.</p>
          <div className="mt-6 flex items-center text-sm font-bold text-zinc-300 gap-2">
            <span>Ver mis turnos</span>
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-6">Información de la Cuenta</h2>
        <dl className="grid sm:grid-cols-2 gap-6 text-sm">
          <div>
            <dt className="text-zinc-500 font-medium">Nombre Completo</dt>
            <dd className="text-zinc-200 mt-1 font-semibold">{profile.nombre} {profile.apellido}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 font-medium">Email</dt>
            <dd className="text-zinc-200 mt-1 font-semibold">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 font-medium">Rol</dt>
            <dd className="text-zinc-200 mt-1 font-semibold capitalize">{profile.role}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 font-medium">Miembro Desde</dt>
            <dd className="text-zinc-200 mt-1 font-semibold">
              {new Date(profile.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
