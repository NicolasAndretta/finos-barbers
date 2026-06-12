'use client'

import React, { useState, useTransition, useCallback, useEffect } from 'react'
import { adminGetServicios, adminCrearServicio, adminActualizarServicio, adminToggleServicio } from '@/app/actions/admin'
import { Spinner } from '@/components/ui/Spinner'

type Servicio = {
  id: string
  nombre: string
  descripcion: string
  precio: number
  duracion_minutos: number
  activo: boolean
}

type FormDataState = {
  nombre: string
  descripcion: string
  precio: string
  duracion_minutos: string
}

export default function AdminServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null)
  const [formData, setFormData] = useState<FormDataState>({
    nombre: '',
    descripcion: '',
    precio: '',
    duracion_minutos: '',
  })

  const resetForm = useCallback(() => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      duracion_minutos: '',
    })
    setEditingServicio(null)
  }, [])

  const loadServicios = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminGetServicios()
      setServicios(data as Servicio[])
    } catch (error) {
      console.error('Error loading servicios:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadServicios()
  }, [loadServicios])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    startTransition(async () => {
      const fd = new FormData()
      fd.append('nombre', formData.nombre)
      fd.append('descripcion', formData.descripcion)
      fd.append('precio', formData.precio)
      fd.append('duracion_minutos', formData.duracion_minutos)

      if (editingServicio) {
        fd.append('id', editingServicio.id)
        const res = await adminActualizarServicio(fd)
        if (res.error) {
          alert(res.error)
        } else {
          await loadServicios()
          setShowForm(false)
          setEditingServicio(null)
          resetForm()
        }
      } else {
        const res = await adminCrearServicio(fd)
        if (res.error) {
          alert(res.error)
        } else {
          await loadServicios()
          setShowForm(false)
          resetForm()
        }
      }
    })
  }

  const handleEdit = (servicio: Servicio) => {
    setEditingServicio(servicio)
    setFormData({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      precio: servicio.precio.toString(),
      duracion_minutos: servicio.duracion_minutos.toString(),
    })
    setShowForm(true)
  }

  const handleToggle = (servicioId: string) => {
    startTransition(async () => {
      const res = await adminToggleServicio(servicioId)
      if (res.error) {
        alert(res.error)
      } else {
        await loadServicios()
      }
    })
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingServicio(null)
    resetForm()
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Administración de Servicios
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gestiona los servicios de la barbería
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm(true)
            resetForm()
          }}
          className="bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          + Nuevo Servicio
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            {editingServicio ? 'Editar Servicio' : 'Nuevo Servicio'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                required
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                placeholder="Ej: Corte Clásico"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                required
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                placeholder="Describe el servicio..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Precio ($)
                </label>
                <input
                  type="number"
                  value={formData.precio}
                  onChange={(e) =>
                    setFormData({ ...formData, precio: e.target.value })
                  }
                  required
                  min="0"
                  step="0.01"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Duración (minutos)
                </label>
                <input
                  type="number"
                  value={formData.duracion_minutos}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duracion_minutos: e.target.value,
                    })
                  }
                  required
                  min="5"
                  step="5"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  placeholder="30"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-black text-sm font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending && <Spinner className="w-4 h-4 text-black" />}
                {editingServicio ? 'Actualizar' : 'Crear'}
              </button>

              <button
                type="button"
                onClick={handleCancelForm}
                className="flex-1 sm:flex-none bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8 text-amber-400" />
        </div>
      ) : servicios.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">No hay servicios para mostrar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servicios.map((servicio) => (
            <div
              key={servicio.id}
              className={`bg-zinc-950 border rounded-xl p-5 shadow-lg flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 ${servicio.activo ? 'border-zinc-900' : 'border-zinc-900/50 opacity-60'}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-lg font-bold text-white">
                    {servicio.nombre}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      servicio.activo
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                    }`}
                  >
                    {servicio.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <p className="text-sm text-zinc-400 mb-2">
                  {servicio.descripcion}
                </p>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500">Precio:</span>{' '}
                    <span className="text-amber-400 font-bold">
                      ${servicio.precio}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Duración:</span>{' '}
                    <span className="text-zinc-300 font-medium">
                      {servicio.duracion_minutos} min
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <button
                  onClick={() => handleEdit(servicio)}
                  disabled={isPending}
                  className="flex-1 sm:flex-none text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  Editar
                </button>

                <button
                  onClick={() => handleToggle(servicio.id)}
                  disabled={isPending}
                  className={`flex-1 sm:flex-none text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    servicio.activo
                      ? 'text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20'
                      : 'text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20'
                  }`}
                >
                  {isPending && <Spinner className="w-3 h-3" />}
                  {servicio.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}