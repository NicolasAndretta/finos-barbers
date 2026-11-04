/**
 * /privacidad — la política de privacidad de Retoque.
 *
 * ⚠️ BORRADOR del 04/11/2026, para revisar con un abogado antes de vender
 * (docs/PASE-RETOQUE.md). Se apoya en la Ley 25.326 de protección de los datos
 * personales (vigente: hay proyectos para reemplazarla, ninguno aprobado), con
 * la Agencia de Acceso a la Información Pública (AAIP) como órgano de control.
 *
 * Lo que dice de los datos sale del sistema tal como es hoy: qué se guarda
 * (migraciones), las cookies (solo las de la sesión de Supabase), el carrito
 * de la tienda en el navegador (lib/cart-context.tsx) y los proveedores.
 */

import type { Metadata } from 'next'
import { PRODUCTO } from '@/lib/producto'
import { A, DatosDelTitular, MailDeContacto, PaginaLegal, Seccion } from '@/components/producto/Legal'

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: `Qué datos guarda ${PRODUCTO.nombre}, para qué, dónde, y cómo ejercer tus derechos.`,
}

export default function Privacidad() {
  const n = PRODUCTO.nombre
  return (
    <PaginaLegal
      titulo="Política de privacidad"
      bajada={`Qué datos guarda ${n}, para qué los usa, dónde están y cómo pedir que los veas, los corrijas o los borres.`}
    >
      <Seccion titulo="1. Quién es responsable de tus datos">
        <p>Depende de quién seas:</p>
        <ul>
          <li>
            <strong>Si reservás turnos en un local:</strong> el responsable de tus datos como cliente es ese local. {n} los
            guarda y los trata por cuenta del local, solo para prestarle el servicio.
          </li>
          <li>
            <strong>Si tenés un local o sos parte de su equipo:</strong> el responsable de tus datos es el titular de {n}.
          </li>
          <li>
            <strong>Tu cuenta</strong> (nombre, apellido, mail y clave) es una sola en toda la plataforma y la administra {n}.
            Cada local ve solo lo que hiciste con él.
          </li>
        </ul>
        <p>El titular de {n} es:</p>
        <DatosDelTitular />
      </Seccion>

      <Seccion titulo="2. Qué datos guardamos">
        <ul>
          <li><strong>De tu cuenta:</strong> nombre, apellido y mail. La clave se guarda cifrada: nadie la puede leer.</li>
          <li><strong>De tus turnos:</strong> el local, el servicio, el profesional, el día y la hora, el estado del turno y el de la seña.</li>
          <li><strong>Tus reseñas:</strong> lo que escribiste, la puntuación, y tu nombre con la inicial del apellido.</li>
          <li>
            <strong>Si comprás en la tienda de un local:</strong> lo que compraste, la dirección de envío si pedís que te
            lo manden y, si no tenés cuenta, el nombre, el mail y el teléfono que dejes para el pedido.
          </li>
          <li>
            <strong>De los pagos:</strong> el resultado del pago (aprobado, pendiente o devuelto), el monto y su número en
            Mercado Pago. No guardamos datos de tarjetas: el pago se hace en Mercado Pago.
          </li>
          <li>
            <strong>De cada local:</strong> nombre, dirección, horarios, servicios, precios, logo, fotos, sus datos de cobro
            (alias de transferencia y la conexión con su cuenta de Mercado Pago) y las cuentas de su equipo.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="3. Para qué los usamos">
        <ul>
          <li>Para que puedas reservar, ver y cancelar tus turnos, y para que el local los gestione.</li>
          <li>Para avisarte por mail de tu turno (solo en los locales activos, no en las muestras).</li>
          <li>Para cobrar la seña o una compra con Mercado Pago, en la cuenta del local.</li>
          <li>Para mostrar las reseñas y armarle al local sus reportes.</li>
          <li>Para la seguridad del sistema y para cumplir con la ley.</li>
        </ul>
        <p>
          No vendemos tus datos, no los usamos para publicidad y no los compartimos con nadie más que los proveedores de
          abajo, salvo que la ley o un juez lo exijan.
        </p>
      </Seccion>

      <Seccion titulo="4. Dónde están: nuestros proveedores">
        <ul>
          <li><strong>Supabase:</strong> la base de datos, las cuentas y las imágenes.</li>
          <li><strong>Hostinger:</strong> el alojamiento del sitio.</li>
          <li><strong>Mercado Pago:</strong> el cobro de las señas y de la tienda, en la cuenta de cada local.</li>
          <li><strong>Resend:</strong> el envío de los mails de los turnos.</li>
        </ul>
        <p>
          Algunos de estos proveedores guardan o procesan datos fuera de la Argentina, en países que pueden no tener el
          nivel de protección que exige la Ley 25.326. Les pasamos solo lo necesario para prestar el servicio, y al usar{' '}
          {n} prestás tu consentimiento para esa transferencia.
        </p>
      </Seccion>

      <Seccion titulo="5. Cómo los cuidamos">
        <ul>
          <li>Toda la conexión con el sitio va cifrada.</li>
          <li>Cada local ve solo lo suyo: no lo controla solo la pantalla, lo controla la propia base de datos.</li>
          <li>Cada persona del equipo de un local entra con su propia cuenta y ve solo lo que su rol le permite.</li>
        </ul>
      </Seccion>

      <Seccion titulo="6. Cuánto tiempo los guardamos">
        <ul>
          <li>Mientras tengas tu cuenta, o mientras el local use {n}.</li>
          <li>Si un local se da de baja, pasados 90 días podemos borrar sus datos y los de sus turnos, salvo lo que la ley nos obligue a guardar.</li>
          <li>Si pedís borrar tu cuenta, la borramos, salvo lo que haga falta guardar por ley (por ejemplo, un pago).</li>
        </ul>
      </Seccion>

      <Seccion titulo="7. Cookies">
        <p>
          Usamos solo las cookies que hacen falta para que tengas la sesión iniciada. No usamos cookies de publicidad ni
          de seguimiento. El carrito de la tienda de un local se guarda en tu propio navegador.
        </p>
      </Seccion>

      <Seccion titulo="8. Tus derechos">
        <p>Sobre tus datos personales, podés pedir:</p>
        <ul>
          <li><strong>Acceso:</strong> saber qué datos tuyos tenemos. Respondemos dentro de los 10 días corridos.</li>
          <li>
            <strong>Rectificación, actualización o supresión:</strong> corregirlos, ponerlos al día o borrarlos.
            Respondemos dentro de los 5 días hábiles.
          </li>
        </ul>
        <p>
          Para hacerlo, escribinos a <MailDeContacto /> desde el mail de tu cuenta. Si sos cliente de un local, también
          podés pedírselo al local, y lo ayudamos a responderte.
        </p>
        <p className="text-zinc-400 text-sm border-l-2 border-white/10 pl-3">
          El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
          gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo
          establecido en el artículo 14, inciso 3 de la Ley N° 25.326. La Agencia de Acceso a la Información Pública, en
          su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que
          interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de
          protección de datos personales.
        </p>
      </Seccion>

      <Seccion titulo="9. Cambios en esta política">
        <p>
          Si cambiamos algo importante, lo avisamos en esta página y, a los locales, por mail o desde su panel. La fecha
          de la última versión está arriba de todo. Las condiciones del servicio están en los{' '}
          <A href="/terminos">términos y condiciones</A>.
        </p>
      </Seccion>
    </PaginaLegal>
  )
}
