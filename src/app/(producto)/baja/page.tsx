/**
 * /baja — el botón de baja del servicio (Ley 24.240, art. 10 ter;
 * Disposición 954/2025). Sin registrarse. BORRADOR: docs/PASE-RETOQUE.md.
 */

import type { Metadata } from 'next'
import { PRODUCTO, esProvisorio } from '@/lib/producto'
import { A, PaginaLegal, Seccion } from '@/components/producto/Legal'
import { SolicitudForm } from '@/components/producto/SolicitudForm'

export const metadata: Metadata = {
  title: 'Botón de baja',
  description: `Dá de baja ${PRODUCTO.nombre} cuando quieras.`,
}

export default function Baja() {
  const mail = esProvisorio(PRODUCTO.titular.mail) ? null : PRODUCTO.titular.mail
  return (
    <PaginaLegal
      titulo="Botón de baja"
      bajada={`Podés dar de baja ${PRODUCTO.nombre} cuando quieras. Completá esto y te confirmamos la baja dentro de las 24 horas.`}
    >
      <SolicitudForm tipo="baja" producto={PRODUCTO.nombre} mail={mail} whatsapp={PRODUCTO.whatsapp.replace(/\D/g, '') || null} />
      <Seccion titulo="Qué pasa después">
        <ul>
          <li>Desde la baja no se cobran nuevos períodos.</li>
          <li>La página de tu local se suspende: deja de verse y de tomar turnos.</li>
          <li>Antes de irte, descargá tus turnos y tus clientes desde tu panel (en el inicio, &ldquo;Tus datos&rdquo;).</li>
          <li>Pasados 90 días de la baja podemos borrar los datos del local, salvo lo que la ley nos obligue a guardar.</li>
        </ul>
        <p className="text-sm text-zinc-400">
          Si contrataste hace menos de 10 días, también podés usar el <A href="/arrepentimiento">botón de arrepentimiento</A>.
        </p>
      </Seccion>
    </PaginaLegal>
  )
}
