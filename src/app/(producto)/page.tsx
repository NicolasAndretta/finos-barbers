/**
 * src/app/(producto)/page.tsx — la página de Retoque, en "/".
 *
 * Hasta el 04/11/2026 "/" llevaba a Roble. Ahora es la página del producto y
 * Roble es su demo en vivo. Los links viejos de la demo (/reservar, /tienda...)
 * siguen yendo a Roble (src/proxy.ts).
 *
 * Lo que dice sale del relevamiento de la competencia y de las correcciones de
 * Nico (03/11): primero los problemas de todos los días, después cómo se
 * resuelven. Nada absoluto, nada comparativo, nada que el sistema no haga hoy.
 *
 * Los planes se leen de la tabla `planes` (getPlanes): qué trae cada uno y su
 * precio no se escriben acá. El precio se puede ocultar con
 * PRODUCTO.mostrarPrecios.
 */

import Link from 'next/link'
import { getPlanes, type Plan } from '@/lib/planes'
import { PRODUCTO, whatsappProducto } from '@/lib/producto'
import { rutaLocal, type Capacidad } from '@/lib/local-datos'

/** Cómo se dice cada cosa que trae un plan (lo que trae cada uno sale de la base). */
const LO_QUE_TRAE: { capacidad: Capacidad; texto: string }[] = [
  { capacidad: 'cuentasProfesionales', texto: 'Cada profesional con su cuenta y su agenda' },
  { capacidad: 'senas', texto: 'Seña con Mercado Pago, directo a tu cuenta' },
  { capacidad: 'resenas', texto: 'Reseñas de clientes que fueron de verdad' },
  { capacidad: 'reportes', texto: 'Reportes: turnos, cancelados y los que no vinieron' },
  { capacidad: 'tienda', texto: 'Tienda con tus productos' },
  { capacidad: 'finanzas', texto: 'Caja e ingresos' },
  { capacidad: 'exportar', texto: 'Tus turnos y clientes, para descargar' },
]

/** Lo que traen todos los planes: no depende del plan, así que no está en la tabla. */
const EN_TODOS = [
  'Tu página, con tu logo y tu color',
  'Reserva online a cualquier hora',
  'Seña por transferencia',
  'Los horarios de cada profesional',
  'Turnos y calendario en tu panel',
]

function profesionales(plan: Plan): string {
  return plan.maxProfesionales === null ? 'Profesionales sin límite' : `Hasta ${plan.maxProfesionales} profesionales`
}

function Tilde() {
  return (
    <svg className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
    </svg>
  )
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <p className="text-amber-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3">{children}</p>
}

