import React from 'react'
import { getMisTurnos } from '@/app/actions/barbero-panel'
import { formatPrecio } from '@/lib/format'

export const dynamic = 'force-dynamic'

const ESTADO_CLASS: Record<string, string> = {
  pendiente: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

function formatFechaLarga(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export default async function BarberoCalendarioPage() {
  const turnos = await getMisTurnos()

  // Agrupar por fecha, en orden.
  const porFecha = new Map<string, typeof turnos>()
  for (const t of turnos) {
    if (!porFecha.has(t.fecha)) porFecha.set(t.fecha, [])
    porFecha.get(t.fecha)!.push(t)
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Mi agenda</h1>
        <p className="text-zinc-400 text-sm mt-1">Tus próximos turnos, ordenados por día.</p>
      </div>

      {turnos.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-10 text-center">
          <p className="text-zinc-400">No tenés turnos próximos.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...porFecha.entries()].map(([fecha, items]) => (
            <div key={fecha}>
              <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wide mb-3 capitalize">
                {formatFechaLarga(fecha)}
              </h2>
              <div className="space-y-3">
                {items.map((t) => (
                  <div
                    key={t.id}
                    className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex items-center gap-4"
                  >
                    <div className="shrink-0 text-center w-16">
                      <p className="text-2xl font-black text-white tabular-nums">{t.hora.slice(0, 5)}</p>
                      <p className="text-[10px] text-zinc-500 uppercase">{t.servicios?.duracion_minutos ?? 0} min</p>
                    </div>
                    <div className="flex-1 border-l border-zinc-900 pl-4">
                      <p className="text-white font-bold">{t.servicios?.nombre ?? 'Servicio'}</p>
                      <p className="text-zinc-400 text-sm">
                        {t.profiles?.nombre} {t.profiles?.apellido}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="text-amber-400 font-bold">{formatPrecio(t.servicios?.precio)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${ESTADO_CLASS[t.estado] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                        {t.estado}
                      </span>
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
