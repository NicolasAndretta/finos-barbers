'use client'

/**
 * Panel → Datos del local (Fase 6). Lo que la web muestra del negocio: nombre,
 * lema, dirección, WhatsApp, redes, seña y medios de pago. Lo guardan el dueño
 * y el equipo (la acción y la base revisan el permiso).
 *
 * Los valores de arranque salen del local de la página (LocalProvider). Dos
 * campos tienen un valor "de relleno" cuando están vacíos (el nombre corto usa
 * el nombre, el mensaje de WhatsApp uno armado): si lo que llega es ese
 * relleno, el campo arranca vacío, así no se guarda como si lo hubieran escrito.
 */

import React, { useActionState } from 'react'
import Link from 'next/link'
import { useLocal } from '@/components/local/LocalProvider'
import { Spinner } from '@/components/ui/Spinner'
import { guardarDatosDelLocal, type EstadoDatosLocal } from '@/app/actions/local'
import { MEDIOS_DE_PAGO, rutaLocal } from '@/lib/local-datos'

const inputCls = 'w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20'
const etiquetaCls = 'block text-xs font-semibold text-zinc-400 mb-1.5'

export default function DatosDelLocalPage() {
  const local = useLocal()
  const [estado, guardar, pendiente] = useActionState<EstadoDatosLocal, FormData>(guardarDatosDelLocal, {})
  const mensajeDeRelleno = `¡Hola ${local.nombreCorto}! Quería hacer una consulta / reservar un turno.`

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Datos del local</h1>
          <p className="text-zinc-400 text-sm mt-1">Lo que ven tus clientes en la página. Lo que dejes vacío no se muestra.</p>
        </div>
        <Link href={rutaLocal(local.slug)} target="_blank" className="text-sm font-semibold text-amber-400 hover:text-amber-300">
          Ver la página ↗
        </Link>
      </div>

      <form action={guardar} className="flex flex-col gap-8">
        <input type="hidden" name="local" value={local.slug} />

        <Seccion titulo="El negocio">
          <Campo etiqueta="Nombre" nombre="nombre" inicial={local.nombre} requerido />
          <Campo etiqueta="Nombre corto (para el logo; si no, va el nombre)" nombre="nombre_corto" inicial={local.nombreCorto === local.nombre ? '' : local.nombreCorto} max={30} />
          <Campo etiqueta="Frase principal de la página" nombre="lema" inicial={local.lema} max={120} ancho />
          <div className="sm:col-span-2">
            <label className={etiquetaCls} htmlFor="descripcion">Descripción (para Google y los links compartidos)</label>
            <textarea id="descripcion" name="descripcion" defaultValue={local.descripcion} maxLength={600} rows={3} className={inputCls} />
          </div>
        </Seccion>

        <Seccion titulo="Dónde está y cómo se contactan">
          <Campo etiqueta="Dirección" nombre="direccion" inicial={local.direccion} max={120} />
          <Campo etiqueta="Barrio o ciudad" nombre="ciudad" inicial={local.ciudad} max={80} />
          <Campo etiqueta="WhatsApp (con código de país y de área)" nombre="whatsapp" inicial={local.whatsapp} tipo="tel" ejemplo="5491123456789" />
          <Campo etiqueta="Mail" nombre="email" inicial={local.email} tipo="email" />
          <div className="sm:col-span-2">
            <label className={etiquetaCls} htmlFor="whatsapp_mensaje">Mensaje que se carga al tocar el botón de WhatsApp</label>
            <textarea id="whatsapp_mensaje" name="whatsapp_mensaje" defaultValue={local.whatsappMensaje === mensajeDeRelleno ? '' : local.whatsappMensaje} placeholder={mensajeDeRelleno} maxLength={300} rows={2} className={inputCls} />
          </div>
          <Campo etiqueta="Instagram (el usuario)" nombre="instagram" inicial={local.instagram} ejemplo="eltano.barberia" />
          <Campo etiqueta="TikTok (el usuario)" nombre="tiktok" inicial={local.tiktok} />
        </Seccion>

        <Seccion titulo="Seña y pagos">
          <Campo etiqueta="Seña para confirmar un turno (%)" nombre="sena_porcentaje" inicial={String(local.senaPorcentaje)} tipo="number" min={0} maxNum={100} requerido />
          <Campo etiqueta="Alias para transferencias" nombre="alias_pago" inicial={local.aliasPago} max={60} />
          <fieldset className="sm:col-span-2">
            <legend className={etiquetaCls}>Medios de pago que aceptan (se muestran en la página)</legend>
            <div className="flex flex-wrap gap-3">
              {MEDIOS_DE_PAGO.map((m) => (
                <label key={m} className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 cursor-pointer">
                  <input type="checkbox" name="medios_pago" value={m} defaultChecked={local.mediosPago.includes(m)} className="accent-amber-500" />
                  {m}
                </label>
              ))}
            </div>
          </fieldset>
        </Seccion>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button type="submit" disabled={pendiente} className="bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-black text-sm font-bold px-6 py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer">
            {pendiente && <Spinner className="h-4 w-4" />}
            Guardar los datos
          </button>
          {estado.error && <p role="alert" className="text-sm text-red-400">{estado.error}</p>}
          {estado.guardado && !pendiente && <p role="status" className="text-sm text-emerald-400">Datos guardados: la página ya los muestra.</p>}
        </div>
      </form>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 sm:p-6">
      <h2 className="text-xl font-bold text-white mb-5">{titulo}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </section>
  )
}

function Campo({ etiqueta, nombre, inicial, tipo = 'text', max, min, maxNum, ejemplo, requerido, ancho }: {
  etiqueta: string; nombre: string; inicial: string; tipo?: string; max?: number; min?: number; maxNum?: number
  ejemplo?: string; requerido?: boolean; ancho?: boolean
}) {
  return (
    <div className={ancho ? 'sm:col-span-2' : ''}>
      <label className={etiquetaCls} htmlFor={nombre}>{etiqueta}</label>
      <input
        id={nombre} name={nombre} type={tipo} defaultValue={inicial} maxLength={max} min={min} max={maxNum}
        placeholder={ejemplo} required={requerido} className={inputCls}
      />
    </div>
  )
}
