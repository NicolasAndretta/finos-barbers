'use client'

import React, { useState, useTransition, useCallback, useEffect } from 'react'
import {
  adminGetBarberos, adminCrearBarbero, adminActualizarBarbero, adminToggleBarbero,
  adminCrearCuentaBarbero,
} from '@/app/actions/barberos'
import { Spinner } from '@/components/ui/Spinner'
import { ImageUploadField } from '@/components/ui/ImageUploadField'

type Barbero = {
  id: string; nombre: string; apellido: string; activo: boolean
  bio: string | null; foto_url: string | null; especialidad: string | null; dias: string[] | null
  cuentas?: { id: string; email: string }[]
}
type FormState = { id: string | null; nombre: string; apellido: string; especialidad: string; bio: string; foto_url: string; dias: string }
const EMPTY: FormState = { id: null, nombre: '', apellido: '', especialidad: '', bio: '', foto_url: '', dias: '' }

export default function AdminBarberosPage() {
  const [items, setItems]            = useState<Barbero[]>([])
  const [loading, setLoading]        = useState(true)
  const [isPending, startTransition] = useTransition()
  const [form, setForm]              = useState<FormState>(EMPTY)
  const [showForm, setShowForm]      = useState(false)
  const [error, setError]            = useState('')
  // Alta de cuenta de acceso por barbero
  const [cuentaFor, setCuentaFor]    = useState<string | null>(null)
  const [cuentaEmail, setCuentaEmail] = useState('')
  const [cuentaPass, setCuentaPass]  = useState('')
  const [cuentaError, setCuentaError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems((await adminGetBarberos()) as Barbero[]) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load() }, [load])
  /* eslint-enable react-hooks/set-state-in-effect */

  const reset = () => { setForm(EMPTY); setError('') }
  const handleEdit = (b: Barbero) => {
    setForm({ id: b.id, nombre: b.nombre, apellido: b.apellido ?? '', especialidad: b.especialidad ?? '', bio: b.bio ?? '', foto_url: b.foto_url ?? '', dias: (b.dias ?? []).join(', ') })
    setShowForm(true); setError('')
  }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    startTransition(async () => {
      const fd = new FormData()
      Object.entries({ nombre: form.nombre, apellido: form.apellido, especialidad: form.especialidad, bio: form.bio, foto_url: form.foto_url, dias: form.dias })
        .forEach(([k, v]) => fd.append(k, v))
      let res: { error?: string }
      if (form.id) { fd.append('id', form.id); res = await adminActualizarBarbero(fd) }
      else { res = await adminCrearBarbero(fd) }
      if (res.error) { setError(res.error); return }
      await load(); setShowForm(false); reset()
    })
  }
  const handleToggle = (id: string) => startTransition(async () => {
    const r = await adminToggleBarbero(id); if (r.error) alert(r.error); else await load()
  })

  const abrirCuenta = (b: Barbero) => {
    setCuentaFor(b.id)
    setCuentaEmail(''); setCuentaPass(''); setCuentaError('')
  }
  const handleCrearCuenta = (barberoId: string) => {
    setCuentaError('')
    startTransition(async () => {
      const fd = new FormData()
      fd.append('barbero_id', barberoId)
      fd.append('email', cuentaEmail)
      fd.append('password', cuentaPass)
      const res = await adminCrearCuentaBarbero(fd)
      if (res.error) { setCuentaError(res.error); return }
      setCuentaFor(null); await load()
    })
  }

  const inputCls = 'w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20'

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Barberos</h1>
          <p className="text-zinc-400 text-sm mt-1">El equipo que aparece en la web y en la reserva.</p>
        </div>
        <button onClick={() => { reset(); setShowForm(true) }}
          className="bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold px-5 py-2.5 rounded-lg cursor-pointer">+ Nuevo Barbero</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 mb-8 space-y-4">
          <h2 className="text-xl font-bold text-white">{form.id ? 'Editar' : 'Nuevo'} barbero</h2>
          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm text-zinc-400 mb-1">Nombre</label>
              <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={inputCls} placeholder="Leandro" /></div>
            <div><label className="block text-sm text-zinc-400 mb-1">Apellido</label>
              <input value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-sm text-zinc-400 mb-1">Especialidad</label>
              <input value={form.especialidad} onChange={e => setForm({ ...form, especialidad: e.target.value })} className={inputCls} placeholder="Cortes clásicos y barba" /></div>
            <div><label className="block text-sm text-zinc-400 mb-1">Días (separados por coma)</label>
              <input value={form.dias} onChange={e => setForm({ ...form, dias: e.target.value })} className={inputCls} placeholder="Lunes, Martes, Sábado" /></div>
          </div>
          <div><label className="block text-sm text-zinc-400 mb-1">Bio</label>
            <textarea rows={2} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className={inputCls + ' resize-none'} placeholder="Una línea sobre el barbero..." /></div>
          <ImageUploadField label="Foto del barbero" value={form.foto_url} onChange={(url) => setForm({ ...form, foto_url: url })} />
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={isPending} className="bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-black text-sm font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer">
              {isPending && <Spinner className="w-4 h-4 text-black" />}{form.id ? 'Actualizar' : 'Crear'}</button>
            <button type="button" onClick={() => { setShowForm(false); reset() }} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-sm font-bold px-6 py-2.5 rounded-lg cursor-pointer">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-amber-400" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map(b => (
            <div key={b.id} className={`bg-zinc-950 border border-zinc-900 rounded-xl p-5 flex gap-4 ${!b.activo ? 'opacity-50' : ''}`}>
              <div className="h-14 w-14 rounded-full bg-amber-400/10 border border-amber-400/30 shrink-0 flex items-center justify-center overflow-hidden font-display text-xl text-amber-400">
                {b.foto_url ? <img src={b.foto_url} alt={b.nombre} className="w-full h-full object-cover" /> : (b.nombre[0] ?? '?')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold">{b.nombre} {b.apellido}</h3>
                  {!b.activo && <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">Oculto</span>}
                </div>
                {b.especialidad && <p className="text-amber-400/80 text-xs">{b.especialidad}</p>}
                {b.bio && <p className="text-zinc-400 text-xs mt-1 line-clamp-2">{b.bio}</p>}
                {b.dias && b.dias.length > 0 && <p className="text-zinc-600 text-[11px] mt-1">Días: {b.dias.join(', ')}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleEdit(b)} disabled={isPending} className="text-[11px] font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-md cursor-pointer">Editar</button>
                  <button onClick={() => handleToggle(b.id)} disabled={isPending} className={`text-[11px] font-bold px-3 py-1.5 rounded-md cursor-pointer ${b.activo ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>{b.activo ? 'Ocultar' : 'Mostrar'}</button>
                </div>

                {/* Cuenta de acceso */}
                <div className="mt-3 pt-3 border-t border-zinc-900">
                  {b.cuentas && b.cuentas.length > 0 ? (
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Tiene cuenta: <span className="text-zinc-400 font-mono">{b.cuentas[0].email}</span>
                    </p>
                  ) : cuentaFor === b.id ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-zinc-400 font-semibold">Crear cuenta de acceso (rol barbero)</p>
                      {cuentaError && <p className="text-[11px] text-red-400">{cuentaError}</p>}
                      <input value={cuentaEmail} onChange={e => setCuentaEmail(e.target.value)} type="email" placeholder="email del barbero"
                        className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                      <input value={cuentaPass} onChange={e => setCuentaPass(e.target.value)} type="text" placeholder="contraseña (mín. 6)"
                        className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                      <div className="flex gap-2">
                        <button onClick={() => handleCrearCuenta(b.id)} disabled={isPending}
                          className="text-[11px] font-bold text-black bg-amber-500 hover:bg-amber-400 px-3 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5">
                          {isPending && <Spinner className="w-3 h-3 text-black" />}Crear cuenta</button>
                        <button onClick={() => setCuentaFor(null)} disabled={isPending}
                          className="text-[11px] font-bold text-zinc-400 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-md cursor-pointer">Cancelar</button>
                      </div>
                      <p className="text-[10px] text-zinc-600">Pasale estos datos al barbero. Podrá cambiar la clave con &quot;¿Olvidaste tu contraseña?&quot;.</p>
                    </div>
                  ) : (
                    <button onClick={() => abrirCuenta(b)} disabled={isPending}
                      className="text-[11px] font-bold text-zinc-300 bg-zinc-800/60 hover:bg-zinc-700 border border-zinc-800 px-3 py-1.5 rounded-md cursor-pointer">
                      + Crear cuenta de acceso
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
