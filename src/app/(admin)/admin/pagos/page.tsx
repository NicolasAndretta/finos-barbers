import Link from 'next/link'
import { estaConectado, mpOAuthConfigurado } from '@/lib/mp-oauth'
import { desconectarMP } from '@/app/actions/pagos'
import { SITE } from '@/lib/site'

type SearchParams = Promise<{ mp?: string; error?: string }>

export default async function AdminPagosPage({ searchParams }: { searchParams: SearchParams }) {
  const { mp, error } = await searchParams
  const configurado = mpOAuthConfigurado()
  const conectado = configurado ? await estaConectado() : false

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Cobros online</h1>
        <p className="text-zinc-400 text-sm mt-1">Conectá tu Mercado Pago para cobrar señas y productos.</p>
      </div>

      {mp === 'ok' && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm">
          ¡Mercado Pago conectado! Ya podés cobrar online.
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
          {error === 'config'
            ? 'Falta configurar la app de Mercado Pago (MP_CLIENT_ID / MP_CLIENT_SECRET).'
            : error === 'state'
            ? 'La sesión de conexión expiró. Probá de nuevo.'
            : 'No se pudo completar la conexión. Probá de nuevo.'}
        </div>
      )}

      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#009ee3]/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#009ee3]" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
            </div>
            <div>
              <p className="text-white font-bold">Mercado Pago</p>
              <p className={`text-sm ${conectado ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {conectado ? '● Conectado' : '○ No conectado'}
              </p>
            </div>
          </div>

          {!configurado ? (
            <span className="text-xs text-zinc-500 text-right max-w-[12rem]">
              Falta cargar MP_CLIENT_ID y MP_CLIENT_SECRET en el servidor.
            </span>
          ) : conectado ? (
            <form action={async () => { 'use server'; await desconectarMP() }}>
              <button className="text-sm font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 px-4 py-2.5 rounded-lg cursor-pointer">
                Desconectar
              </button>
            </form>
          ) : (
            <Link
              href="/api/mp/oauth/connect"
              className="bg-[#009ee3] hover:bg-[#008fcf] text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors"
            >
              Conectar Mercado Pago
            </Link>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-900 text-sm text-zinc-400 space-y-2">
          <p className="text-zinc-300 font-semibold">Cómo funciona</p>
          <p>Tocás "Conectar", entrás a <strong>tu</strong> Mercado Pago y autorizás. Listo: los pagos caen directo en tu cuenta. Nunca compartís usuario ni contraseña, y podés desconectar cuando quieras.</p>
          <p className="text-zinc-500">Además seguís cobrando por transferencia (alias <span className="text-zinc-300">{SITE.aliasPago}</span>) y efectivo, sin comisión.</p>
        </div>
      </div>
    </div>
  )
}
