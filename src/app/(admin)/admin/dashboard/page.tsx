import React from 'react'
import Link from 'next/link'
import { getProfile } from '@/lib/auth'
import { adminGetStats } from '@/app/actions/admin'

export default async function AdminDashboardPage() {
  const profile = await getProfile()
  if (!profile) return null

  const stats = await adminGetStats()

  return (
    <div className="flex flex-col gap-8 w-full">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
          Panel de Control, <span className="text-zinc-300">{profile.nombre}</span>
        </h1>
        <p className="text-zinc-400 mt-2 text-sm">Administrá la agenda, los servicios y las reservas.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {[
          { label: 'Turnos Hoy', value: stats.turnosHoy, sub: 'Agendados para hoy' },
          { label: 'Servicios Activos', value: stats.serviciosActivos, sub: 'Disponibles para reserva' },
          { label: 'Total Clientes', value: stats.totalClientes, sub: 'Registrados en el sistema' },
        ].map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <p className="text-sm font-semibold text-zinc-500">{stat.label}</p>
            <p className="text-4xl font-black text-white mt-2">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-2">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Link href="/admin/servicios" className="group relative bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-6 transition-all shadow-xl">
          <div className="absolute top-4 right-4 text-zinc-700 group-hover:text-white transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Administrar Servicios</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[80%]">Creá, modificá o inhabilitá servicios del catálogo.</p>
          <div className="mt-6 flex items-center text-xs font-bold text-zinc-300 gap-1">
            <span>Ir a Servicios</span>
            <svg className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <Link href="/admin/turnos" className="group relative bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-6 transition-all shadow-xl">
          <div className="absolute top-4 right-4 text-zinc-700 group-hover:text-white transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Agenda de Turnos</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[80%]">Visualizá y administrá todos los turnos agendados.</p>
          <div className="mt-6 flex items-center text-xs font-bold text-zinc-300 gap-1">
            <span>Ver Agenda</span>
            <svg className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">Perfil Administrador</h2>
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-zinc-500 font-medium">Nombre</dt>
            <dd className="text-zinc-200 mt-0.5 font-semibold">{profile.nombre} {profile.apellido}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 font-medium">Email</dt>
            <dd className="text-zinc-200 mt-0.5 font-semibold">{profile.email}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}