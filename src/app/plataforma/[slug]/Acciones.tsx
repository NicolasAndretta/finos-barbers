'use client'

/**
 * Los botones de la ficha de un local (Fase 6). Cada uno llama a una acción
 * de app/actions/plataforma.ts, que pasa por una función de la base que
 * revisa el permiso. Las acciones refrescan la página solas (revalidatePath).
 */

import React, { useActionState, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  activarLocal, cambiarEstadoLocal, cambiarPlan, extenderMuestra, invitarDueno, otroLinkDeDueno, quitarDueno,
  type EstadoInvitar, type ResultadoActivar,
} from '@/app/actions/plataforma'
import { cuantoLeQueda, diaYMes, type DuenoDelLocal, type OpcionDePlan, type ResumenLocal } from '@/lib/plataforma-datos'
import { Spinner } from '@/components/ui/Spinner'

const inputCls = 'w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20'
const botonCls = 'bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/40 disabled:cursor-not-allowed text-black text-sm font-bold px-5 py-2.5 rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer'
const botonSecundarioCls = 'border border-zinc-800 hover:border-zinc-600 text-zinc-200 text-sm font-semibold px-4 py-2 rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50'

function Aviso({ ok, texto }: { ok: boolean; texto?: string }) {
  if (!texto) return null
  return (
    <p role={ok ? 'status' : 'alert'} className={`text-sm rounded-lg px-4 py-2.5 border ${ok ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
      {texto}
    </p>
  )
}

const conLocal = (slug: string, extra: Record<string, string> = {}) => {
  const fd = new FormData()
  fd.append('local', slug)
  for (const [k, v] of Object.entries(extra)) fd.append(k, v)
  return fd
}

// ─── Un link, para copiar o mandar por WhatsApp ─────────────────────────────

function LinkParaCompartir({ link, mensaje, etiqueta }: { link: string; mensaje: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Sin permiso para el portapapeles: queda el campo para copiarlo a mano.
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <input readOnly value={link} aria-label={etiqueta} onFocus={(e) => e.currentTarget.select()} className={`${inputCls} text-xs sm:text-sm font-mono`} />
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" onClick={copiar} className={botonSecundarioCls}>{copiado ? '✓ Copiado' : 'Copiar el link'}</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer" className={botonSecundarioCls}>
          Mandarlo por WhatsApp
        </a>
      </div>
    </div>
  )
}

export function CompartirLink({ link, nombre, muestra }: { link: string; nombre: string; muestra: boolean }) {
  const mensaje = muestra
    ? `¡Hola! Te armé una muestra de cómo se vería la página de turnos de ${nombre}: ${link}\nPodés probar reservar un turno: es de prueba.`
    : `Reservá tu turno en ${nombre}: ${link}`
  return <LinkParaCompartir link={link} mensaje={mensaje} etiqueta="El link de la página" />
}

// ─── Los dueños ──────────────────────────────────────────────────────────────

function mensajeDeInvitacion(nombreLocal: string, link: string) {
  return `¡Hola! Este es tu link para entrar al panel de ${nombreLocal}: elegís tu contraseña y listo.\nSirve una sola vez y vence en una hora.\n${link}`
}

export function Duenos({ slug, nombreLocal, duenos, cantidad, puedeManejar }: {
  slug: string; nombreLocal: string; duenos: DuenoDelLocal[] | null; cantidad: number; puedeManejar: boolean
}) {
  const [estado, invitar, invitando] = useActionState<EstadoInvitar, FormData>(invitarDueno, {})
  const [, startTransition] = useTransition()
  const [otro, setOtro] = useState<{ link?: string; error?: string; de?: string }>({})
  const [errorQuitar, setErrorQuitar] = useState('')
  const [trabajando, setTrabajando] = useState<string | null>(null)

  const sacarOtroLink = async (d: DuenoDelLocal) => {
    setTrabajando(d.id)
    const r = await otroLinkDeDueno(conLocal(slug, { usuario: d.id }))
    setOtro({ ...r, de: d.id })
    setTrabajando(null)
  }
  const quitar = async (d: DuenoDelLocal) => {
    if (!window.confirm(`¿Sacar a ${d.email} como dueño? La cuenta no se borra: deja de administrar este local.`)) return
    setTrabajando(d.id)
    const r = await quitarDueno(conLocal(slug, { usuario: d.id }))
    setErrorQuitar(r.error ?? '')
    setTrabajando(null)
  }

  return (
    <div className="flex flex-col gap-5">
      {duenos === null ? (
        <p className="text-sm text-zinc-400">
          {cantidad ? `Tiene ${cantidad} dueño(s).` : 'No tiene dueño.'} En un local activo, los dueños los maneja el admin.
        </p>
      ) : duenos.length === 0 ? (
        <p className="text-sm text-zinc-400">Todavía no tiene dueño.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {duenos.map((d) => (
            <li key={d.id} className="flex flex-col gap-2 bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white break-all">{d.nombre || d.email}</p>
                  <p className="text-xs text-zinc-500 break-all">
                    {d.email} · {d.entro ? 'ya entró' : 'todavía no entró'}
                  </p>
                </div>
                {puedeManejar && (
                  <div className="flex gap-2 shrink-0">
                    {!d.entro && (
                      <button type="button" disabled={trabajando === d.id} onClick={() => sacarOtroLink(d)} className={botonSecundarioCls}>
                        Sacar otro link
                      </button>
                    )}
                    <button type="button" disabled={trabajando === d.id} onClick={() => quitar(d)} className={`${botonSecundarioCls} text-red-400`}>
                      Sacar
                    </button>
                  </div>
                )}
              </div>
              {otro.de === d.id && otro.error && <Aviso ok={false} texto={otro.error} />}
              {otro.de === d.id && otro.link && (
                <LinkParaCompartir link={otro.link} mensaje={mensajeDeInvitacion(nombreLocal, otro.link)} etiqueta={`El link de ${d.email}`} />
              )}
            </li>
          ))}
        </ul>
      )}
      <Aviso ok={false} texto={errorQuitar} />

      {puedeManejar && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const datos = new FormData(e.currentTarget)
            startTransition(() => invitar(datos))
          }}
          className="flex flex-col gap-3 border-t border-zinc-900 pt-5"
        >
          <p className="text-sm font-semibold text-white">Invitar a un dueño</p>
          <input type="hidden" name="local" value={slug} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input name="nombre" required placeholder="Nombre" aria-label="Nombre del dueño" className={inputCls} />
            <input name="apellido" placeholder="Apellido" aria-label="Apellido del dueño" className={inputCls} />
            <input name="email" type="email" required placeholder="Mail" aria-label="Mail del dueño" className={inputCls} />
          </div>
          <div>
            <button type="submit" disabled={invitando} className={botonCls}>
              {invitando && <Spinner className="h-4 w-4" />}
              Invitar
            </button>
          </div>
          {!invitando && estado.error && <Aviso ok={false} texto={estado.error} />}
          {!invitando && estado.yaTeniaCuenta && (
            <Aviso ok texto={`Listo: ${estado.email} ya tenía cuenta, así que entra con su contraseña de siempre (si no se acuerda, "¿Olvidaste tu contraseña?" en el login).`} />
          )}
          {!invitando && estado.link && (
            <div className="flex flex-col gap-2">
              <Aviso ok texto={`Listo: ${estado.email} es dueño. Pasale este link para que elija su contraseña (sirve una vez y vence en una hora):`} />
              <LinkParaCompartir link={estado.link} mensaje={mensajeDeInvitacion(nombreLocal, estado.link)} etiqueta="El link de invitación" />
            </div>
          )}
        </form>
      )}
    </div>
  )
}

// ─── Activar ─────────────────────────────────────────────────────────────────

/** Las tres opciones de plan, como tarjetas para tocar (sirve en el celu). */
function ElegirPlan({ planes, elegido, onElegir, nombre }: { planes: OpcionDePlan[]; elegido: string; onElegir: (p: OpcionDePlan['codigo']) => void; nombre: string }) {
  return (
    <div role="radiogroup" aria-label={nombre} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {planes.map((p) => (
        <button
          key={p.codigo}
          type="button"
          role="radio"
          aria-checked={elegido === p.codigo}
          onClick={() => onElegir(p.codigo)}
          className={`text-left rounded-lg border px-4 py-3 cursor-pointer transition-colors ${elegido === p.codigo ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-800 hover:border-zinc-600'}`}
        >
          <span className="block text-sm font-bold text-white">{p.nombre}</span>
          <span className="block text-xs text-zinc-400">u$s {p.precioUsd} por mes · {p.maxProfesionales === null ? 'profesionales sin límite' : `hasta ${p.maxProfesionales} profesionales`}</span>
        </button>
      ))}
    </div>
  )
}

