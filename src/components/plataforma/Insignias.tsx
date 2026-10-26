/**
 * Las etiquetas de la plataforma (Fase 6): el estado de un local y lo que le
 * falta. Sin lógica: solo cómo se ven.
 */

import { NOMBRE_ESTADO, type ResumenLocal } from '@/lib/plataforma-datos'

const COLORES: Record<ResumenLocal['estado'], string> = {
  demo: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  activo: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  suspendido: 'bg-red-500/10 text-red-400 border-red-500/20',
  archivado: 'bg-zinc-800 text-zinc-400 border-zinc-700',
}

export function EstadoLocal({ estado }: { estado: ResumenLocal['estado'] }) {
  return (
    <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${COLORES[estado]}`}>
      {NOMBRE_ESTADO[estado]}
    </span>
  )
}

export function Chip({ tono, children }: { tono: 'ok' | 'falta' | 'suave'; children: React.ReactNode }) {
  const cls = tono === 'ok'
    ? 'bg-emerald-500/10 text-emerald-400'
    : tono === 'falta' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'
  return <span className={`text-[11px] px-2 py-0.5 rounded ${cls}`}>{children}</span>
}
