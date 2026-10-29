/**
 * /plataforma/<local> — la ficha de un local (Fase 6): el link para mostrarlo,
 * la lista de lo que necesita para activarse, los dueños y los botones de
 * estado. Cada botón llama a una función de la base que revisa otra vez quién
 * la usa (migración 0014): esconder un botón acá no es lo que protege.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getResumenLocales, loQueFalta, requireEquipo } from '@/lib/plataforma'
import { RUBROS } from '@/lib/plantillas'
import { urlPublica } from '@/lib/sitio'
import { rutaLocal } from '@/lib/local-datos'
import { PRODUCTO } from '@/lib/producto'
import { EstadoLocal } from '@/components/plataforma/Insignias'
import { Activar, CambiarEstado, CompartirLink, Duenos } from './Acciones'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ nueva?: string; activado?: string; cambio?: string }> }

/** Lo que se avisa después de cambiar el estado desde "Estado" (más abajo). */
const AVISO_DEL_CAMBIO: Record<string, string> = {
  archivado: 'Archivada. El link ya no anda: muestra "Esta página ya no está disponible". La podés revivir cuando quieras.',
  demo: 'Revivida: el link vuelve a andar, con todo lo que tenía, por 30 días más.',
  suspendido: 'Suspendido: su página dejó de tomar reservas. Él sigue entrando a su panel.',
  activo: 'Reactivado: su página vuelve a tomar reservas.',
}

