'use client'

import React, { useState, useTransition, useCallback, useEffect, useMemo } from 'react'
import {
  adminGetTransacciones,
  adminCrearTransaccion,
  adminActualizarTransaccion,
  adminEliminarTransaccion,
} from '@/app/actions/finanzas'
import { FinanzasCharts } from '@/components/admin/FinanzasCharts'
import { Spinner } from '@/components/ui/Spinner'
import type { Transaccion, TipoTransaccion } from '@/types'

// ─── Constantes ───────────────────────────────────────────────────────────────

const MES_NOMBRES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const CATEGORIAS: Record<TipoTransaccion, { value: string; label: string }[]> = {
  ingreso: [
    { value: 'servicios', label: 'Servicios / Cortes' },
    { value: 'productos', label: 'Venta de productos' },
    { value: 'otro',      label: 'Otro ingreso' },
  ],
  egreso: [
    { value: 'insumos',            label: 'Insumos y materiales' },
    { value: 'alquiler',           label: 'Alquiler' },
    { value: 'sueldos',            label: 'Sueldos y comisiones' },
    { value: 'servicios-publicos', label: 'Servicios (luz, agua, internet)' },
    { value: 'marketing',          label: 'Marketing y publicidad' },
    { value: 'mantenimiento',      label: 'Mantenimiento' },
    { value: 'otro',               label: 'Otro gasto' },
  ],
}

const CATEGORIA_LABELS: Record<string, string> = {
  servicios:            'Servicios',
  productos:            'Productos',
  insumos:              'Insumos',
  alquiler:             'Alquiler',
  sueldos:              'Sueldos',
  'servicios-publicos': 'Servicios públicos',
  marketing:            'Marketing',
  mantenimiento:        'Mantenimiento',
  otro:                 'Otro',
}

