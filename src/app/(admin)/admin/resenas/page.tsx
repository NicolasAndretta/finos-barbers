'use client'

import React, { useState, useTransition, useCallback, useEffect } from 'react'
import {
  adminGetResenas, adminCrearResena, adminActualizarResena, adminToggleResena, adminEliminarResena,
} from '@/app/actions/resenas'
import { Spinner } from '@/components/ui/Spinner'

type Resena = { id: string; nombre: string; texto: string; rating: number; visible: boolean; orden: number }
type FormState = { id: string | null; nombre: string; texto: string; rating: string; orden: string; visible: boolean }
const EMPTY: FormState = { id: null, nombre: '', texto: '', rating: '5', orden: '0', visible: true }

export default function AdminResenasPage() {
  const [items, setItems]            = useState<Resena[]>([])
  const [loading, setLoading]        = useState(true)
  const [isPending, startTransition] = useTransition()
  const [form, setForm]              = useState<FormState>(EMPTY)
  const [showForm, setShowForm]      = useState(false)
  const [error, setError]            = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems((await adminGetResenas()) as Resena[]) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load() }, [load])
  /* eslint-enable react-hooks/set-state-in-effect */

  const reset = () => { setForm(EMPTY); setError('') }
  const handleEdit = (r: Resena) => {
    setForm({ id: r.id, nombre: r.nombre, texto: r.texto, rating: r.rating.toString(), orden: r.orden.toString(), visible: r.visible })
    setShowForm(true); setError('')
  }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    startTransition(async () => {
      const fd = new FormData()
      fd.append('nombre', form.nombre); fd.append('texto', form.texto)
      fd.append('rating', form.rating); fd.append('orden', form.orden)
      if (form.visible) fd.append('visible', 'true')
      let res: { error?: string }
      if (form.id) { fd.append('id', form.id); res = await adminActualizarResena(fd) }
      else { res = await adminCrearResena(fd) }
      if (res.error) { setError(res.error); return }
      await load(); setShowForm(false); reset()
    })
  }
  const handleToggle = (id: string) => startTransition(async () => {
    const r = await adminToggleResena(id); if (r.error) alert(r.error); else await load()
  })
  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta reseña?')) return
    startTransition(async () => { const r = await adminEliminarResena(id); if (r.error) alert(r.error); else await load() })
  }

  const inputCls = 'w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20'

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Reseñas</h1>
          <p className="text-zinc-400 text-sm mt-1">Las que estén visibles aparecen en la página principal.</p>
        </div>
        <button onClick={() => { reset(); setShowForm(true) }}
          className="bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold px-5 py-2.5 rounded-lg cursor-pointer">+ Nueva Reseña</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 mb-8 space-y-4">
          <h2 className="text-xl font-bold text-white">{form.id ? 'Editar' : 'Nueva'} reseña</h2>
          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2"><label className="block text-sm text-zinc-400 mb-1">Cliente</label>
              <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={inputCls} placeholder="Martín G." /></div>
            <div><label className="block text-sm text-zinc-400 mb-1">Estrellas</label>
              <select value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} className={inputCls}>
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}
              </select></div>
          </div>
          <div><label className="block text-sm text-zinc-400 mb-1">Texto</label>
            <textarea required rows={3} value={form.texto} onChange={e => setForm({ ...form, texto: e.target.value })} className={inputCls + ' resize-none'} placeholder="Lo que dijo el cliente..." /></div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={form.visible} onChange={e => setForm({ ...form, visible: e.target.checked })} className="accent-amber-500 w-4 h-4" />
              Visible en la web
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-400">Orden</label>
              <input type="number" value={form.orden} onChange={e => setForm({ ...form, orden: e.target.value })} className="w-20 bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={isPending} className="bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-black text-sm font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer">
              {isPending && <Spinner className="w-4 h-4 text-black" />}{form.id ? 'Actualizar' : 'Crear'}</button>
            <button type="button" onClick={() => { setShowForm(false); reset() }} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-sm font-bold px-6 py-2.5 rounded-lg cursor-pointer">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-amber-400" /></div>
      ) : items.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-10 text-center text-zinc-400">No hay reseñas todavía.</div>
      ) : (
        <div className="space-y-3">
          {items.map(r => (
            <div key={r.id} className={`bg-zinc-950 border border-zinc-900 rounded-xl p-5 flex flex-col sm:flex-row justify-between gap-4 ${!r.visible ? 'opacity-55' : ''}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-400 text-sm">{'★'.repeat(r.rating)}</span>
                  <span className="text-white font-bold text-sm">{r.nombre}</span>
                  {!r.visible && <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">Oculta</span>}
                </div>
                <p className="text-zinc-400 text-sm">{r.texto}</p>
              </div>
              <div className="flex gap-2 shrink-0 h-fit">
                <button onClick={() => handleEdit(r)} disabled={isPending} className="text-[11px] font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-md cursor-pointer">Editar</button>
                <button onClick={() => handleToggle(r.id)} disabled={isPending} className={`text-[11px] font-bold px-3 py-1.5 rounded-md cursor-pointer ${r.visible ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>{r.visible ? 'Ocultar' : 'Mostrar'}</button>
                <button onClick={() => handleDelete(r.id)} disabled={isPending} className="text-[11px] font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-md cursor-pointer">Borrar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
