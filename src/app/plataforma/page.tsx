/**
 * /plataforma — todos los locales, por estado, con lo que le falta a cada uno
 * (Fase 6). Cada tarjeta lleva a la ficha del local.
 */

import Link from 'next/link'
import { getResumenLocales, loQueFalta, type ResumenLocal } from '@/lib/plataforma'
import { RUBROS } from '@/lib/plantillas'
import { Chip, EstadoLocal } from '@/components/plataforma/Insignias'

const SECCIONES: { estado: ResumenLocal['estado']; titulo: string; vacio: string }[] = [
  { estado: 'demo', titulo: 'Muestras', vacio: 'No hay muestras. Creá una para mostrarle a un local.' },
  { estado: 'activo', titulo: 'Activos', vacio: 'Todavía no hay locales activos.' },
  { estado: 'suspendido', titulo: 'Suspendidos', vacio: '' },
  { estado: 'archivado', titulo: 'Archivados', vacio: '' },
]

export default async function PlataformaPage() {
  const locales = await getResumenLocales()

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Locales</h1>
          <p className="text-zinc-400 text-sm mt-1">Las muestras para mostrar, y los locales que ya usan el sistema.</p>
        </div>
        <Link
          href="/plataforma/nuevo"
          className="bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold px-5 py-3 rounded-lg text-center"
        >
          + Nueva muestra
        </Link>
      </div>

      {SECCIONES.map(({ estado, titulo, vacio }) => {
        const deEsteEstado = locales.filter((l) => l.estado === estado)
        if (!deEsteEstado.length && !vacio) return null
        return (
          <section key={estado} className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-white">
              {titulo} <span className="text-zinc-500 font-medium">({deEsteEstado.length})</span>
            </h2>
            {deEsteEstado.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {deEsteEstado.map((l) => <Tarjeta key={l.id} local={l} />)}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">{vacio}</p>
            )}
          </section>
        )
      })}
    </>
  )
}

/** "hace 3 días" (fuera del componente: la hora no es parte de lo que se dibuja). */
function haceCuanto(fecha: string): string {
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}

function Tarjeta({ local }: { local: ResumenLocal }) {
  const { obligatorio, recomendado } = loQueFalta(local)
  const rubro = RUBROS.find((r) => r.valor === local.rubro)?.nombre ?? local.rubro
  return (
    <Link
      href={`/plataforma/${local.slug}`}
      className="block bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 sm:p-5 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-white truncate">{local.nombre}</p>
          <p className="text-xs text-zinc-500 truncate">/{local.slug} · {rubro}</p>
        </div>
        <EstadoLocal estado={local.estado} />
      </div>
      {local.estado === 'demo' && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {obligatorio.length === 0 && <Chip tono="ok">Lista para activar</Chip>}
          {obligatorio.map((f) => <Chip key={f} tono="falta">Falta {f}</Chip>)}
          {recomendado.map((f) => <Chip key={f} tono="suave">Sin {f}</Chip>)}
        </div>
      )}
      <p className="mt-3 text-xs text-zinc-500">
        {local.estado === 'activo' && local.activadoEn
          ? `Activo desde el ${new Date(local.activadoEn).toLocaleDateString('es-AR')}`
          : `Creada ${haceCuanto(local.creadoEn)}${local.creadoPor ? ` por ${local.creadoPor}` : ''}`}
        {local.turnosDePrueba ? ` · ${local.turnosDePrueba} turno(s) de prueba` : ''}
      </p>
    </Link>
  )
}
