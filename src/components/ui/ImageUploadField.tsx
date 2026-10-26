'use client'

import React, { useRef, useState } from 'react'
import { Spinner } from './Spinner'
import { useLocal } from '@/components/local/LocalProvider'
import { ImagenInvalida, prepararFoto } from '@/lib/image-client'

/**
 * Campo de foto del panel (productos, profesionales). Muestra la vista previa.
 * `value` es la dirección de la foto ya subida ('' = sin foto).
 *
 * Fase 4b:
 *  - La foto se achica en el navegador antes de subirla (lib/image-client.ts):
 *    sube ~300 KB en vez de 8 MB, y anda con las fotos de cámara del celu.
 *  - Se sube a /api/imagenes, que la vuelve a revisar y la guarda en la carpeta
 *    de ESTE local (lib/imagenes.ts).
 *  - Ya no se puede pegar un link: los de Instagram y Facebook vencen a los
 *    días y la foto se rompía sin aviso.
 */
export function ImageUploadField({
  value,
  onChange,
  label = 'Imagen',
}: {
  value: string
  onChange: (url: string) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Las fotos van a la carpeta del local del panel.
  const local = useLocal()
  const [estado, setEstado] = useState<'' | 'preparando' | 'subiendo'>('')
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      setEstado('preparando')
      const lista = await prepararFoto(file)
      setEstado('subiendo')
      const fd = new FormData()
      fd.append('local', local.slug)
      fd.append('archivo', lista)
      const res = await fetch('/api/imagenes', { method: 'POST', body: fd })
      const datos = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !datos.url) setError(datos.error ?? 'No se pudo subir la foto. Probá de nuevo.')
      else onChange(datos.url)
    } catch (err) {
      setError(err instanceof ImagenInvalida ? err.message : 'No se pudo subir la foto. Probá de nuevo.')
    } finally {
      setEstado('')
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const ocupado = estado !== ''

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-400 mb-1">
        {label} <span className="text-zinc-600 font-normal">(opcional)</span>
      </label>

      <div className="flex items-start gap-3">
        {/* Vista previa */}
        <div className="shrink-0 w-16 h-16 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Vista previa" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-6 h-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={ocupado}
              className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              {ocupado ? <Spinner className="w-3.5 h-3.5 text-white" /> : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
              {estado === 'preparando' ? 'Preparando…' : estado === 'subiendo' ? 'Subiendo…' : value ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {value && !ocupado && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
              >
                Quitar
              </button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
            onChange={handleFile}
            className="hidden"
            aria-label={label}
          />

          <p className="text-xs text-zinc-600">Desde la galería del celu o la compu. Se achica sola.</p>
          {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  )
}
