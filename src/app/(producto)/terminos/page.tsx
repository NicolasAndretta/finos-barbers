/**
 * /terminos — los términos y condiciones de Retoque.
 *
 * ⚠️ BORRADOR del 04/11/2026, para revisar con un abogado o un contador antes
 * de vender (docs/PASE-RETOQUE.md). Se apoya en la Ley 24.240 de defensa del
 * consumidor (art. 10 ter: la baja por el mismo medio; art. 34: los 10 días
 * para arrepentirse), el Código Civil y Comercial (art. 1110) y la Disposición
 * 954/2025 de la Subsecretaría de Defensa del Consumidor (los botones de
 * arrepentimiento y de baja, que reemplazó a las resoluciones 424/2020 y
 * 316/2018).
 */

import type { Metadata } from 'next'
import { PRODUCTO } from '@/lib/producto'
import { A, DatosDelTitular, MailDeContacto, PaginaLegal, Seccion } from '@/components/producto/Legal'

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: `Las condiciones para usar ${PRODUCTO.nombre}, la plataforma de turnos online para barberías.`,
}

export default function Terminos() {
  const n = PRODUCTO.nombre
  return (
    <PaginaLegal
      titulo="Términos y condiciones"
      bajada={`Las reglas para usar ${n}, contadas en simple. Si algo no queda claro, escribinos antes de contratar.`}
    >
      <Seccion titulo="1. Quién presta el servicio">
        <p>{n} es un producto de {PRODUCTO.marca}. El servicio lo presta:</p>
        <DatosDelTitular />
      </Seccion>

      <Seccion titulo={`2. Qué es ${n}`}>
        <p>
          {n} es una plataforma para que barberías y otros locales que trabajan con turnos tengan su propia página, donde
          sus clientes reservan. Según el plan, trae también señas, reseñas, reportes, tienda y caja.
        </p>
        <p>Hay dos tipos de usuarios:</p>
        <ul>
          <li><strong>El local:</strong> quien contrata {n} para su negocio (el dueño y su equipo).</li>
          <li><strong>Los clientes del local:</strong> las personas que reservan un turno en la página de un local.</li>
        </ul>
        <p>
          {n} no presta los servicios del local (cortes, tratamientos, productos). El acuerdo por esos servicios es entre
          el local y su cliente.
        </p>
      </Seccion>

      <Seccion titulo="3. La muestra gratis">
        <ul>
          <li>Antes de contratar, armamos una muestra con el nombre del local, sin costo y sin obligación de contratar.</li>
          <li>Dura 30 días. Si no se activa, se archiva sola: deja de verse, y se puede volver a abrir.</li>
          <li>En una muestra las reservas y las compras son de prueba: no se cobran ni se avisan por mail.</li>
        </ul>
      </Seccion>

      <Seccion titulo="4. Planes y precios">
        <ul>
          <li>Los planes y lo que trae cada uno están en <A href="/#planes">la página de {n}</A>.</li>
          <li>El precio y la forma de pago se informan y se acuerdan antes de activar el local.</li>
          <li>
            Si el precio cambia, avisamos con al menos 30 días de anticipación. Si no estás de acuerdo, podés dar de baja
            el servicio antes de que rija el precio nuevo.
          </li>
          <li>Se puede cambiar de plan cuando se quiera. Bajar de plan no borra nada: lo que el plan nuevo no trae queda guardado, sin verse.</li>
        </ul>
      </Seccion>

      <Seccion titulo="5. Lo que le toca al local">
        <ul>
          <li>Que lo que carga sea cierto: servicios, precios, horarios, dirección y datos de cobro.</li>
          <li>Tener derecho a usar el logo, las fotos y los textos que sube.</li>
          <li>
            Su relación con sus clientes: la atención, las cancelaciones, su política de señas y las devoluciones. Las
            dudas o reclamos sobre un turno se resuelven con el local.
          </li>
          <li>Cuidar las claves de su cuenta y las de su equipo.</li>
          <li>Tratar los datos de sus clientes según la <A href="/privacidad">política de privacidad</A> y la Ley 25.326.</li>
        </ul>
      </Seccion>

      <Seccion titulo="6. Señas y cobros">
        <ul>
          <li>
            <strong>Con Mercado Pago</strong> (según el plan): el cliente paga en Mercado Pago y la plata va directo a la
            cuenta del local. {n} no recibe ni guarda ese dinero, y no ve los datos de la tarjeta. Rigen las condiciones y
            las comisiones de Mercado Pago.
          </li>
          <li><strong>Por transferencia:</strong> el pago es directo entre el cliente y el local, que lo marca como recibido.</li>
          <li>{n} no cobra comisión por turno.</li>
          <li>Las devoluciones de una seña o de una compra las decide y las hace el local.</li>
        </ul>
      </Seccion>

      <Seccion titulo="7. Para quien reserva un turno">
        <ul>
          <li>Para reservar, hoy se crea una cuenta con nombre, apellido y mail.</li>
          <li>Al reservar, el local recibe tus datos para atenderte y gestionar tu turno.</li>
          <li>Podés cancelar desde &ldquo;Mis turnos&rdquo; mientras el turno no haya pasado. Si dejaste una seña, rige la política del local.</li>
          <li>
            Podés dejar una reseña de un turno al que fuiste. Tiene que ser verdadera y respetuosa: el local puede
            ocultarla, y nosotros podemos sacar una reseña que sea ofensiva o ilegal.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="8. Funcionamiento y responsabilidad">
        <ul>
          <li>
            Trabajamos para que {n} ande siempre, pero puede haber cortes por mantenimiento o por fallas de los servicios
            de los que depende (internet, alojamiento, Mercado Pago, mail). Cuando un corte sea programado, avisamos antes.
          </li>
          <li>No somos parte de lo que se acuerde entre el local y sus clientes.</li>
          <li>Nada de esto limita los derechos que te da la Ley 24.240 de defensa del consumidor, si te corresponden.</li>
        </ul>
      </Seccion>

      <Seccion titulo="9. Tus datos">
        <ul>
          <li>Cómo tratamos los datos personales está en la <A href="/privacidad">política de privacidad</A>.</li>
          <li>Los turnos y los clientes son del local: los descarga cuando quiera desde su panel.</li>
        </ul>
      </Seccion>

      <Seccion titulo="10. Arrepentimiento">
        <p>
          Si contrataste a distancia (por internet, por teléfono o fuera de un local comercial), tenés 10 días corridos
          desde que contrataste para arrepentirte, sin costo y sin dar explicaciones (Ley 24.240, art. 34, y Código Civil y
          Comercial, art. 1110). Lo pedís desde el <A href="/arrepentimiento">botón de arrepentimiento</A>, sin registrarte.
          Te confirmamos la solicitud con un código dentro de las 24 horas.
        </p>
      </Seccion>

      <Seccion titulo="11. Baja">
        <ul>
          <li>
            Podés dar de baja el servicio cuando quieras, por el mismo medio por el que lo contrataste (Ley 24.240, art.
            10 ter), desde el <A href="/baja">botón de baja</A> o escribiéndonos. Te confirmamos la baja con un código
            dentro de las 24 horas.
          </li>
          <li>Desde la baja no se cobran nuevos períodos.</li>
          <li>
            La página del local se suspende: deja de verse y de tomar turnos. Antes de irte, descargá tus turnos y tus
            clientes desde el panel. Pasados 90 días de la baja podemos borrar los datos del local, salvo lo que la ley nos
            obligue a guardar.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="12. Cuándo podemos suspender un local">
        <p>
          Si no se paga el plan, si se usa {n} para algo ilegal o engañoso, o si se pone en riesgo a otros usuarios.
          Salvo urgencia, avisamos antes y damos un plazo para resolverlo.
        </p>
      </Seccion>

      <Seccion titulo="13. La marca y el sistema">
        <p>
          El sistema y la marca {n} son del titular. El local conserva su marca, su logo, sus fotos y sus textos, y nos
          permite mostrarlos en su página mientras use el servicio.
        </p>
      </Seccion>

      <Seccion titulo="14. Cambios en estos términos">
        <p>
          Si cambiamos algo importante, avisamos a los locales por mail o desde su panel con al menos 30 días de
          anticipación. La fecha de la última versión está arriba de todo.
        </p>
      </Seccion>

      <Seccion titulo="15. Ley aplicable y reclamos">
        <p>
          Rigen las leyes de la República Argentina. Si sos consumidor, podés reclamar ante la autoridad de defensa del
          consumidor y ante los tribunales de tu domicilio.
        </p>
      </Seccion>

      <Seccion titulo="16. Contacto">
        <p>
          Por cualquier consulta o reclamo: <MailDeContacto />.
        </p>
      </Seccion>
    </PaginaLegal>
  )
}
