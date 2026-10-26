import { notFound } from 'next/navigation'
import { desconectarMP } from '@/app/actions/pagos'
import { getLocal, getPermisos } from '@/lib/local'
import { AVISAR_ANTES_DIAS, estadoConexion, mpConnectConfigurado } from '@/lib/mp-conexion'

type SearchParams = Promise<{ mp?: string; error?: string }>

const ERRORES: Record<string, string> = {
  config: 'Falta configurar la aplicación de Mercado Pago en el servidor (MP_CLIENT_ID, MP_CLIENT_SECRET y la dirección del sitio).',
  state: 'La conexión se cortó o tardó demasiado. Probá de nuevo.',
  permiso: 'Solo quien administra el local puede conectar o desconectar su Mercado Pago.',
  cancelado: 'No se conectó: se canceló en Mercado Pago.',
  token: 'Mercado Pago no completó la conexión. Probá de nuevo en un rato.',
}

/**
 * Cobros online de ESTE local: su cuenta de Mercado Pago (Fase 4a).
 *
 * Lo ven todos los que entran al panel, cada uno con lo suyo:
 *  - quien administra el local (el dueño, el admin): con qué cuenta está
 *    conectado, cuándo vence, y los botones para conectar o desconectar;
 *  - la comercial: solo si está conectado o no. La cuenta del dueño es un dato
 *    privado, y conectarla le toca a él.
 */
export default async function AdminPagosPage({ params, searchParams }: { params: Promise<{ local: string }>; searchParams: SearchParams }) {
  const local = await getLocal((await params).local)
  if (!local) notFound()
  const permisos = await getPermisos(local.id)
  const { mp, error } = await searchParams

  const configurado = mpConnectConfigurado()
  const conexion = await estadoConexion(local.id)
  const enDemo = local.estado === 'demo'
  const fecha = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('es-AR', { timeZone: local.zonaHoraria, day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
  const porVencer = conexion.conectada && conexion.vigente && conexion.diasRestantes !== null && conexion.diasRestantes <= AVISAR_ANTES_DIAS

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Cobros online</h1>
        <p className="text-zinc-400 text-sm mt-1">
          El Mercado Pago de {local.nombre}, para cobrar señas y productos. La plata cae directo en esa cuenta.
        </p>
      </div>

      {mp === 'ok' && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm">
          ¡Mercado Pago conectado! Revisá abajo que la cuenta sea la correcta.
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
          {ERRORES[error] ?? 'No se pudo completar la conexión. Probá de nuevo.'}
        </div>
      )}
      {enDemo && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-sm">
          {local.nombre} está en demo: aunque haya una cuenta conectada, no se cobra nada. Las reservas y las compras son de muestra hasta que el local se active.
        </div>
      )}

      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-[#009ee3]/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#009ee3]" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="10" /></svg>
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold">Mercado Pago</p>
              {!conexion.conectada ? (
                <p className="text-sm text-zinc-500">○ No conectado</p>
              ) : !conexion.vigente ? (
                <p className="text-sm text-red-400">⚠ La conexión venció: hay que volver a conectar</p>
              ) : (
                <p className="text-sm text-emerald-400">● Conectado</p>
              )}
            </div>
          </div>

          {permisos.administra && (
            !configurado ? (
              <span className="text-xs text-zinc-500 sm:text-right sm:max-w-[14rem]">
                Falta configurar la aplicación de Mercado Pago en el servidor.
              </span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {/* Un <a> común y no <Link>: es una ruta de la API que manda a
                    Mercado Pago (otro sitio), no una página de la app. */}
                <a
                  href={`/api/mp/oauth/connect?local=${local.slug}`}
                  className="flex-1 sm:flex-none text-center bg-[#009ee3] hover:bg-[#008fcf] text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors"
                >
                  {conexion.conectada ? 'Conectar otra vez' : 'Conectar Mercado Pago'}
                </a>
                {conexion.conectada && (
                  <form action={async () => { 'use server'; await desconectarMP(local.slug) }} className="flex-1 sm:flex-none">
                    <button className="w-full text-sm font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 px-4 py-2.5 rounded-lg cursor-pointer">
                      Desconectar
                    </button>
                  </form>
                )}
              </div>
            )
          )}
        </div>

        {/* Con qué cuenta: lo ve solo quien administra el local. */}
        {permisos.administra && conexion.conectada && (
          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div className="min-w-0">
              <dt className="text-zinc-500">Cuenta</dt>
              <dd className="text-white font-semibold break-words">
                {conexion.nickname ?? 'Sin apodo'}
                {conexion.email && <span className="block text-zinc-400 font-normal">{conexion.email}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Conectada el</dt>
              <dd className="text-white">{fecha(conexion.conectadaEl) || '—'}</dd>
            </div>
            {conexion.venceEl && (
              <div>
                <dt className="text-zinc-500">Vence</dt>
                <dd className={porVencer || !conexion.vigente ? 'text-amber-300' : 'text-white'}>
                  {fecha(conexion.venceEl)}
                  {conexion.vigente && conexion.diasRestantes !== null && ` (en ${conexion.diasRestantes} ${conexion.diasRestantes === 1 ? 'día' : 'días'})`}
                </dd>
              </div>
            )}
          </dl>
        )}
        {porVencer && permisos.administra && (
          <p className="mt-4 text-xs text-amber-300">
            Se renueva sola cuando se usa. Si en estos días no hay ningún cobro, conviene tocar &quot;Conectar otra vez&quot;.
          </p>
        )}
        {!permisos.administra && (
          <p className="mt-4 text-sm text-zinc-400">
            La conexión la hace el dueño del local, con su propia cuenta, desde este mismo panel.
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-zinc-900 text-sm text-zinc-400 space-y-2">
          <p className="text-zinc-300 font-semibold">Cómo funciona</p>
          <p>Tocás &quot;Conectar&quot;, entrás a <strong>tu</strong> Mercado Pago y autorizás. Listo: los pagos caen directo en tu cuenta. Nunca compartís usuario ni contraseña, y podés desconectar cuando quieras.</p>
          {local.aliasPago && (
            <p className="text-zinc-500">Además seguís cobrando por transferencia (alias <span className="text-zinc-300">{local.aliasPago}</span>), sin comisión.</p>
          )}
        </div>
      </div>
    </div>
  )
}
