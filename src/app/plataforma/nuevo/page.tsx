/**
 * /plataforma/nuevo — crear una muestra (Fase 6). Solo el nombre es
 * obligatorio: lo demás tiene un valor por defecto que se ve bien y se
 * completa después, desde el panel del local.
 */

import Link from 'next/link'
import { urlPublica } from '@/lib/sitio'
import { NuevaMuestraForm } from './NuevaMuestraForm'

export default function NuevaMuestraPage() {
  return (
    <>
      <div>
        <Link href="/plataforma" className="text-sm text-zinc-500 hover:text-white">← Locales</Link>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mt-2">Nueva muestra</h1>
        <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
          Solo el nombre es obligatorio. Arranca con los servicios típicos del rubro (con precios de referencia),
          horario de lunes a sábado de 10 a 20, y el cartel de &quot;Muestra&quot;: las reservas son de prueba y no aparece en Google.
        </p>
      </div>
      <NuevaMuestraForm sitio={(urlPublica() ?? '').replace(/^https?:\/\//, '')} />
    </>
  )
}
