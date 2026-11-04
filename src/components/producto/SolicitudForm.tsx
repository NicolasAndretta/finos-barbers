'use client'

/**
 * El formulario del botón de arrepentimiento y del botón de baja (Disp.
 * 954/2025): sin registrarse ni iniciar sesión.
 *
 * Al completarlo, la página le da a la persona el código de su solicitud y le
 * arma el mensaje para mandarlo por mail o por WhatsApp (los canales del
 * producto, src/lib/producto.ts). No se guarda en la base: la solicitud llega
 * cuando la persona lo manda, y el equipo confirma por el mismo medio dentro de
 * las 24 horas. Guardarla sola en la base queda anotado como mejora (necesita
 * una migración): docs/PASE-RETOQUE.md.
 */

import React, { useState } from 'react'

type Tipo = 'arrepentimiento' | 'baja'

const QUE: Record<Tipo, { titulo: string; prefijo: string; boton: string }> = {
  arrepentimiento: { titulo: 'Solicitud de arrepentimiento', prefijo: 'ARR', boton: 'Pedir el arrepentimiento' },
  baja: { titulo: 'Solicitud de baja', prefijo: 'BAJ', boton: 'Pedir la baja' },
}

/** RT-BAJ-261104-K7Q2: el tipo, la fecha y 4 caracteres al azar (sin los que se confunden). */
function nuevoCodigo(tipo: Tipo): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const azar = new Uint32Array(4)
  crypto.getRandomValues(azar)
  const hoy = new Date()
  const fecha = `${String(hoy.getFullYear()).slice(2)}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`
  return `RT-${QUE[tipo].prefijo}-${fecha}-${[...azar].map((n) => letras[n % letras.length]).join('')}`
}

export function SolicitudForm({ tipo, producto, mail, whatsapp }: {
  tipo: Tipo
  producto: string
  /** El mail del producto, o null si todavía no está cargado. */
  mail: string | null
  /** El número de WhatsApp del producto (solo dígitos), o null. */
  whatsapp: string | null
}) {
  const [codigo, setCodigo] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [copiado, setCopiado] = useState(false)

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    const valor = (k: string) => String(datos.get(k) ?? '').trim()
    const nuevo = nuevoCodigo(tipo)
    const lineas = [
      `${QUE[tipo].titulo} de ${producto}`,
      `Código: ${nuevo}`,
      `Nombre: ${valor('nombre')}`,
      `Mail: ${valor('mail')}`,
      `Local: ${valor('local')}`,
      valor('detalle') ? `Detalle: ${valor('detalle')}` : '',
    ].filter(Boolean)
    setTexto(lineas.join('\n'))
    setCodigo(nuevo)
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  if (codigo) {
    const asunto = `${QUE[tipo].titulo} ${codigo}`
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-zinc-900/60 p-6 sm:p-8 flex flex-col gap-5" role="status">
        <div>
          <p className="text-sm text-zinc-400">El código de tu solicitud:</p>
          <p className="font-mono text-2xl sm:text-3xl font-bold text-amber-400 mt-1 break-all">{codigo}</p>
        </div>
        <p className="text-zinc-200 leading-relaxed">
          <strong className="text-white">Para que nos llegue, mandala ahora</strong> con uno de estos botones. Te
          confirmamos por el mismo medio dentro de las 24 horas, con este código.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {mail && (
            <a
              href={`mailto:${mail}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`}
              className="inline-flex items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-3.5 font-bold text-zinc-950 transition-colors"
            >
              Mandar por mail
            </a>
          )}
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(texto)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-6 py-3.5 font-semibold text-white transition-colors"
            >
              Mandar por WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={copiar}
            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-6 py-3.5 font-semibold text-white transition-colors"
          >
            {copiado ? 'Copiado' : 'Copiar el texto'}
          </button>
        </div>
        {!mail && !whatsapp && (
          <p className="text-amber-200 text-sm">
            Todavía no hay un mail ni un WhatsApp cargados para recibirla: copiá el texto y guardalo.
          </p>
        )}
        <pre className="whitespace-pre-wrap break-words rounded-xl bg-zinc-950 border border-white/5 p-4 text-sm text-zinc-300 font-mono">{texto}</pre>
      </div>
    )
  }

  const campo = 'w-full rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20'
  return (
    <form onSubmit={enviar} className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 sm:p-8 flex flex-col gap-5">
      <p className="text-sm text-zinc-400">No hace falta registrarte ni iniciar sesión.</p>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-white">Nombre y apellido</span>
        <input name="nombre" required autoComplete="name" className={campo} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-white">Tu mail</span>
        <input name="mail" type="email" required autoComplete="email" className={campo} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-white">Nombre de tu local</span>
        <input name="local" required className={campo} placeholder="Por ejemplo: Barbería El Tano" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-white">
          {tipo === 'baja' ? 'Algo que quieras contarnos' : 'Algo que quieras aclarar'}{' '}
          <span className="font-normal text-zinc-500">(opcional)</span>
        </span>
        <textarea name="detalle" rows={3} className={campo} />
      </label>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-3.5 font-bold text-zinc-950 transition-colors"
      >
        {QUE[tipo].boton}
      </button>
    </form>
  )
}
