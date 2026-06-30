'use client'

import React, { useState, useTransition, useCallback, useEffect } from 'react'
import { adminGetProductos, adminCrearProducto, adminActualizarProducto, adminToggleProducto } from '@/app/actions/tienda'
import { Spinner } from '@/components/ui/Spinner'
import type { Producto, CategoriaProducto } from '@/types'

const CATEGORIAS: { value: CategoriaProducto; label: string }[] = [
  { value: 'cuidado-cabello', label: 'Cuidado del cabello' },
  { value: 'barba',           label: 'Barba' },
  { value: 'accesorios',      label: 'Accesorios' },
  { value: 'otros',           label: 'Otros' },
]

type FormState = {
  nombre: string
  descripcion: string
  precio: string
  stock: string
  stock_minimo: string
  imagen_url: string
  categoria: CategoriaProducto
}

const FORM_EMPTY: FormState = {
  nombre: '', descripcion: '', precio: '', stock: '', stock_minimo: '3', imagen_url: '', categoria: 'cuidado-cabello',
}

export default function AdminProductosPage() {
  const [productos, setProductos]           = useState<Producto[]>([])
  const [loading, setLoading]               = useState(true)
  const [isPending, startTransition]        = useTransition()
  const [showForm, setShowForm]             = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const [formData, setFormData]             = useState<FormState>(FORM_EMPTY)
  const [errorMsg, setErrorMsg]             = useState('')

  const loadProductos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminGetProductos()
      setProductos(data as Producto[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadProductos()
  }, [loadProductos])
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = () => {
    setFormData(FORM_EMPTY)
    setEditingProducto(null)
    setErrorMsg('')
  }

  const handleEdit = (p: Producto) => {
    setEditingProducto(p)
    setFormData({
      nombre:       p.nombre,
      descripcion:  p.descripcion,
      precio:       p.precio.toString(),
      stock:        p.stock.toString(),
      stock_minimo: (p.stock_minimo ?? 3).toString(),
      imagen_url:   p.imagen_url ?? '',
      categoria:    p.categoria,
    })
    setShowForm(true)
    setErrorMsg('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    startTransition(async () => {
      const fd = new FormData()
      fd.append('nombre',      formData.nombre)
      fd.append('descripcion', formData.descripcion)
      fd.append('precio',       formData.precio)
      fd.append('stock',        formData.stock)
      fd.append('stock_minimo', formData.stock_minimo)
      fd.append('imagen_url',   formData.imagen_url)
      fd.append('categoria',    formData.categoria)

      let res: { error?: string }
      if (editingProducto) {
        fd.append('id', editingProducto.id)
        res = await adminActualizarProducto(fd)
      } else {
        res = await adminCrearProducto(fd)
      }

      if (res.error) {
        setErrorMsg(res.error)
      } else {
        await loadProductos()
        setShowForm(false)
        resetForm()
      }
    })
  }

  const handleToggle = (id: string) => {
    startTransition(async () => {
      const res = await adminToggleProducto(id)
      if (res.error) alert(res.error)
      else await loadProductos()
    })
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Productos</h1>
          <p className="text-zinc-400 text-sm mt-1">Gestiona el catálogo de la tienda</p>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm() }}
          className="bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          + Nuevo Producto
        </button>
      </div>

      {/* Aviso de stock bajo */}
      {(() => {
        const alertas = productos.filter(p => p.activo && p.stock <= (p.stock_minimo ?? 3))
        if (alertas.length === 0) return null
        const sinStock = alertas.filter(p => p.stock === 0).length
        return (
          <div className="mb-6 flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 text-yellow-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.5 0L3.18 16.25A2 2 0 005 19z" />
            </svg>
            <p className="text-sm text-yellow-200">
              <span className="font-bold">{alertas.length}</span> producto{alertas.length !== 1 ? 's' : ''} con stock bajo
              {sinStock > 0 && <> · <span className="font-bold text-red-300">{sinStock} sin stock</span></>}.
              Reponé para no perder ventas.
            </p>
          </div>
        )
      })()}

      {/* Formulario */}
      {showForm && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-5">
            {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>

          {errorMsg && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 mb-4">
              {errorMsg}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre</label>
                <input
                  type="text" required
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Pomada para cabello"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría</label>
                <select
                  value={formData.categoria}
                  onChange={e => setFormData({ ...formData, categoria: e.target.value as CategoriaProducto })}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {CATEGORIAS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
              <textarea
                required rows={2}
                value={formData.descripcion}
                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Describe el producto..."
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Precio ($)</label>
                <input
                  type="number" required min="0" step="0.01"
                  value={formData.precio}
                  onChange={e => setFormData({ ...formData, precio: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Stock</label>
                <input
                  type="number" required min="0"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Stock mínimo
                  <span className="text-zinc-600 font-normal"> (alerta)</span>
                </label>
                <input
                  type="number" min="0"
                  value={formData.stock_minimo}
                  onChange={e => setFormData({ ...formData, stock_minimo: e.target.value })}
                  placeholder="3"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">URL imagen (opcional)</label>
              <input
                type="url"
                value={formData.imagen_url}
                onChange={e => setFormData({ ...formData, imagen_url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit" disabled={isPending}
                className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-black text-sm font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending && <Spinner className="w-4 h-4 text-black" />}
                {editingProducto ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm() }}
                className="flex-1 sm:flex-none bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8 text-amber-400" />
        </div>
      ) : productos.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-10 text-center">
          <p className="text-zinc-400">No hay productos. Crea el primero.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {productos.map(p => (
            <div
              key={p.id}
              className={`bg-zinc-950 border rounded-xl p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 ${
                p.activo ? 'border-zinc-900' : 'border-zinc-900/50 opacity-55'
              }`}
            >
              {/* Imagen / emoji */}
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0 flex items-center justify-center overflow-hidden">
                {p.imagen_url ? (
                  <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">
                    {{ 'cuidado-cabello': '✂️', barba: '🪒', accesorios: '🎒', otros: '📦' }[p.categoria] ?? '📦'}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-base font-bold text-white">{p.nombre}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    p.activo
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  }`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  {p.stock === 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-500/10 text-red-400 border-red-500/20">
                      Sin stock
                    </span>
                  ) : p.stock <= (p.stock_minimo ?? 3) ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                      Stock bajo
                    </span>
                  ) : null}
                </div>
                <p className="text-zinc-500 text-xs truncate">{p.descripcion}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-amber-400 font-bold">${p.precio}</span>
                  <span className="text-zinc-500">
                    Stock: <span className={`font-semibold ${p.stock === 0 ? 'text-red-400' : p.stock <= 3 ? 'text-yellow-400' : 'text-zinc-300'}`}>
                      {p.stock}
                    </span>
                  </span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 w-full lg:w-auto">
                <button
                  onClick={() => handleEdit(p)} disabled={isPending}
                  className="flex-1 sm:flex-none text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleToggle(p.id)} disabled={isPending}
                  className={`flex-1 sm:flex-none text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    p.activo
                      ? 'text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20'
                      : 'text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20'
                  }`}
                >
                  {isPending && <Spinner className="w-3 h-3" />}
                  {p.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
