'use client'

import React, { useRef, useState } from 'react'
import { subirImagen } from '@/app/actions/uploads'
import { Spinner } from './Spinner'

/**
 * Campo de imagen con dos opciones: subir desde la PC (a Supabase Storage) o
 * pegar una URL. Muestra vista previa. `value` es la URL final (subida o pegada).
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
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await subirImagen(fd)
      if (res.error) setError(res.error)
      else if (res.url) onChange(res.url)
    } catch {
      setError('No se pudo subir la imagen. Intentá de nuevo.')
    } finally {
      setSubiendo(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

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

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              {subiendo ? <Spinner className="w-3.5 h-3.5 text-white" /> : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
              {subiendo ? 'Subiendo…' : 'Subir desde la PC'}
            </button>
            {value && (
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
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFile}
            className="hidden"
          />

          {/* Alternativa: pegar URL */}
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="…o pegá una URL: https://…"
            className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  )
}