const ORIGEN_META: Record<string, { label: string; cls: string }> = {
  turno:  { label: 'Turno',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  pedido: { label: 'Tienda', cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  manual: { label: 'Manual', cls: 'bg-zinc-800 text-zinc-500 border-zinc-700' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localHoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseFechaLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatFecha(iso: string): string {
  return parseFechaLocal(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatMonto(n: number): string {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Tipos locales ────────────────────────────────────────────────────────────

type FormState = {
  tipo:        TipoTransaccion
  categoria:   string
  monto:       string
  descripcion: string
  fecha:       string
}

type FiltroTipo = 'todos' | 'ingreso' | 'egreso'
type Tab        = 'dashboard' | 'transacciones'

const FORM_VACIO = (): FormState => ({
  tipo: 'ingreso', categoria: 'servicios', monto: '', descripcion: '', fecha: localHoy(),
})

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, valor, signo, color }: {
  label: string; valor: number; signo?: boolean
  color: 'emerald' | 'red' | 'amber' | 'auto'
}) {
  const colorClass =
    color === 'auto'    ? (valor >= 0 ? 'text-emerald-400' : 'text-red-400') :
    color === 'emerald' ? 'text-emerald-400' :
    color === 'red'     ? 'text-red-400'     : 'text-amber-400'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-2">
      <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider leading-tight">{label}</span>
      <span className={`text-2xl font-black tabular-nums ${colorClass}`}>
        {signo && valor > 0 ? '+' : ''}{formatMonto(valor)}
      </span>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminFinanzasPage() {
  const [transacciones, setTransacciones]     = useState<Transaccion[]>([])
  const [loading, setLoading]                 = useState(true)
  const [isPending, startTransition]          = useTransition()
  const [tab, setTab]                         = useState<Tab>('dashboard')
  const [showForm, setShowForm]               = useState(false)
  const [editingId, setEditingId]             = useState<string | null>(null)
  const [formData, setFormData]               = useState<FormState>(FORM_VACIO)
  const [errorMsg, setErrorMsg]               = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [mesActual, setMesActual]             = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [filtroTipo, setFiltroTipo]           = useState<FiltroTipo>('todos')

  // ── Carga ──────────────────────────────────────────────────────────────────

  const loadTransacciones = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminGetTransacciones()
      setTransacciones(data as Transaccion[])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { loadTransacciones() }, [loadTransacciones])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Filtros y KPIs ────────────────────────────────────────────────────────

  const transaccionesMes = useMemo(() =>
    transacciones.filter(t => {
      const f = parseFechaLocal(t.fecha)
      return f.getFullYear() === mesActual.year && f.getMonth() === mesActual.month
    }),
    [transacciones, mesActual]
  )

  const transaccionesFiltradas = useMemo(() =>
    transaccionesMes.filter(t => filtroTipo === 'todos' || t.tipo === filtroTipo),
    [transaccionesMes, filtroTipo]
  )

  const kpis = useMemo(() => {
    const ing = transaccionesMes.filter(t => t.tipo === 'ingreso').reduce((a, t) => a + t.monto, 0)
    const egr = transaccionesMes.filter(t => t.tipo === 'egreso').reduce((a, t) => a + t.monto, 0)
    const tot = transacciones.reduce((a, t) => t.tipo === 'ingreso' ? a + t.monto : a - t.monto, 0)
    return { ingresos: ing, egresos: egr, balance: ing - egr, total: tot }
  }, [transaccionesMes, transacciones])

  // ── Datos para gráficos ───────────────────────────────────────────────────

  const chartData = useMemo(() => {
    const ahora = new Date()

    // Últimos 6 meses para el bar chart
    const ultimos6Meses = Array.from({ length: 6 }, (_, i) => {
      const d     = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1)
      const year  = d.getFullYear()
      const month = d.getMonth()
      const tx    = transacciones.filter(t => {
        const [y, m] = t.fecha.split('-').map(Number)
        return y === year && m - 1 === month
      })
      return {
        mes:      MES_NOMBRES[month].slice(0, 3),
        ingresos: tx.filter(t => t.tipo === 'ingreso').reduce((a, t) => a + t.monto, 0),
        egresos:  tx.filter(t => t.tipo === 'egreso').reduce((a, t) => a + t.monto, 0),
      }
    })

    // Egresos por categoría del mes seleccionado
    const porCat: Record<string, number> = {}
    transaccionesMes.filter(t => t.tipo === 'egreso').forEach(t => {
      porCat[t.categoria] = (porCat[t.categoria] || 0) + t.monto
    })
    const categoriaEgresos = Object.entries(porCat)
      .map(([k, v]) => ({ name: CATEGORIA_LABELS[k] ?? k, value: v }))
      .sort((a, b) => b.value - a.value)

    // Origen de ingresos del mes seleccionado
    const porOrigen: Record<string, number> = {}
    transaccionesMes.filter(t => t.tipo === 'ingreso').forEach(t => {
      const key =
        t.origen === 'turno'               ? 'Servicios (turno)' :
        t.origen === 'pedido'              ? 'Tienda online'       :
        t.categoria === 'servicios'        ? 'Servicios (manual)' :
        t.categoria === 'productos'        ? 'Productos (manual)' : 'Otro'
      porOrigen[key] = (porOrigen[key] || 0) + t.monto
    })
    const origenIngresos = Object.entries(porOrigen)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    return { ultimos6Meses, categoriaEgresos, origenIngresos }
  }, [transacciones, transaccionesMes])

  // ── Navegación de mes ─────────────────────────────────────────────────────

  const prevMes = () => setMesActual(p =>
    p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 }
  )
  const nextMes = () => setMesActual(p =>
    p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 }
  )

  // ── Formulario ────────────────────────────────────────────────────────────

  const resetForm = () => { setFormData(FORM_VACIO()); setEditingId(null); setErrorMsg('') }

  const handleNueva = () => { setTab('transacciones'); setShowForm(true); resetForm() }

  const handleEdit = (t: Transaccion) => {
    setTab('transacciones')
    setEditingId(t.id)
    setFormData({ tipo: t.tipo, categoria: t.categoria, monto: t.monto.toString(), descripcion: t.descripcion, fecha: t.fecha })
    setShowForm(true)
    setErrorMsg('')
    setConfirmDeleteId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleTipoChange = (tipo: TipoTransaccion) =>
    setFormData(prev => ({ ...prev, tipo, categoria: CATEGORIAS[tipo][0].value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg('')
    startTransition(async () => {
      const fd = new FormData()
      fd.append('tipo', formData.tipo); fd.append('categoria', formData.categoria)
      fd.append('monto', formData.monto); fd.append('descripcion', formData.descripcion)
      fd.append('fecha', formData.fecha)
      let res: { error?: string }
      if (editingId) { fd.append('id', editingId); res = await adminActualizarTransaccion(fd) }
      else           { res = await adminCrearTransaccion(fd) }
      if (res.error) { setErrorMsg(res.error) }
      else { await loadTransacciones(); setShowForm(false); resetForm() }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await adminEliminarTransaccion(id)
      if (res.error) alert(res.error)
      else { setConfirmDeleteId(null); await loadTransacciones() }
    })
  }

  const mesLabel = `${MES_NOMBRES[mesActual.month]} ${mesActual.year}`

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Finanzas</h1>
          <p className="text-zinc-400 text-sm mt-1">Registro y seguimiento de ingresos y egresos</p>
        </div>
        <button
          onClick={handleNueva}
          className="bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          + Nueva transacción
        </button>
      </div>

      {/* KPI cards — siempre visibles, reflejan el mes seleccionado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={`Ingresos — ${MES_NOMBRES[mesActual.month]}`} valor={kpis.ingresos} color="emerald" />
        <KpiCard label={`Egresos — ${MES_NOMBRES[mesActual.month]}`}  valor={kpis.egresos}  color="red" />
        <KpiCard label={`Balance — ${MES_NOMBRES[mesActual.month]}`}  valor={kpis.balance}  color="auto" signo />
        <KpiCard label="Balance acumulado"                             valor={kpis.total}    color="amber" signo />
      </div>

      {/* Barra de navegación: mes + tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navegación de mes */}
        <div className="flex items-center gap-3">
          <button onClick={prevMes} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white font-bold text-sm min-w-[140px] text-center">{mesLabel}</span>
          <button onClick={nextMes} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {(['dashboard', 'transacciones'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer capitalize ${
                tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'dashboard' ? '📊 Dashboard' : '📋 Transacciones'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Dashboard ────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-8 w-8 text-amber-400" />
          </div>
        ) : (
          <FinanzasCharts
            ultimos6Meses={chartData.ultimos6Meses}
            categoriaEgresos={chartData.categoriaEgresos}
            origenIngresos={chartData.origenIngresos}
            mesLabel={mesLabel}
          />
        )
      )}

      {/* ── Tab: Transacciones ────────────────────────────────────────────── */}
      {tab === 'transacciones' && (
        <div className="space-y-5">

          {/* Filtro tipo */}
          <div className="flex justify-end">
            <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              {(['todos', 'ingreso', 'egreso'] as FiltroTipo[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltroTipo(f)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    filtroTipo === f ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {f === 'todos' ? 'Todos' : f === 'ingreso' ? 'Ingresos' : 'Egresos'}
                </button>
              ))}
            </div>
          </div>

          {/* Formulario inline */}
          {showForm && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-5">
                {editingId ? 'Editar transacción' : 'Nueva transacción'}
              </h2>
              {errorMsg && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 mb-4">{errorMsg}</p>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tipo toggle */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Tipo</label>
                  <div className="flex gap-2">
                    {(['ingreso', 'egreso'] as TipoTransaccion[]).map(t => (
                      <button key={t} type="button" onClick={() => handleTipoChange(t)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                          formData.tipo === t
                            ? t === 'ingreso'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-white'
                        }`}>
                        {t === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría</label>
                    <select value={formData.categoria} onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20">
                      {CATEGORIAS[formData.tipo].map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Monto ($)</label>
                    <input type="number" required min="0.01" step="0.01" value={formData.monto}
                      onChange={e => setFormData({ ...formData, monto: e.target.value })} placeholder="0.00"
                      className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
                  <input type="text" required value={formData.descripcion}
                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Ej: Pago en efectivo corte + barba"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
                <div className="sm:w-48">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha</label>
                  <input type="date" required value={formData.fecha}
                    onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={isPending}
                    className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-black text-sm font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    {isPending && <Spinner className="w-4 h-4 text-black" />}
                    {editingId ? 'Actualizar' : 'Registrar'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                    className="flex-1 sm:flex-none bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-colors cursor-pointer">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabla */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-8 w-8 text-amber-400" />
            </div>
          ) : transaccionesFiltradas.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-14 text-center">
              <p className="text-zinc-500 font-medium">Sin movimientos en {mesLabel}</p>
              <p className="text-zinc-600 text-sm mt-1">Registrá transacciones con el botón de arriba</p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              {/* Cabecera */}
              <div className="hidden sm:grid grid-cols-[1fr_2fr_1fr_auto_auto] gap-4 px-5 py-3 bg-zinc-900 border-b border-zinc-800">
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Fecha</span>
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Descripción</span>
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Categoría / Origen</span>
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider text-right">Monto</span>
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider text-right">Acciones</span>
              </div>

              <div className="divide-y divide-zinc-800/60 bg-zinc-950">
                {transaccionesFiltradas.map(t => {
                  const origenMeta = ORIGEN_META[t.origen] ?? ORIGEN_META.manual
                  return (
                    <div
                      key={t.id}
                      className={`flex flex-col sm:grid sm:grid-cols-[1fr_2fr_1fr_auto_auto] sm:items-center gap-3 sm:gap-4 px-5 py-4 border-l-2 transition-colors hover:bg-zinc-900/50 ${
                        t.tipo === 'ingreso' ? 'border-l-emerald-500' : 'border-l-red-500'
                      }`}
                    >
                      {/* Fecha */}
                      <span className="text-zinc-400 text-sm">{formatFecha(t.fecha)}</span>

                      {/* Descripción */}
                      <span className="text-white text-sm font-medium truncate">{t.descripcion}</span>

                      {/* Categoría + Origen (apilados) */}
                      <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          t.tipo === 'ingreso'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {CATEGORIA_LABELS[t.categoria] ?? t.categoria}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${origenMeta.cls}`}>
                          {origenMeta.label}
                        </span>
                      </div>

                      {/* Monto */}
                      <span className={`text-base font-black tabular-nums text-right ${
                        t.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {t.tipo === 'ingreso' ? '+' : '−'}{formatMonto(t.monto)}
                      </span>

                      {/* Acciones */}
                      {confirmDeleteId === t.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-zinc-400 text-xs">¿Eliminar?</span>
                          <button onClick={() => handleDelete(t.id)} disabled={isPending}
                            className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1">
                            {isPending && <Spinner className="w-3 h-3" />} Sí
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => handleEdit(t)} disabled={isPending}
                            className="text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                            Editar
                          </button>
                          <button onClick={() => setConfirmDeleteId(t.id)} disabled={isPending}
                            className="text-xs font-bold text-zinc-500 hover:text-red-400 bg-zinc-800 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer totales */}
              <div className="flex justify-end px-5 py-4 bg-zinc-900 border-t border-zinc-800">
                <div className="flex gap-6 text-sm">
                  <span className="text-zinc-500">
                    Ingresos: <span className="text-emerald-400 font-bold">{formatMonto(kpis.ingresos)}</span>
                  </span>
                  <span className="text-zinc-500">
                    Egresos: <span className="text-red-400 font-bold">{formatMonto(kpis.egresos)}</span>
                  </span>
                  <span className="text-zinc-500">
                    Balance: <span className={`font-bold ${kpis.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {kpis.balance >= 0 ? '+' : ''}{formatMonto(kpis.balance)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
