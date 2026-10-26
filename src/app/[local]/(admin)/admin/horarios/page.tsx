'use client'

/**
 * Panel → Horarios (Fase 3b). Lo que carga el dueño (o la comercial en una
 * demo) y usa la reserva para saber qué ofrecer:
 *  1. Reglas: con cuánta anticipación mínima se reserva para hoy, y hasta
 *     cuántos días adelante.
 *  2. El horario del local, día por día. Un día puede tener varios tramos
 *     (horario cortado): en el hueco no se reserva. Sin tramos = cerrado.
 *  3. El horario propio de cada profesional (si no tiene, usa el del local).
 *  4. Ausencias: feriados del local o licencias de un profesional.
 * Las reglas de la base deciden quién puede guardar (migración 0010).
 */

import React, { useCallback, useEffect, useState, useTransition } from 'react'
import { useLocal } from '@/components/local/LocalProvider'
import { Spinner } from '@/components/ui/Spinner'
import { conMayuscula } from '@/lib/rubros'
import { NOMBRES_DIA, SEMANA, type Tramo } from '@/lib/horarios'
import {
  adminGetHorarios, adminGuardarHorarios, adminGuardarReglas, adminCrearAusencia, adminEliminarAusencia,
} from '@/app/actions/horarios'

type Datos = Awaited<ReturnType<typeof adminGetHorarios>>
/** El horario de la semana: para cada día (0 a 6), sus tramos. */
type Semana = Record<number, Tramo[]>

const inputCls = 'bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20'
const botonCls = 'bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-black text-sm font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer'

const OPCIONES_ANTICIPACION = [
  { valor: 0, texto: 'Sin mínimo' }, { valor: 30, texto: '30 minutos' }, { valor: 60, texto: '1 hora' },
  { valor: 120, texto: '2 horas' }, { valor: 180, texto: '3 horas' }, { valor: 360, texto: '6 horas' },
  { valor: 720, texto: '12 horas' }, { valor: 1440, texto: '1 día' }, { valor: 2880, texto: '2 días' },
]

/** Arma la semana (día → tramos) a partir de las filas de la base. */
function semanaDe(tramos: Datos['tramos'], barberoId: string | null): Semana {
  const semana: Semana = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  for (const t of tramos) if (t.barbero_id === barberoId) semana[t.dia_semana].push({ desde: t.desde, hasta: t.hasta })
  return semana
}

/** Para guardar: la semana como lista de tramos con su día. */
function aLista(semana: Semana) {
  return SEMANA.flatMap((dia) => semana[dia].map((t) => ({ dia, desde: t.desde, hasta: t.hasta })))
}

export default function AdminHorariosPage() {
  const local = useLocal()
  const [datos, setDatos] = useState<Datos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  const cargar = useCallback(async () => {
    try {
      setDatos(await adminGetHorarios(local.slug))
      setErrorCarga('')
    } catch (e) {
      setErrorCarga(e instanceof Error ? e.message : 'No se pudieron leer los horarios.')
    } finally {
      setCargando(false)
    }
  }, [local.slug])

  // Carga al entrar (igual que las otras páginas del panel).
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => { cargar() }, [cargar])

  if (cargando) return <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-amber-400" /></div>
  if (!datos) return <p className="text-red-400 text-sm">{errorCarga}</p>

  return (
    <div className="w-full flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Horarios</h1>
        <p className="text-zinc-400 text-sm mt-1">La reserva solo ofrece lo que está abierto, y la web muestra estos mismos horarios.</p>
      </div>

      <Reglas slug={local.slug} inicial={datos.reglas} alGuardar={cargar} />

      <Seccion titulo="Horario del local" detalle="Un día sin tramos queda cerrado. Si cierran al mediodía, cargá dos tramos (por ejemplo, de 10 a 13 y de 15 a 20).">
        {/* Sin "key" a propósito: después de guardar, el editor ya tiene lo que
            quedó guardado, y rearmarlo borraba el aviso "Horario guardado". */}
        <EditorSemana
          inicial={semanaDe(datos.tramos, null)}
          textoGuardar="Guardar horario del local"
          alGuardar={async (semana) => {
            const fd = new FormData()
            fd.append('local', local.slug)
            fd.append('tramos', JSON.stringify(aLista(semana)))
            const r = await adminGuardarHorarios(fd)
            if (!r.error) await cargar()
            return r
          }}
        />
      </Seccion>

      <HorarioProfesionales slug={local.slug} datos={datos} alGuardar={cargar} />

      <Ausencias slug={local.slug} datos={datos} alGuardar={cargar} />
    </div>
  )
}

