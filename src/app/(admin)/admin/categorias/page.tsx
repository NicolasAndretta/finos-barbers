'use client'

import React, { useState, useTransition, useCallback, useEffect } from 'react'
import {
  adminGetCategorias, adminCrearCategoria, adminActualizarCategoria,
  adminToggleCategoria, adminEliminarCategoria, type TipoCategoria,
} from '@/app/actions/categorias'
import { Spinner } from '@/components/ui/Spinner'

type Categoria = {
  id: string
  nombre: string
  slug: string
  tipo: TipoCategoria
  parent_id: string | null
  orden: number
  activo: boolean
}

type FormState = { id: string | null; nombre: string; tipo: TipoCategoria; parent_id: string; orden: string }
const FORM_EMPTY: FormState = { id: null, nombre: '', tipo: 'producto', parent_id: '', orden: '0' }

export default function AdminCategoriasPage() {
  const [cats, setCats]               = useState<Categoria[]>([])
  const [loading, setLoading]         = useState(true)
  const [isPending, startTransition]  = useTransition()
  const [form, setForm]               = useState<FormState>(FORM_EMPTY)
  const [showForm, setShowForm]       = useState(false)
  const [error, setError]             = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setCats((await adminGetCategorias()) as Categoria[]) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load() }, [load])
  /* eslint-enable react-hooks/set-state-in-effect */

  const reset = () => { setForm(FORM_EMPTY); setError('') }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const fd = new FormData()
      fd.append('nombre', form.nombre)
      fd.append('tipo', form.tipo)
      fd.append('parent_id', form.parent_id)
      fd.append('orden', form.orden)
      let res: { error?: string }
      if (form.id) { fd.append('id', form.id); res = await adminActualizarCategoria(fd) }
      else { res = await adminCrearCategoria(fd) }
      if (res.error) { setError(res.error); return }
      await load(); setShowForm(false); reset()
    })
  }

  const handleEdit = (c: Categoria) => {
    setForm({ id: c.id, nombre: c.nombre, tipo: c.tipo, parent_id: c.parent_id ?? '', orden: c.orden.toString() })
    setShowForm(true); setError('')
  }

  const handleToggle = (id: string) => startTransition(async () => {
    const r = await adminToggleCategoria(id); if (r.error) alert(r.error); else await load()
  })
  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta categoría? Los productos/servicios quedan sin categoría.')) return
    startTransition(async () => { const r = await adminEliminarCategoria(id); if (r.error) alert(r.error); else await load() })
  }

  const padres = cats.filter(c => c.tipo === form.tipo && !c.parent_id && c.id !== form.id)
  const porTipo = (t: TipoCategoria) => cats.filter(c => c.tipo === t)
  const nombrePadre = (id: string | null) => cats.find(c => c.id === id)?.nombre

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Categorías</h1>
          <p className="text-zinc-400 text-sm mt-1">Organizá productos y servicios. Las subcategorías cuelgan de una categoría madre.</p>
        </div>
        <button onClick={() => { reset(); setShowForm(true) }}
          className="bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer">
          + Nueva Categoría
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 mb-8 space-y-4">
          <h2 className="text-xl font-bold text-white">{form.id ? 'Editar' : 'Nueva'} categoría</h2>
          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre</label>
              <input type="text" required value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Pomadas / Cortes"
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Tipo</label>
              <select value={form.tipo} disabled={!!form.id}
                onChange={e => setForm({ ...form, tipo: e.target.value as TipoCategoria, parent_id: '' })}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60">
                <option value="producto">Productos</option>
                <option value="servicio">Servicios</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría madre (opcional)</label>
              <select value={form.parent_id}
                onChange={e => setForm({ ...form, parent_id: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20">
                <option value="">— Ninguna (categoría principal)</option>
                {padres.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Orden</label>
              <input type="number" value={form.orden}
                onChange={e => setForm({ ...form, orden: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={isPending}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-black text-sm font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer">
              {isPending && <Spinner className="w-4 h-4 text-black" />}{form.id ? 'Actualizar' : 'Crear'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); reset() }}
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-sm font-bold px-6 py-2.5 rounded-lg cursor-pointer">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-amber-400" /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {(['producto', 'servicio'] as TipoCategoria[]).map(tipo => (
            <div key={tipo}>
              <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">
                {tipo === 'producto' ? 'Productos' : 'Servicios'}
              </h2>
              <div className="space-y-2">
                {porTipo(tipo).length === 0 && (
                  <p className="text-zinc-600 text-sm">Sin categorías todavía.</p>
                )}
                {porTipo(tipo).map(c => (
                  <div key={c.id} className={`bg-zinc-950 border border-zinc-900 rounded-lg px-4 py-3 flex items-center justify-between gap-3 ${c.parent_id ? 'ml-6' : ''} ${!c.activo ? 'opacity-50' : ''}`}>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">
                        {c.parent_id && <span className="text-zinc-600">↳ </span>}{c.nombre}
                      </p>
                      {c.parent_id && <p className="text-zinc-600 text-[11px]">en {nombrePadre(c.parent_id)}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleEdit(c)} disabled={isPending}
                        className="text-[11px] font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-md cursor-pointer">Editar</button>
                      <button onClick={() => handleToggle(c.id)} disabled={isPending}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-md cursor-pointer ${c.activo ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>
                        {c.activo ? 'Ocultar' : 'Mostrar'}</button>
                      <button onClick={() => handleDelete(c.id)} disabled={isPending}
                        className="text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-md cursor-pointer">Borrar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
