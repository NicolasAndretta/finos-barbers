/**
 * Las piezas de las páginas legales de Retoque (/terminos, /privacidad,
 * /arrepentimiento y /baja).
 *
 * Los datos del titular salen de PRODUCTO.titular. Mientras uno sea
 * provisorio (va entre corchetes), se ve resaltado para que no pase
 * desapercibido: lo completa Nico (docs/PASE-RETOQUE.md). Uno vacío (hoy, el
 * domicilio) no se muestra.
 */

import Link from 'next/link'
import { PRODUCTO, esProvisorio } from '@/lib/producto'

/** Un dato del titular: resaltado mientras sea provisorio. */
export function Dato({ valor }: { valor: string }) {
  if (!esProvisorio(valor)) return <span className="text-white">{valor}</span>
  return (
    <mark className="bg-amber-400/15 text-amber-200 border border-dashed border-amber-400/60 rounded px-1.5 py-0.5 font-semibold">
      {valor}
    </mark>
  )
}

/** El mail de contacto: como link, salvo que todavía sea provisorio. */
export function MailDeContacto() {
  const { mail } = PRODUCTO.titular
  if (esProvisorio(mail)) return <Dato valor={mail} />
  return (
    <a href={`mailto:${mail}`} className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
      {mail}
    </a>
  )
}

/** Quién presta el servicio, con todos sus datos. */
export function DatosDelTitular() {
  const t = PRODUCTO.titular
  return (
    <ul className="flex flex-col gap-1.5">
      <li>Titular: <Dato valor={t.nombre} /></li>
      <li>CUIT: <Dato valor={t.cuit} /></li>
      {t.domicilio && <li>Domicilio: <Dato valor={t.domicilio} /></li>}
      <li>Mail: <MailDeContacto /></li>
      <li>Atención: <Dato valor={t.horarioAtencion} /></li>
    </ul>
  )
}

/** El armazón de una página legal: título, fecha y el texto con su estilo. */
export function PaginaLegal({ titulo, bajada, children }: { titulo: string; bajada?: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl w-full px-4 sm:px-6 py-12 sm:py-16">
      <p className="text-amber-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3">{PRODUCTO.nombre}</p>
      <h1 className="font-display text-3xl sm:text-5xl text-white leading-tight">{titulo}</h1>
      {bajada && <p className="text-zinc-300 mt-4 leading-relaxed">{bajada}</p>}
      <p className="text-zinc-500 text-sm mt-4">Última actualización: {PRODUCTO.legalesActualizados}</p>
      <div className="legal mt-10 flex flex-col gap-8 text-zinc-300 text-[15px] leading-relaxed">{children}</div>
    </article>
  )
}

/** Una sección numerada de una página legal. */
export function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg sm:text-xl font-bold text-white">{titulo}</h2>
      {children}
    </section>
  )
}

/** Los links legales que van al pie de la página del producto y en el login. */
export const LINKS_LEGALES = [
  { href: '/terminos', texto: 'Términos y condiciones' },
  { href: '/privacidad', texto: 'Política de privacidad' },
] as const

/** Un link dentro del texto legal. */
export function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
      {children}
    </Link>
  )
}