export default async function PaginaDelProducto() {
  // Si la base no responde, la página igual se ve, sin la sección de planes.
  const planes = await getPlanes().catch(() => [] as Plan[])
  const whatsapp = whatsappProducto()
  const demo = rutaLocal(PRODUCTO.localPorDefecto)

  const llamadoPrincipal = whatsapp ? (
    <a
      href={whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 px-7 py-4 text-base font-bold text-zinc-950 transition-colors shadow-lg shadow-amber-950/30"
    >
      Pedí tu muestra gratis
    </a>
  ) : (
    <Link
      href={demo}
      className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 px-7 py-4 text-base font-bold text-zinc-950 transition-colors shadow-lg shadow-amber-950/30"
    >
      Mirá la demo
    </Link>
  )
  const llamadoSegundo = whatsapp ? (
    <Link
      href={demo}
      className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-7 py-4 text-base font-semibold text-white transition-colors"
    >
      Mirá la demo
    </Link>
  ) : null

  return (
    <>
      {/* ── Arriba: qué es y el gancho ─────────────────────────── */}
      <section className="relative overflow-hidden texture-grain">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-10 items-center">
          <div className="flex flex-col items-start gap-6">
            <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/30 bg-amber-400/5 text-xs text-amber-200 font-medium tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
              Turnos online para barberías
            </p>
            <h1 className="font-display text-[2.6rem] leading-[0.98] sm:text-6xl lg:text-[4.2rem] text-white tracking-tight">
              Que tus clientes <span className="text-wood-gradient">reserven solos</span>.
            </h1>
            <p className="text-zinc-300 text-base sm:text-lg leading-relaxed max-w-xl">
              {PRODUCTO.nombre} le da a tu barbería su propia página: tus clientes eligen el servicio, el barbero y el
              horario, y dejan la seña. Vos te dedicás a cortar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {llamadoPrincipal}
              {llamadoSegundo}
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-md border-l-2 border-amber-400/60 pl-3">
              <span className="text-white font-semibold">Te armamos una muestra con el nombre de tu barbería,</span>{' '}
              gratis por 30 días.
            </p>
          </div>

          {/* La demo de verdad, en un celu: lo que ven tus clientes */}
          <div className="relative mx-auto w-[240px] sm:w-[270px] lg:w-[290px]">
            <div className="absolute -inset-10 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" aria-hidden="true" />
            <Link
              href={demo}
              aria-label="Abrir la demo: Roble, una barbería de muestra"
              className="relative block rounded-[2.4rem] border border-white/10 bg-zinc-900 px-2.5 pb-2.5 pt-7 shadow-2xl shadow-black/60 transition-transform hover:-translate-y-1"
            >
              <span className="absolute top-3 left-1/2 -translate-x-1/2 h-1.5 w-16 rounded-full bg-zinc-700" aria-hidden="true" />
              {/* Captura de la demo (public/producto): liviana y fija, no pasa por el optimizador. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/producto/roble-celu.webp"
                alt="La página de Roble, la barbería de muestra, en un celular"
                width={780}
                height={1688}
                className="block w-full h-auto rounded-[1.9rem]"
                fetchPriority="high"
              />
            </Link>
            <p className="relative text-center text-xs text-zinc-500 mt-4">
              Roble, la barbería de muestra. <span className="text-amber-400">Tocala y recorrela.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Los problemas de todos los días ─────────────────────── */}
      <section className="border-y border-white/5 bg-wood-texture">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-2xl mb-10">
            <Etiqueta>El día a día</Etiqueta>
            <h2 className="font-display text-3xl sm:text-4xl text-white leading-tight">
              Lo que te come el tiempo entre corte y corte
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {[
              {
                titulo: 'El WhatsApp a cualquier hora',
                problema: 'Te escriben a las once de la noche para el sábado, y entre corte y corte contestás mensajes.',
                solucion: 'Reservan solos desde un link que ponés en tu Instagram y en tu WhatsApp. Ven los horarios libres, sin preguntarte.',
              },
              {
                titulo: 'El que no viene',
                problema: 'Reservó, no avisó y el hueco quedó vacío. Ese turno no lo recuperás.',
                solucion: 'Pedí una seña al reservar, para que el turno se tome en serio. Y anotá quién no vino, así lo tenés registrado.',
              },
              {
                titulo: 'La agenda en un cuaderno',
                problema: 'Tachones, turnos que se pisan y solo vos sabés qué hay mañana.',
                solucion: 'La agenda en el celu, con el horario de cada barbero. El sistema no deja reservar dos turnos con el mismo barbero a la misma hora.',
              },
            ].map((c) => (
              <article key={c.titulo} className="rounded-2xl bg-zinc-950/70 border border-white/5 p-6 flex flex-col gap-4">
                <h3 className="text-lg font-bold text-white">{c.titulo}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{c.problema}</p>
                <div className="mt-auto pt-4 border-t border-white/5 flex gap-2.5">
                  <Tilde />
                  <p className="text-zinc-200 text-sm leading-relaxed">{c.solucion}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── No es un calendario: es la página de tu barbería ────── */}
      <section className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-2xl mb-10">
          <Etiqueta>Tu página</Etiqueta>
          <h2 className="font-display text-3xl sm:text-4xl text-white leading-tight">
            No es un calendario: es la página de tu barbería
          </h2>
          <p className="text-zinc-400 mt-4 leading-relaxed">
            Una dirección para compartir, con tu nombre y tu marca. Ahí tus clientes ven todo y reservan.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[
            { titulo: 'Tus servicios y precios', texto: 'Cada servicio con lo que dura y lo que sale. Lo cambiás vos desde el panel.' },
            { titulo: 'Tu equipo y sus horarios', texto: 'Cada barbero con sus días y sus horas. El cliente elige con quién atenderse.' },
            { titulo: 'La seña', texto: 'Por transferencia en todos los planes. Con Mercado Pago, la plata va directo a tu cuenta.' },
            { titulo: 'Reseñas de verdad', texto: 'Solo puede dejar una reseña quien tuvo un turno. Vos podés ocultarlas, no inventarlas.' },
            { titulo: 'Tu logo y tu color', texto: 'Subís tu logo y elegís el color de tu página. Se ve como tu barbería, no como un sistema.' },
            { titulo: 'Tienda y caja', texto: 'En el plan Premium: tus productos a la vista y la caja del local en el mismo panel.' },
          ].map((c) => (
            <div key={c.titulo} className="rounded-2xl bg-zinc-900/40 border border-white/5 p-6 hover:border-amber-400/30 transition-colors">
              <h3 className="text-base font-bold text-white">{c.titulo}</h3>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{c.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── La demo en vivo ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl w-full px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-wood-texture px-6 py-10 sm:px-12 sm:py-14 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-xl">
            <Etiqueta>La demo, en vivo</Etiqueta>
            <h2 className="font-display text-2xl sm:text-3xl text-white leading-tight">Recorré Roble, una barbería de muestra</h2>
            <p className="text-zinc-300 mt-3 leading-relaxed">
              Mirá los servicios, el equipo y las reseñas, y probá reservar un turno. Es una muestra: no se cobra nada ni se
              le avisa a nadie.
            </p>
          </div>
          <Link
            href={demo}
            className="shrink-0 inline-flex items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 px-7 py-4 text-base font-bold text-zinc-950 transition-colors"
          >
            Abrir la demo
          </Link>
        </div>
      </section>

      {/* ── Cómo arrancás: te la dejamos andando ────────────────── */}
      <section id="como-funciona" className="border-y border-white/5 bg-zinc-900/30 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-2xl mb-10">
            <Etiqueta>Cómo arrancás</Etiqueta>
            <h2 className="font-display text-3xl sm:text-4xl text-white leading-tight">Te la dejamos andando nosotros</h2>
            <p className="text-zinc-400 mt-4 leading-relaxed">
              No tenés que configurar nada solo. Lo armamos con vos, y si algo no te cierra, lo cambiamos.
            </p>
          </div>
          <ol className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {[
              {
                titulo: 'Te armamos la muestra',
                texto: 'Con el nombre de tu barbería, tus servicios y tu equipo. Gratis por 30 días.',
              },
              {
                titulo: 'La mirás desde tu celu',
                texto: 'La recorrés como la va a ver tu cliente, probás una reserva y nos decís qué cambiar.',
              },
              {
                titulo: 'Elegís tu plan y la activamos',
                texto: 'Cargamos lo que falte y te queda el link listo para compartir. Desde ahí, los turnos entran solos.',
              },
            ].map((paso, i) => (
              <li key={paso.titulo} className="rounded-2xl bg-zinc-950/60 border border-white/5 p-6">
                <p className="font-display text-3xl text-amber-400/80" aria-hidden="true">0{i + 1}</p>
                <h3 className="text-lg font-bold text-white mt-3">{paso.titulo}</h3>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Los planes (de la tabla `planes`) ───────────────────── */}
      {planes.length > 0 && (
        <section id="planes" className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-16 sm:py-24 scroll-mt-20">
          <div className="max-w-2xl mb-10">
            <Etiqueta>Planes</Etiqueta>
            <h2 className="font-display text-3xl sm:text-4xl text-white leading-tight">Elegí según tu barbería</h2>
            <p className="text-zinc-400 mt-4 leading-relaxed">
              La muestra se arma con todo, y el plan lo elegís cuando la activamos. Si después necesitás más, cambiás de
              plan sin perder nada.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
            {planes.map((plan, i) => {
              const anterior = planes[i - 1]
              const suma = LO_QUE_TRAE.filter((c) => plan[c.capacidad] && !(anterior && anterior[c.capacidad]))
              return (
                <article key={plan.codigo} className="rounded-2xl bg-zinc-900/50 border border-white/10 p-6 md:p-5 lg:p-7 flex flex-col">
                  <h3 className="text-xl font-extrabold text-white">{plan.nombre}</h3>
                  {PRODUCTO.mostrarPrecios && (
                    <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5">
                      <span className="font-display text-4xl md:text-3xl lg:text-4xl text-amber-400 whitespace-nowrap">u$s {plan.precioUsd}</span>
                      <span className="text-zinc-500 text-sm whitespace-nowrap">por mes</span>
                    </p>
                  )}
                  <p className="text-sm text-zinc-300 font-semibold mt-4">{profesionales(plan)}</p>
                  <div className="mt-5 pt-5 border-t border-white/5 flex-1">
                    <p className="text-xs uppercase tracking-[0.15em] text-zinc-500 font-semibold mb-3">
                      {anterior ? `Todo lo del ${anterior.nombre}, más:` : 'Trae:'}
                    </p>
                    <ul className="flex flex-col gap-2.5">
                      {(anterior ? [] : EN_TODOS).concat(suma.map((c) => c.texto)).map((texto) => (
                        <li key={texto} className="flex gap-2.5 text-sm text-zinc-200 leading-snug">
                          <Tilde />
                          <span>{texto}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {whatsapp && (
                    <a
                      href={whatsappProducto(`Hola! Me interesa el plan ${plan.nombre} de ${PRODUCTO.nombre} para mi barbería.`) ?? whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors"
                    >
                      Quiero el {plan.nombre}
                    </a>
                  )}
                </article>
              )
            })}
          </div>
          <p className="text-zinc-400 text-sm mt-6 leading-relaxed max-w-2xl">
            Los turnos y los clientes son de tu barbería: los descargás cuando quieras desde tu panel.
          </p>
        </section>
      )}

      {/* ── Preguntas frecuentes ────────────────────────────────── */}
      <section id="preguntas" className="border-t border-white/5 bg-zinc-900/30 scroll-mt-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
          <Etiqueta>Preguntas</Etiqueta>
          <h2 className="font-display text-3xl sm:text-4xl text-white leading-tight mb-8">Lo que todos preguntan</h2>
          <div className="flex flex-col gap-3">
            {[
              {
                p: '¿Mis clientes tienen que bajar una app?',
                r: 'No. Reservan desde el navegador del celu, con el link de tu página. Por ahora, la primera vez se registran con su mail.',
              },
              {
                p: '¿Cobran comisión por turno?',
                r: `No. Pagás el plan por mes. Si cobrás la seña con Mercado Pago, la plata va a tu cuenta y Mercado Pago cobra su comisión, como en cualquier cobro.`,
              },
              {
                p: '¿Cómo cobro la seña?',
                r: 'Por transferencia, en todos los planes: tu cliente ve tu alias y vos marcás la seña como recibida. Con Mercado Pago (desde el plan Pro), se paga al reservar y queda registrada sola.',
              },
              {
                p: '¿Sirve si somos varios barberos?',
                r: planes.length
                  ? `Sí, cada uno con sus horarios. ${planes.map((pl) => `${pl.nombre}: ${profesionales(pl).toLowerCase()}`).join('. ')}.`
                  : 'Sí, cada uno con sus horarios.',
              },
              {
                p: '¿Puedo pasar los turnos que ya tengo?',
                r: 'Sí. Los que ya tenés se cargan desde el panel, y los nuevos entran solos.',
              },
              {
                p: '¿Puedo poner mi logo?',
                r: 'Sí, en todos los planes. Subís tu logo y elegís el color de tu página.',
              },
              {
                p: '¿Qué pasa si dejo de pagar?',
                r: 'Tu página se suspende: deja de verse y de tomar turnos. Tus datos no se borran en ese momento, y antes de irte podés descargar tus turnos y tus clientes.',
              },
              {
                p: '¿Puedo dar de baja cuando quiera?',
                r: 'Sí. Lo pedís desde el «Botón de baja», al pie de esta página, por el mismo medio por el que contrataste o escribiéndonos.',
              },
            ].map((f) => (
              <details key={f.p} className="group rounded-2xl bg-zinc-950/60 border border-white/5 open:border-amber-400/25">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 px-5 py-4 text-white font-semibold [&::-webkit-details-marker]:hidden">
                  <span>{f.p}</span>
                  <span className="text-amber-400 text-xl leading-none transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="px-5 pb-5 -mt-1 text-zinc-400 text-sm leading-relaxed">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cierre: el gancho otra vez ──────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24 text-center flex flex-col items-center gap-6">
          <h2 className="font-display text-3xl sm:text-5xl text-white leading-tight">
            Te armamos una muestra con el nombre de <span className="text-wood-gradient">tu barbería</span>
          </h2>
          <p className="text-zinc-300 leading-relaxed max-w-xl">Gratis por 30 días. Te la dejamos andando nosotros.</p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
            {llamadoPrincipal}
            {llamadoSegundo}
          </div>
        </div>
      </section>
    </>
  )
}