export function Activar({ slug, faltan, turnosDePrueba, planes, planActual }: { slug: string; faltan: string[]; turnosDePrueba: number; planes: OpcionDePlan[]; planActual: ResumenLocal['plan'] }) {
  const [seguro, setSeguro] = useState(false)
  const [plan, setPlan] = useState<ResumenLocal['plan']>(planActual)
  const [resultado, setResultado] = useState<ResultadoActivar>({})
  const [pendiente, startTransition] = useTransition()
  const router = useRouter()
  const elegido = planes.find((p) => p.codigo === plan)

  // Al activarse, esta sección desaparece (es solo de las muestras): el aviso
  // de cuánto se borró lo muestra la ficha, arriba.
  const activar = () => startTransition(async () => {
    const r = await activarLocal(conLocal(slug, { plan }))
    if (r.borrados) router.replace(`/plataforma/${slug}?activado=${r.borrados.turnos}`)
    else setResultado(r)
  })
  if (faltan.length) {
    return <p className="text-sm text-zinc-400">Para activarla falta: {faltan.join(', ')}.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {!seguro ? (
        <div>
          <button type="button" onClick={() => setSeguro(true)} className={botonCls}>Activar el local</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
          <p className="text-sm font-semibold text-white">¿Con qué plan arranca?</p>
          <ElegirPlan planes={planes} elegido={plan} onElegir={setPlan} nombre="El plan con el que arranca" />
          <p className="text-sm text-zinc-200">
            {elegido ? `Arranca en el plan ${elegido.nombre} (u$s ${elegido.precioUsd} por mes). ` : ''}
            {turnosDePrueba
              ? `Se van a borrar ${turnosDePrueba} turno(s) de prueba, y los pedidos, la caja y las reseñas de prueba. No se puede deshacer.`
              : 'Se borra lo de prueba que haya (pedidos, caja, reseñas). No se puede deshacer.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={pendiente}
              onClick={activar}
              className={botonCls}
            >
              {pendiente && <Spinner className="h-4 w-4" />}
              Sí, activar
            </button>
            <button type="button" disabled={pendiente} onClick={() => setSeguro(false)} className={botonSecundarioCls}>Todavía no</button>
          </div>
        </div>
      )}
      <Aviso ok={false} texto={resultado.error} />
    </div>
  )
}

// ─── Los otros estados ───────────────────────────────────────────────────────

const CAMBIOS: Record<ResumenLocal['estado'], { a: ResumenLocal['estado']; texto: string; explicacion: string; soloAdmin: boolean }[]> = {
  demo: [{ a: 'archivado', texto: 'Archivar la muestra', explicacion: 'Si no se vendió. El link deja de andar; se puede revivir cuando quieras.', soloAdmin: false }],
  archivado: [{ a: 'demo', texto: 'Revivir la muestra', explicacion: 'Vuelve a ser una muestra, con todo lo que tenía, por 30 días.', soloAdmin: false }],
  activo: [{ a: 'suspendido', texto: 'Suspender', explicacion: 'Si dejó de pagar: su página deja de tomar reservas. Él sigue entrando a su panel.', soloAdmin: true }],
  suspendido: [{ a: 'activo', texto: 'Reactivar', explicacion: 'Su página vuelve a tomar reservas.', soloAdmin: true }],
}

export function CambiarEstado({ slug, estado, esAdmin, muestraHasta }: { slug: string; estado: ResumenLocal['estado']; esAdmin: boolean; muestraHasta: string | null }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pendiente, startTransition] = useTransition()
  const opciones = CAMBIOS[estado]

  return (
    <div className="flex flex-col gap-3">
      {estado === 'demo' && muestraHasta && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            disabled={pendiente}
            onClick={() => startTransition(async () => setError((await extenderMuestra(conLocal(slug))).error ?? ''))}
            className={`${botonSecundarioCls} shrink-0`}
          >
            {pendiente && <Spinner className="h-4 w-4" />}
            Sumar 30 días
          </button>
          <p className="text-xs text-zinc-500">
            Se archiva sola el {diaYMes(muestraHasta)} ({cuantoLeQueda(muestraHasta)}) si nadie la extiende.
          </p>
        </div>
      )}
      {opciones.map((o) => (
        o.soloAdmin && !esAdmin ? (
          <p key={o.a} className="text-sm text-zinc-400">{o.texto}: lo hace solo el admin.</p>
        ) : (
          <div key={o.a} className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              disabled={pendiente}
              onClick={() => {
                if (!window.confirm(`${o.texto}: ¿seguro?`)) return
                startTransition(async () => {
                  const r = await cambiarEstadoLocal(conLocal(slug, { estado: o.a }))
                  setError(r.error ?? '')
                  // Sin el "?nueva" de cuando se creó: el aviso pasa a ser el del cambio.
                  if (!r.error) router.replace(`/plataforma/${slug}?cambio=${o.a}`)
                })
              }}
              className={`${botonSecundarioCls} shrink-0`}
            >
              {pendiente && <Spinner className="h-4 w-4" />}
              {o.texto}
            </button>
            <p className="text-xs text-zinc-500">{o.explicacion}</p>
          </div>
        )
      ))}
      <Aviso ok={false} texto={error} />
    </div>
  )
}