function Seccion({ titulo, detalle, children }: { titulo: string; detalle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 sm:p-6">
      <h2 className="text-xl font-bold text-white">{titulo}</h2>
      {detalle && <p className="text-zinc-500 text-sm mt-1 mb-5">{detalle}</p>}
      {!detalle && <div className="mb-5" />}
      {children}
    </section>
  )
}

function Aviso({ ok, texto }: { ok: boolean; texto: string }) {
  if (!texto) return null
  return (
    <p role="status" className={`text-sm rounded-lg px-4 py-2.5 border ${ok ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
      {texto}
    </p>
  )
}

// ─── 1. Reglas de reserva ────────────────────────────────────────────────────

function Reglas({ slug, inicial, alGuardar }: { slug: string; inicial: Datos['reglas']; alGuardar: () => Promise<void> }) {
  const [anticipacion, setAnticipacion] = useState(inicial.anticipacionMinutos)
  const [dias, setDias] = useState(inicial.diasReserva)
  const [aviso, setAviso] = useState({ ok: true, texto: '' })
  const [pendiente, startTransition] = useTransition()
  // Si el valor guardado no está entre las opciones (lo cargaron a mano), igual se muestra.
  const opciones = OPCIONES_ANTICIPACION.some((o) => o.valor === anticipacion)
    ? OPCIONES_ANTICIPACION
    : [...OPCIONES_ANTICIPACION, { valor: anticipacion, texto: `${anticipacion} minutos` }]

  const guardar = () => startTransition(async () => {
    const fd = new FormData()
    fd.append('local', slug)
    fd.append('anticipacion_minutos', String(anticipacion))
    fd.append('dias_reserva', String(dias))
    const r = await adminGuardarReglas(fd)
    setAviso(r.error ? { ok: false, texto: r.error } : { ok: true, texto: 'Reglas guardadas.' })
    if (!r.error) await alGuardar()
  })

  return (
    <Seccion titulo="Reglas para reservar">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <label className="block">
          <span className="block text-sm text-zinc-400 mb-1">Para reservar hoy, con cuánta anticipación mínima</span>
          <select value={anticipacion} onChange={(e) => setAnticipacion(Number(e.target.value))} className={`${inputCls} w-full`} aria-label="Anticipación mínima">
            {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm text-zinc-400 mb-1">Hasta cuántos días adelante se puede reservar</span>
          <input type="number" min={1} max={365} value={dias} onChange={(e) => setDias(Number(e.target.value))} className={`${inputCls} w-full`} aria-label="Días adelante" />
        </label>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button type="button" onClick={guardar} disabled={pendiente} className={botonCls}>
          {pendiente && <Spinner className="w-4 h-4 text-black" />}Guardar reglas
        </button>
        <Aviso {...aviso} />
      </div>
    </Seccion>
  )
}

// ─── 2. Editor de una semana (el del local y el de cada profesional) ─────────

function EditorSemana({ inicial, textoGuardar, alGuardar }: {
  inicial: Semana
  textoGuardar: string
  alGuardar: (semana: Semana) => Promise<{ error?: string }>
}) {
  const [semana, setSemana] = useState<Semana>(inicial)
  const [aviso, setAviso] = useState({ ok: true, texto: '' })
  const [pendiente, startTransition] = useTransition()

  const cambiar = (dia: number, tramos: Tramo[]) => setSemana((s) => ({ ...s, [dia]: tramos }))

  const guardar = () => startTransition(async () => {
    const r = await alGuardar(semana)
    setAviso(r.error ? { ok: false, texto: r.error } : { ok: true, texto: 'Horario guardado.' })
  })

  return (
    <div className="flex flex-col gap-3">
      {SEMANA.map((dia) => {
        const tramos = semana[dia]
        const abierto = tramos.length > 0
        return (
          <div key={dia} className="flex flex-col sm:flex-row sm:items-start gap-3 border-b border-zinc-900 pb-3">
            <div className="flex items-center justify-between sm:w-40 shrink-0">
              <span className="text-white font-semibold">{NOMBRES_DIA[dia]}</span>
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={abierto}
                  aria-label={`${NOMBRES_DIA[dia]} abierto`}
                  onChange={(e) => cambiar(dia, e.target.checked ? [{ desde: '10:00', hasta: '20:00' }] : [])}
                  className="accent-amber-500 w-4 h-4"
                />
                {abierto ? 'Abierto' : 'Cerrado'}
              </label>
            </div>
            {abierto && (
              <div className="flex flex-col gap-2 flex-1">
                {tramos.map((t, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input type="time" step={900} value={t.desde} aria-label={`${NOMBRES_DIA[dia]}, desde (tramo ${i + 1})`}
                      onChange={(e) => cambiar(dia, tramos.map((x, j) => (j === i ? { ...x, desde: e.target.value } : x)))} className={inputCls} />
                    <span className="text-zinc-500 text-sm">a</span>
                    <input type="time" step={900} value={t.hasta} aria-label={`${NOMBRES_DIA[dia]}, hasta (tramo ${i + 1})`}
                      onChange={(e) => cambiar(dia, tramos.map((x, j) => (j === i ? { ...x, hasta: e.target.value } : x)))} className={inputCls} />
                    {tramos.length > 1 && (
                      <button type="button" onClick={() => cambiar(dia, tramos.filter((_, j) => j !== i))}
                        className="text-[11px] font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-md cursor-pointer">Quitar</button>
                    )}
                  </div>
                ))}
                {tramos.length < 3 && (
                  <button type="button" aria-label={`Agregar tramo el ${NOMBRES_DIA[dia].toLowerCase()}`}
                    onClick={() => {
                      const ultimo = tramos[tramos.length - 1]
                      cambiar(dia, [...tramos, { desde: ultimo?.hasta ?? '15:00', hasta: '20:00' }])
                    }}
                    className="self-start text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer">
                    + Agregar tramo (horario cortado)
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
        <button type="button" onClick={guardar} disabled={pendiente} className={botonCls}>
          {pendiente && <Spinner className="w-4 h-4 text-black" />}{textoGuardar}
        </button>
        <Aviso {...aviso} />
      </div>
    </div>
  )
}

// ─── 3. Horario de cada profesional ──────────────────────────────────────────

function HorarioProfesionales({ slug, datos, alGuardar }: { slug: string; datos: Datos; alGuardar: () => Promise<void> }) {
  const local = useLocal()
  const Profesional = conMayuscula(local.palabras.profesional)
  const [elegido, setElegido] = useState(datos.profesionales[0]?.id ?? '')
  const tienePropio = datos.tramos.some((t) => t.barbero_id === elegido)
  const [propio, setPropio] = useState(tienePropio)
  const [aviso, setAviso] = useState({ ok: true, texto: '' })
  const [pendiente, startTransition] = useTransition()

  if (!datos.profesionales.length) return null

  const guardar = async (semana: Semana) => {
    const fd = new FormData()
    fd.append('local', slug)
    fd.append('barbero_id', elegido)
    fd.append('tramos', JSON.stringify(aLista(semana)))
    const r = await adminGuardarHorarios(fd)
    if (!r.error) await alGuardar()
    return r
  }

  // Volver al horario del local = guardar su horario propio vacío.
  const usarElDelLocal = () => startTransition(async () => {
    const r = await guardar({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] })
    setAviso(r.error ? { ok: false, texto: r.error } : { ok: true, texto: 'Ahora usa el horario del local.' })
    if (!r.error) setPropio(false)
  })

  return (
    <Seccion titulo={`Horario de cada ${local.palabras.profesional}`} detalle={`Si un ${local.palabras.profesional} no tiene horario propio, atiende en el horario del local. Si tiene, se ofrece lo que tienen en común.`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <label className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">{Profesional}</span>
          <select value={elegido} aria-label={Profesional}
            onChange={(e) => { setElegido(e.target.value); setPropio(datos.tramos.some((t) => t.barbero_id === e.target.value)); setAviso({ ok: true, texto: '' }) }}
            className={inputCls}>
            {datos.profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
          </select>
        </label>
        {propio ? (
          <button type="button" onClick={usarElDelLocal} disabled={pendiente} className="text-sm font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg cursor-pointer">
            Usar el horario del local
          </button>
        ) : (
          <button type="button" onClick={() => setPropio(true)} className="text-sm font-semibold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-4 py-2 rounded-lg cursor-pointer">
            Cargarle un horario propio
          </button>
        )}
      </div>
      <Aviso {...aviso} />
      {propio ? (
        <EditorSemana
          key={elegido /* se rearma solo al cambiar de profesional, no al guardar */}
          inicial={tienePropio ? semanaDe(datos.tramos, elegido) : semanaDe(datos.tramos, null)}
          textoGuardar={`Guardar horario de ${datos.profesionales.find((p) => p.id === elegido)?.nombre ?? Profesional}`}
          alGuardar={guardar}
        />
      ) : (
        <p className="text-zinc-500 text-sm">Usa el horario del local.</p>
      )}
    </Seccion>
  )
}

// ─── 4. Ausencias ────────────────────────────────────────────────────────────

function Ausencias({ slug, datos, alGuardar }: { slug: string; datos: Datos; alGuardar: () => Promise<void> }) {
  const local = useLocal()
  const [form, setForm] = useState({ barbero_id: '', desde: '', hasta: '', motivo: '' })
  const [aviso, setAviso] = useState({ ok: true, texto: '' })
  const [pendiente, startTransition] = useTransition()
  const nombreDe = (id: string | null) => {
    if (!id) return 'Todo el local'
    const p = datos.profesionales.find((x) => x.id === id)
    return p ? `${p.nombre} ${p.apellido}`.trim() : conMayuscula(local.palabras.profesional)
  }
  const fechaLinda = (f: string) => f.split('-').reverse().join('/')

  const agregar = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const fd = new FormData()
      fd.append('local', slug)
      fd.append('barbero_id', form.barbero_id)
      fd.append('desde', form.desde)
      fd.append('hasta', form.hasta || form.desde)
      fd.append('motivo', form.motivo)
      const r = await adminCrearAusencia(fd)
      setAviso(r.error ? { ok: false, texto: r.error } : { ok: true, texto: 'Ausencia agregada.' })
      if (!r.error) { setForm({ barbero_id: '', desde: '', hasta: '', motivo: '' }); await alGuardar() }
    })
  }

  const borrar = (id: string) => {
    if (!confirm('¿Borrar esta ausencia?')) return
    startTransition(async () => {
      const r = await adminEliminarAusencia(id)
      setAviso(r.error ? { ok: false, texto: r.error } : { ok: true, texto: 'Ausencia borrada.' })
      if (!r.error) await alGuardar()
    })
  }

  return (
    <Seccion titulo="Ausencias" detalle={`Feriados (todo el local cerrado) o licencias de un ${local.palabras.profesional}. Esos días no se ofrecen turnos. El motivo no se muestra al público.`}>
      <form onSubmit={agregar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5 items-end">
        <label className="block">
          <span className="block text-sm text-zinc-400 mb-1">Quién</span>
          <select value={form.barbero_id} onChange={(e) => setForm({ ...form, barbero_id: e.target.value })} className={`${inputCls} w-full`} aria-label="Quién falta">
            <option value="">Todo el local</option>
            {datos.profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm text-zinc-400 mb-1">Desde</span>
          <input type="date" required value={form.desde} onChange={(e) => setForm({ ...form, desde: e.target.value })} className={`${inputCls} w-full`} aria-label="Ausencia desde" />
        </label>
        <label className="block">
          <span className="block text-sm text-zinc-400 mb-1">Hasta</span>
          <input type="date" value={form.hasta} min={form.desde || undefined} onChange={(e) => setForm({ ...form, hasta: e.target.value })} className={`${inputCls} w-full`} aria-label="Ausencia hasta" />
        </label>
        <label className="block">
          <span className="block text-sm text-zinc-400 mb-1">Motivo (opcional)</span>
          <input type="text" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={`${inputCls} w-full`} placeholder="Feriado, vacaciones..." aria-label="Motivo" />
        </label>
        <button type="submit" disabled={pendiente} className={`${botonCls} justify-center`}>
          {pendiente && <Spinner className="w-4 h-4 text-black" />}Agregar ausencia
        </button>
      </form>
      <Aviso {...aviso} />
      {datos.ausencias.length === 0 ? (
        <p className="text-zinc-500 text-sm mt-3">No hay ausencias cargadas.</p>
      ) : (
        <ul className="flex flex-col gap-2 mt-3">
          {datos.ausencias.map((a) => (
            <li key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3">
              <div className="text-sm">
                <span className="text-white font-semibold">{nombreDe(a.barbero_id)}</span>
                <span className="text-zinc-400"> · {a.desde === a.hasta ? fechaLinda(a.desde) : `${fechaLinda(a.desde)} al ${fechaLinda(a.hasta)}`}</span>
                {a.motivo && <span className="text-zinc-500"> · {a.motivo}</span>}
              </div>
              <button type="button" onClick={() => borrar(a.id)} disabled={pendiente} className="self-start sm:self-auto text-[11px] font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-md cursor-pointer">Borrar</button>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  )
}
