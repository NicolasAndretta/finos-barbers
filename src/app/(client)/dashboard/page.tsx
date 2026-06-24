import React from 'react'
import Link from 'next/link'
import { requireClient } from '@/lib/auth'

export default async function ClientDashboardPage() {
  const profile = await requireClient()

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in">
      {/* Hero de bienvenida */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-8">
        <div className="absolute -top-16 -right-10 w-64 h-64 bg-amber-500/10 blur-[90px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">Bienvenido</span>
          <h1 className="font-display uppercase text-4xl sm:text-5xl font-extrabold tracking-tight text-white mt-1">
            {profile.nombre}
          </h1>
          <p className="text-zinc-400 mt-3 text-sm leading-relaxed max-w-md">
            Desde acá gestionás tus reservas en Finos Barbers. Reservá un turno o revisá tus citas.
          </p>
        </div>
      </div>

      {/* Acciones */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Link href="/reservar" className="group relative bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-7 transition-all duration-300 overflow-hidden">
          <div className="absolute top-6 right-6 text-zinc-700 group-hover:text-amber-500 transition-colors">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="font-display uppercase text-2xl font-bold text-white tracking-wide mb-2">Reservar Turno</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[85%]">Elegí el servicio, el barbero y la hora para tu próxima visita.</p>
          <div className="mt-6 flex items-center text-sm font-bold text-amber-500 gap-2">
            <span>Comenzar reserva</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <Link href="/turnos" className="group relative bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-7 transition-all duration-300 overflow-hidden">
          <div className="absolute top-6 right-6 text-zinc-700 group-hover:text-amber-500 transition-colors">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="font-display uppercase text-2xl font-bold text-white tracking-wide mb-2">Mis Turnos</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[85%]">Revisá tus turnos agendados, pendientes o cancelados.</p>
          <div className="mt-6 flex items-center text-sm font-bold text-amber-500 gap-2">
            <span>Ver mis turnos</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Info de cuenta */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-7">
        <h2 className="font-display uppercase text-xl font-bold text-white tracking-wide mb-6">Información de la cuenta</h2>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-5 text-sm">
          {[
            { dt: 'Nombre completo', dd: `${profile.nombre} ${profile.apellido}` },
            { dt: 'Email', dd: profile.email },
            { dt: 'Rol', dd: profile.role, cap: true },
            { dt: 'Miembro desde', dd: new Date(profile.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' }) },
          ].map((f) => (
            <div key={f.dt}>
              <dt className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">{f.dt}</dt>
              <dd className={`text-zinc-100 mt-1 font-semibold ${f.cap ? 'capitalize' : ''}`}>{f.dd}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
