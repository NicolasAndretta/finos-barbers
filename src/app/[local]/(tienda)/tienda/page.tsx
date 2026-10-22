import { getProductos } from '@/app/actions/tienda'
import { TiendaCatalogo } from '@/components/tienda/TiendaCatalogo'
import type { Producto } from '@/types'
import { notFound } from 'next/navigation'
import { getLocal } from '@/lib/local'

export async function generateMetadata({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  return { title: `Tienda | ${local?.nombre ?? ''}` }
}

// La tienda de ESTE local: sus productos.
export default async function TiendaPage({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  if (!local) notFound()
  const productos = (await getProductos(local.slug)) as Producto[]

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Tienda</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Los productos de {local.nombre}
        </p>
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
        <TiendaCatalogo productos={productos} />
      )}
    </div>
  )
}
