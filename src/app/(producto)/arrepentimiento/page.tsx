/**
 * /arrepentimiento — el botón de arrepentimiento (Ley 24.240, art. 34;
 * Disposición 954/2025). Sin registrarse. BORRADOR: docs/PASE-RETOQUE.md.
 */

import type { Metadata } from 'next'
import { PRODUCTO, esProvisorio } from '@/lib/producto'
import { A, PaginaLegal } from '@/components/producto/Legal'
import { SolicitudForm } from '@/components/producto/SolicitudForm'

export const metadata: Metadata = {
  title: 'Botón de arrepentimiento',
  description: `Arrepentite de haber contratado ${PRODUCTO.nombre} dentro de los 10 días, sin costo.`,
}

export default function Arrepentimiento() {
  const mail = esProvisorio(PRODUCTO.titular.mail) ? null : PRODUCTO.titular.mail
  return (
    <PaginaLegal
      titulo="Botón de arrepentimiento"
      bajada={`Si contrataste ${PRODUCTO.nombre} a distancia, tenés 10 días corridos desde que contrataste para arrepentirte, sin costo y sin dar explicaciones.`}
    >
      <SolicitudForm tipo="arrepentimiento" producto={PRODUCTO.nombre} mail={mail} whatsapp={PRODUCTO.whatsapp.replace(/\D/g, '') || null} />
      <p className="text-sm text-zinc-400">
        Si ya pasaron los 10 días, podés pedir la <A href="/baja">baja del servicio</A> cuando quieras. Más detalles en
        los <A href="/terminos">términos y condiciones</A>.
      </p>
    </PaginaLegal>
  )
}
