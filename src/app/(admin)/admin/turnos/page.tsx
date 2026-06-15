'use client'

import React, { useState, useTransition, useCallback, useEffect } from 'react'
import { adminGetTurnos, adminConfirmarTurno, adminCancelarTurno } from '@/app/actions/admin'
import { AdminNuevoTurnoModal } from '@/components/admin/AdminNuevoTurnoModal'
import { Spinner } from '@/components/ui/Spinner'

type Turno = {
  id: string
  fecha: string
  hora: string
  estado: string
  profiles: { nombre: string; apellido: string; email: string } | null
  barberos: { nombre: string; apellido: string } | null
  servicios: { nombre: string; duracion_minutos: number; precio: number } | null
}

export default function AdminTurnosPage() {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroFecha, setFiltroFecha] = useState('todos')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadTurnos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminGetTurnos({
        estado: filtroEstado,
        fechaFiltro: filtroFecha as 'hoy' | 'semana' | 'todos',
      })
      setTurnos(data as Turno[])
    } catch (error) {
      console.error('Error loading turnos:', error)
    } finally {
      setLoading(false)
    }
  }, [filtroEstado, filtroFecha])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadTurnos()
  }, [loadTurnos])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSuccess = () => {
    loadTurnos()
    setSuccessMsg('Turno creado y confirmado exitosamente.')
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const handleConfirmar = (turnoId: string) => {
    startTransition(async () => {
      const res = await adminConfirmarTurno(turnoId)
      if (res.error) {
        alert(res.error)
      } else {
        await loadTurnos()
      }
    })
  }

  const handleCancelar = (turnoId: string) => {
    if (confirm('¿Estás seguro de que deseas cancelar este turno?')) {
      startTransition(async () => {
        const res = await adminCancelarTurno(turnoId)
        if (res.error) {
          alert(res.error)
        } else {
          await loadTurnos()
        }
      })
    }
  }

  const statusColors: Record<string, string> = {
    pendiente: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    confirmado: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    cancelado: 'bg-red-500/10 text-red-500 border-red-500/20',
  }

  const formatFecha = (fecha: string) => {
    const [year, month, day] = fecha.split('-')
    return `${day}/${month}/${year}`
  }

  const formatHora = (hora: string) => hora.slice(0, 5)

  return (
    <>
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Agenda de Turnos
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Gestiona todos los turnos de la barbería
            </p>
          </div>

          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="confirmado">Confirmados</option>
              <option value="cancelado">Cancelados</option>
            </select>

            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
            >
              <option value="todos">Todas las fechas</option>
              <option value="hoy">Hoy</option>
              <option value="semana">Esta semana</option>
            </select>

            <button
              onClick={() => setModalAbierto(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Reserva
            </button>
          </div>
        </div>

        {/* Notificación de éxito */}
        {successMsg && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-6 animate-[fade-in_0.2s_ease]">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-emerald-400 text-sm font-medium">{successMsg}</p>
          </div>
        )}

        {/* Lista de turnos */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-8 w-8 text-amber-400" />
          </div>
        ) : turnos.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 text-center">
            <p className="text-zinc-400">No hay turnos para mostrar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {turnos.map((turno) => (
              <div
                key={turno.id}
                className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 shadow-lg flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white">
                      {turno.servicios?.nombre || 'Servicio'}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                        statusColors[turno.estado] || 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {turno.estado}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-zinc-500">Cliente:</span>{' '}
                      <span className="text-zinc-300 font-medium">
                        {turno.profiles?.nombre} {turno.profiles?.apellido}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Barbero:</span>{' '}
                      <span className="text-zinc-300 font-medium">
                        {turno.barberos?.nombre} {turno.barberos?.apellido}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Fecha:</span>{' '}
                      <span className="text-zinc-300 font-medium">{formatFecha(turno.fecha)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Hora:</span>{' '}
                      <span className="text-zinc-300 font-medium">{formatHora(turno.hora)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full lg:w-auto">
                  <p className="font-bold text-amber-400 text-lg">${turno.servicios?.precio}</p>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {turno.estado === 'pendiente' && (
                      <button
                        onClick={() => handleConfirmar(turno.id)}
                        disabled={isPending}
                        className="flex-1 sm:flex-none text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isPending && <Spinner className="w-3 h-3 text-emerald-400" />}
                        Confirmar
                      </button>
                    )}

                    {(turno.estado === 'pendiente' || turno.estado === 'confirmado') && (
                      <button
                        onClick={() => handleCancelar(turno.id)}
                        disabled={isPending}
                        className="flex-1 sm:flex-none text-xs font-bold text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isPending && <Spinner className="w-3 h-3 text-red-400" />}
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de nueva reserva */}
      {modalAbierto && (
        <AdminNuevoTurnoModal
          onClose={() => setModalAbierto(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
