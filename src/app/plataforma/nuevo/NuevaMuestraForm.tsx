'use client'

/**
 * El formulario de una muestra nueva. La dirección web se arma sola a partir
 * del nombre ("Barbería El Tano" → barberia-el-tano) hasta que alguien la
 * cambia a mano.
 *
 * Se manda "a mano" (onSubmit, dentro de una transición) y no con
 * <form action>: así, si la base dice que la dirección ya está usada, el
 * formulario no se vacía y se corrige solo eso.
 */

import React, { useActionState, useState, useTransition } from 'react'
import { crearMuestra, type EstadoCrear } from '@/app/actions/plataforma'
import { RUBROS, slugDe } from '@/lib/plantillas'
import { Spinner } from '@/components/ui/Spinner'

const inputCls = 'w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20'
const etiquetaCls = 'block text-xs font-semibold text-zinc-400 mb-1.5'

export function NuevaMuestraForm({ sitio }: { sitio: string }) {
  const [estado, crear, pendiente] = useActionState<EstadoCrear, FormData>(crearMuestra, {})
  const [, startTransition] = useTransition()
  const [nombre, setNombre] = useState('')
  const [slugManual, setSlugManual] = useState<string | null>(null)
  const slug = slugManual ?? slugDe(nombre)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const datos = new FormData(e.currentTarget)
        startTransition(() => crear(datos))
      }}
      className="flex flex-col gap-6 max-w-2xl">
      <section className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={etiquetaCls} htmlFor="nombre">Nombre del local *</label>
          <input id="nombre" name="nombre" required minLength={2} maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} placeholder="Barbería El Tano" />
        </div>
        <div className="sm:col-span-2">
          <label className={etiquetaCls} htmlFor="slug">Dirección web</label>
          <div className="flex items-stretch rounded-lg border border-zinc-800 bg-zinc-900 focus-within:ring-2 focus-within:ring-amber-500/20 overflow-hidden">
            <span className="px-3 flex items-center text-sm text-zinc-500 bg-zinc-950 border-r border-zinc-800">{sitio}/</span>
            <input
              id="slug" name="slug" value={slug} maxLength={40}
              onChange={(e) => setSlugManual(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 min-w-0 bg-transparent text-white px-3 py-2.5 focus:outline-none"
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1">Minúsculas, números y guiones. Es el link que se comparte, y después solo la cambia el admin.</p>
        </div>
        <div>
          <label className={etiquetaCls} htmlFor="rubro">Rubro</label>
          <select id="rubro" name="rubro" defaultValue="barberia" className={inputCls}>
            {RUBROS.map((r) => <option key={r.valor} value={r.valor}>{r.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={etiquetaCls} htmlFor="whatsapp">WhatsApp</label>
          <input id="whatsapp" name="whatsapp" type="tel" className={inputCls} placeholder="5491123456789" />
        </div>
        <div>
          <label className={etiquetaCls} htmlFor="instagram">Instagram</label>
          <input id="instagram" name="instagram" className={inputCls} placeholder="eltano.barberia" />
        </div>
        <div>
          <label className={etiquetaCls} htmlFor="ciudad">Barrio o ciudad</label>
          <input id="ciudad" name="ciudad" maxLength={80} className={inputCls} placeholder="Mataderos" />
        </div>
        <div className="sm:col-span-2">
          <label className={etiquetaCls} htmlFor="direccion">Dirección</label>
          <input id="direccion" name="direccion" maxLength={120} className={inputCls} placeholder="Av. Directorio 1234" />
        </div>
        <div className="sm:col-span-2">
          <label className={etiquetaCls} htmlFor="profesionales">Quiénes atienden (uno por renglón)</label>
          <textarea id="profesionales" name="profesionales" rows={3} className={inputCls} placeholder={'Juan Pérez\nMarcos'} />
          <p className="text-xs text-zinc-500 mt-1">Si no sabés, dejalo vacío: va uno &quot;de ejemplo&quot; para poder probar la reserva.</p>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button type="submit" disabled={pendiente || nombre.trim().length < 2} className="bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-black text-sm font-bold px-6 py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer">
          {pendiente && <Spinner className="h-4 w-4" />}
          Crear la muestra
        </button>
        {estado.error && <p role="alert" className="text-sm text-red-400">{estado.error}</p>}
      </div>
    </form>
  )
}