/**
 * El plan (Fase 7). En una muestra, el equipo la muestra en cada plan (lo que
 * se ve cambia en el momento). En un local activo es lo que se cobra: lo
 * cambia solo el admin, y la base revisa que entren sus profesionales.
 */
export function CambiarPlan({ slug, estado, plan, planes, esAdmin }: { slug: string; estado: ResumenLocal['estado']; plan: ResumenLocal['plan']; planes: OpcionDePlan[]; esAdmin: boolean }) {
  const [elegido, setElegido] = useState<ResumenLocal['plan']>(plan)
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  const [pendiente, startTransition] = useTransition()
  const enUso = estado === 'activo' || estado === 'suspendido'
  const actual = planes.find((p) => p.codigo === plan)

  if (enUso && !esAdmin) {
    return <p className="text-sm text-zinc-400">Plan {actual?.nombre ?? plan}. El plan de un local activo lo cambia solo el admin.</p>
  }
  const guardar = () => startTransition(async () => {
    const r = await cambiarPlan(conLocal(slug, { plan: elegido }))
    setAviso(r.error ? { ok: false, texto: r.error } : { ok: true, texto: enUso ? 'Listo: el plan cambió.' : 'Listo: la muestra ya se ve en ese plan.' })
  })
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500">
        {enUso
          ? 'Es lo que se cobra. Si baja de plan, no se borra nada: se esconde lo que el plan nuevo no trae.'
          : 'Para mostrársela al dueño en cada plan: lo que se ve cambia en el momento. El plan de verdad se elige al activarla.'}
      </p>
      <ElegirPlan planes={planes} elegido={elegido} onElegir={(p) => { setElegido(p); setAviso(null) }} nombre={enUso ? 'El plan del local' : 'Mostrarla en el plan'} />
      <div>
        <button type="button" disabled={pendiente || elegido === plan} onClick={guardar} className={botonSecundarioCls}>
          {pendiente && <Spinner className="h-4 w-4" />}
          {enUso ? 'Cambiar el plan' : 'Mostrarla en este plan'}
        </button>
      </div>
      {aviso && <Aviso ok={aviso.ok} texto={aviso.texto} />}
    </div>
  )
}
