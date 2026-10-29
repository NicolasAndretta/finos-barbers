import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireProfile } from '@/lib/auth'
import { getLocal } from '@/lib/local'
import { rutaLocal } from '@/lib/local-datos'
import { createClient } from '@/lib/supabase'
import { leerReferencia, verificarPago } from '@/lib/cobros'
import { getTurnosCliente } from '@/app/actions/reservas'
import { TurnoCard } from '@/components/client/TurnoCard'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const uno = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')

// Los turnos del cliente en ESTE local.
export default async function TurnosPage({ params, searchParams }: { params: Promise<{ local: string }>; searchParams: SearchParams }) {
  const local = await getLocal((await params).local)
  if (!local) notFound()
  const resolvedParams = await searchParams
  const pagoId = uno(resolvedParams.payment_id)
  // Sin vuelta de Mercado Pago, los turnos se piden junto con el perfil. Con
  // vuelta, después de verificar el pago (que puede cambiar la seña).
  const [profile, turnosDeEntrada] = await Promise.all([
    requireProfile(rutaLocal(local.slug, '/turnos')),
    pagoId ? null : getTurnosCliente(local.slug),
  ])

  // Vuelta de Mercado Pago después de pagar la seña. Lo que trae la dirección
  // (estado, número de pago) NO se cree: cualquiera la puede escribir a mano.
  // Se le pregunta el pago a Mercado Pago con la cuenta del local (la misma
  // verificación que hace el aviso de pago, lib/cobros.ts) y lo que se muestra
  // sale de la base. Si Mercado Pago no contesta, el aviso lo termina después.
  let aviso: 'pagada' | 'confirmando' | null = null
  if (pagoId) {
    const verificado = await verificarPago(local.id, pagoId)
    // Si Mercado Pago no pudo contestar, la referencia de la dirección sirve
    // para mostrar "estamos confirmando" (no cambia nada, y solo se lee un
    // turno propio). Si contestó que ese pago no es de acá, no se muestra nada.
    const referencia = verificado.referencia
      ?? (verificado.resultado === 'reintentar' ? leerReferencia(uno(resolvedParams.external_reference)) : null)
    if (referencia?.tipo === 'turno') {
      const supabase = await createClient()
      const { data: turno } = await supabase
        .from('turnos')
        .select('sena_estado')
        .eq('id', referencia.id)
        .eq('local_id', local.id)
        .eq('cliente_id', profile.id)
        .maybeSingle()
      if (turno) aviso = turno.sena_estado === 'pagada' ? 'pagada' : 'confirmando'
    }
  }

  const isSuccess = resolvedParams.reserva === 'success' || aviso === 'pagada'
  const turnos = turnosDeEntrada ?? await getTurnosCliente(local.slug)

  return (
    <div className="flex flex-col items-center justify-start pb-12 animate-fade-in w-full max-w-3xl mx-auto">
      {aviso === 'confirmando' && (
        <div className="mb-8 w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-sm">
          <p className="font-bold">Estamos confirmando el pago de tu seña.</p>
          <p className="text-amber-200/80 text-xs mt-1">Si ya pagaste, en unos minutos tu turno aparece confirmado. No hace falta que pagues de nuevo.</p>
        </div>
      )}
      {isSuccess && (
        <div className="mb-8 w-full p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-400 text-sm flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-bold">{aviso === 'pagada' ? '¡Seña pagada! Tu turno quedó confirmado.' : '¡Reserva confirmada con éxito!'}</p>
              <p className="text-emerald-500/80 text-xs">Te mandamos los detalles por mail.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 text-center sm:text-left w-full flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Mis Turnos</h1>
          <p className="mt-2 text-zinc-400 text-sm">
            Mirá tus próximos turnos o el historial.
          </p>
        </div>
        <Link
          href={rutaLocal(local.slug, '/reservar')}
          className="bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-amber-500/20"
        >
          Nuevo Turno
        </Link>
      </div>

      <div className="w-full space-y-4">
        {turnos.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-zinc-400 font-medium">Todavía no tenés turnos en {local.nombre}.</p>
            <p className="text-sm text-zinc-500 mt-1">¡Reservá el primero!</p>
          </div>
        ) : (
          turnos.map((turno) => (
            <TurnoCard key={turno.id} turno={{
              ...turno,
              barberos: Array.isArray(turno.barberos) ? turno.barberos[0] ?? { nombre: '', apellido: '' } : turno.barberos,
              servicios: Array.isArray(turno.servicios) ? turno.servicios[0] ?? { nombre: '', duracion_minutos: 0, precio: 0 } : turno.servicios,
            } as { id: string; fecha: string; hora: string; estado: string; barberos: { nombre: string; apellido: string }; servicios: { nombre: string; duracion_minutos: number; precio: number } }} />
          ))
        )}
      </div>
    </div>
  )
}
