import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { getProfile } from '@/lib/auth'
import { getLocal } from '@/lib/local'
import { rutaLocal, whatsappLink } from '@/lib/local-datos'
import { modoDeCobro } from '@/lib/cobros'

export async function generateMetadata({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  return { title: `Checkout | ${local?.nombre ?? ''}` }
}

export default async function CheckoutPage({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  if (!local) notFound()
  const [profile, cobro] = await Promise.all([getProfile(), modoDeCobro(local)])

  // Sin Mercado Pago la tienda es un catálogo: no hay checkout (llegar acá es
  // por un link viejo o escrito a mano).
  if (cobro === 'sin_mercadopago') {
    return (
      <div className="w-full py-16 text-center">
        <h1 className="text-2xl font-extrabold text-white">Esta tienda todavía no cobra online</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-sm mx-auto">
          {local.whatsapp ? 'Consultá por WhatsApp lo que quieras llevar: te lo reservan y lo pagás en el local.' : 'Consultá en el local lo que quieras llevar.'}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          {local.whatsapp && (
            <a href={whatsappLink(local)} target="_blank" rel="noopener noreferrer"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm px-6 py-3 rounded-xl transition-colors">
              Escribir por WhatsApp
            </a>
          )}
          <Link href={rutaLocal(local.slug, '/tienda')}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors border border-zinc-700">
            Volver a la tienda
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Checkout</h1>
        <p className="text-zinc-400 text-sm mt-1">Revisá tu pedido y elegí cómo recibirlo</p>
      </div>

      <CheckoutForm loggedIn={!!profile} muestra={cobro === 'muestra'} />
    </div>
  )
}
