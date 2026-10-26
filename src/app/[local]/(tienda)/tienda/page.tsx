import { getProductos } from '@/app/actions/tienda'
import { TiendaCatalogo } from '@/components/tienda/TiendaCatalogo'
import type { Producto } from '@/types'
import { notFound } from 'next/navigation'
import { getLocal } from '@/lib/local'
import { modoDeCobro } from '@/lib/cobros'

export async function generateMetadata({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  return { title: `Tienda | ${local?.nombre ?? ''}` }
}

// La tienda de ESTE local: sus productos. Si el local no cobra online, es un
// catálogo: cada producto se consulta por WhatsApp.
export default async function TiendaPage({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  if (!local) notFound()
  const [lista, cobro] = await Promise.all([getProductos(local.slug), modoDeCobro(local)])
  const productos = lista as Producto[]
  const catalogo = cobro === 'sin_mercadopago'

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Tienda</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Los productos de {local.nombre}
        </p>
        {catalogo && productos.length > 0 && (
          <p className="text-zinc-300 text-sm mt-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            {local.whatsapp
              ? 'Para comprar, consultá por WhatsApp: te lo reservan y lo pagás en el local.'
              : 'Para comprar, consultá en el local.'}
          </p>
        )}
      </div>

      {productos.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🛒</span>
          </div>
          <p className="text-zinc-400 font-medium">La tienda está en construcción</p>
          <p className="text-zinc-600 text-sm mt-1">Pronto vas a encontrar los productos acá</p>
        </div>
      ) : (
        <TiendaCatalogo productos={productos} catalogo={catalogo} />
      )}
    </div>
  )
}