export default async function FichaDelLocal({ params, searchParams }: Props) {
  const { slug } = await params
  const { nueva, activado, cambio } = await searchParams
  // A la vez: el resumen, para quien no es del equipo, viene vacío.
  const [{ rol }, locales] = await Promise.all([requireEquipo(`/plataforma/${slug}`), getResumenLocales()])
  const local = locales.find((l) => l.slug === slug)
  if (!local) notFound()

  const link = `${urlPublica() ?? ''}/${local.slug}`
  const { obligatorio } = loQueFalta(local)
  const rubro = RUBROS.find((r) => r.valor === local.rubro)?.nombre ?? local.rubro
  const panel = (ruta: string) => rutaLocal(local.slug, `/admin/${ruta}`)
  const manejaDuenos = rol === 'admin' || local.estado === 'demo'
  // La muestra del producto (a ella lleva "/"): no se activa ni se archiva.
  const esLaDelProducto = local.slug === PRODUCTO.localPorDefecto

  return (
    <>
      <div className="flex flex-col gap-4">
        <Link href="/plataforma" className="text-sm text-zinc-500 hover:text-white">← Locales</Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold text-white tracking-tight break-words">{local.nombre}</h1>
              <EstadoLocal estado={local.estado} />
            </div>
            <p className="text-zinc-500 text-sm mt-1">/{local.slug} · {rubro}{local.creadoPor ? ` · la creó ${local.creadoPor}` : ''}</p>
          </div>
          <div className="flex gap-2">
            <Link href={rutaLocal(local.slug)} target="_blank" className="flex-1 sm:flex-none text-center text-sm font-semibold border border-zinc-800 hover:border-zinc-600 text-white rounded-lg px-4 py-2.5">Ver la página ↗</Link>
            <Link href={panel('dashboard')} className="flex-1 sm:flex-none text-center text-sm font-semibold bg-white hover:bg-zinc-200 text-zinc-950 rounded-lg px-4 py-2.5">Su panel</Link>
          </div>
        </div>
      </div>

      {nueva && local.estado === 'demo' && !cambio && (
        <p role="status" className="text-sm rounded-lg px-4 py-3 border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
          ¡Muestra creada! Ya se puede mostrar. Revisá precios y nombres desde su panel cuando quieras.
        </p>
      )}

      {cambio === local.estado && AVISO_DEL_CAMBIO[local.estado] && (
        <p role="status" className="text-sm rounded-lg px-4 py-3 border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
          {AVISO_DEL_CAMBIO[local.estado]}
        </p>
      )}

      {activado !== undefined && local.estado === 'activo' && (
        <p role="status" className="text-sm rounded-lg px-4 py-3 border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
          ¡Activado! Se borraron {Number(activado) || 0} turno(s) de prueba. Desde ahora: sin cartel de Muestra, Google la puede encontrar y salen los mails.
        </p>
      )}

      {(local.estado === 'demo' || local.estado === 'activo') && (
        <Seccion titulo={local.estado === 'demo' ? 'Para mostrarla' : 'Su página'}>
          <CompartirLink link={link} nombre={local.nombre} muestra={local.estado === 'demo'} />
        </Seccion>
      )}

      {local.estado === 'demo' && !esLaDelProducto && (
        <Seccion titulo="Para activarla" detalle="Con el dueño al lado: revisan juntos lo de abajo, lo invitás, conecta su Mercado Pago desde su celular, y se activa.">
          <ul className="flex flex-col divide-y divide-zinc-900">
            <Paso ok={local.servicios > 0} texto={`Servicios y precios (${local.servicios})`} href={panel('servicios')} />
            <Paso ok={local.profesionales > 0} texto={`Quiénes atienden (${local.profesionales})`} href={panel('barberos')} />
            <Paso ok={local.tramosHorario > 0} texto="Horario" href={panel('horarios')} />
            <Paso ok={local.tieneWhatsapp && local.tieneDireccion} texto="WhatsApp y dirección" href={panel('local')} opcional />
            <Paso ok={local.duenos > 0} texto="El dueño (abajo)" />
            <Paso ok={local.mpConectado} texto="Su Mercado Pago (lo conecta el dueño, desde su panel → Cobros)" opcional />
          </ul>
        </Seccion>
      )}

      <Seccion titulo="Dueños">
        <Duenos
          slug={local.slug}
          nombreLocal={local.nombre}
          duenos={local.duenosDetalle}
          cantidad={local.duenos}
          puedeManejar={manejaDuenos}
        />
      </Seccion>

      {local.estado === 'demo' && !esLaDelProducto && (
        <Seccion titulo="Activar" detalle="Se borra lo de prueba (turnos, pedidos, caja y clientes de prueba), se va el cartel de Muestra, Google la puede encontrar y empiezan a salir los mails.">
          <Activar slug={local.slug} faltan={obligatorio} turnosDePrueba={local.turnosDePrueba ?? 0} />
        </Seccion>
      )}

      <Seccion titulo="Estado">
        {esLaDelProducto ? (
          <p className="text-sm text-zinc-400">Es la muestra del producto (la dirección sola lleva acá): no se activa ni se archiva.</p>
        ) : (
          <CambiarEstado slug={local.slug} estado={local.estado} esAdmin={rol === 'admin'} muestraHasta={local.muestraHasta} />
        )}
      </Seccion>
    </>
  )
}

function Seccion({ titulo, detalle, children }: { titulo: string; detalle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 sm:p-6">
      <h2 className="text-xl font-bold text-white">{titulo}</h2>
      {detalle ? <p className="text-zinc-500 text-sm mt-1 mb-5">{detalle}</p> : <div className="mb-4" />}
      {children}
    </section>
  )
}

function Paso({ ok, texto, href, opcional }: { ok: boolean; texto: string; href?: string; opcional?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <span className="flex items-center gap-3 min-w-0">
        <span aria-hidden className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${ok ? 'bg-emerald-500/15 text-emerald-400' : opcional ? 'bg-zinc-800 text-zinc-500' : 'bg-red-500/15 text-red-400'}`}>
          {ok ? '✓' : opcional ? '·' : '!'}
        </span>
        <span className="text-sm text-zinc-200">
          {texto}
          {!ok && opcional && <span className="text-zinc-500"> (recomendado)</span>}
          <span className="sr-only">{ok ? ': listo' : ': falta'}</span>
        </span>
      </span>
      {href && <Link href={href} className="shrink-0 text-xs font-semibold text-amber-400 hover:text-amber-300">Revisar</Link>}
    </li>
  )
}
