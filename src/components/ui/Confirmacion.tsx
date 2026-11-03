'use client'

import React from 'react'
import { Spinner } from './Spinner'

/**
 * Una confirmación dentro de la página, en vez del cartel del navegador
 * (window.confirm, que se ve distinto en cada navegador y no se puede
 * diseñar): dice qué va a pasar, con un botón para hacerlo y otro para volver
 * atrás. Se muestra en el lugar del botón que la abrió.
 *
 * tono "peligro" (rojo) para lo que borra o cancela; "aviso" para el resto.
 */
export function Confirmacion({ pregunta, detalle, si, no = 'Todavía no', onSi, onNo, pendiente = false, tono = 'peligro' }: {
  pregunta: string
  detalle?: string
  si: string
  no?: string
  onSi: () => void
  onNo: () => void
  pendiente?: boolean
  tono?: 'peligro' | 'aviso'
}) {
  const caja = tono === 'peligro' ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'
  const botonSi = tono === 'peligro'
    ? 'bg-red-500 hover:bg-red-400 text-white'
    : 'bg-amber-500 hover:bg-amber-400 text-black'
  return (
    <div role="alertdialog" aria-label={pregunta} className={`w-full flex flex-col gap-3 border rounded-lg p-4 ${caja}`}>
      <p className="text-sm font-semibold text-white">{pregunta}</p>
      {detalle && <p className="text-sm text-zinc-300">{detalle}</p>}
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" disabled={pendiente} onClick={onSi}
          className={`${botonSi} disabled:opacity-50 text-sm font-bold px-5 py-2.5 rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer`}>
          {pendiente && <Spinner className="h-4 w-4" />}
          {si}
        </button>
        <button type="button" disabled={pendiente} onClick={onNo}
          className="border border-zinc-800 hover:border-zinc-600 text-zinc-200 text-sm font-semibold px-4 py-2.5 rounded-lg inline-flex items-center justify-center cursor-pointer disabled:opacity-50">
          {no}
        </button>
      </div>
    </div>
  )
}
