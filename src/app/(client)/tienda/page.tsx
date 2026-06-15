import { getProductos } from '@/app/actions/tienda'
import { TiendaCatalogo } from '@/components/tienda/TiendaCatalogo'
import type { Producto } from '@/types'

export const metadata = {
  title: 'Tienda | Finos Barbers',
  description: 'Productos para el cuidado de cabello y barba',
}

export default async function TiendaPage() {
  const productos = (await getProductos()) as Producto[]

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Tienda</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Productos premium para el cuidado de tu cabello y barba
        </p>
      </div>

      {productos.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🛒</span>
          </div>
          <p className="text-zinc-400 font-medium">La tienda está en construcción</p>
          <p className="text-zinc-600 text-sm mt-1">Pronto encontrarás los mejores productos aquí</p>
        </div>
      ) : (
        <TiendaCatalogo productos={productos} />
      )}
    </div>
  )
}
