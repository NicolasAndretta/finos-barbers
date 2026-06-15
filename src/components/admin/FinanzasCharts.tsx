'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

// ─── Paletas ──────────────────────────────────────────────────────────────────

const COLORES_EGRESO  = ['#f87171','#fb923c','#fbbf24','#a78bfa','#60a5fa','#34d399','#94a3b8']
const COLORES_INGRESO = ['#34d399','#60a5fa','#a78bfa','#f59e0b','#fb923c']

// ─── Tipos de props ───────────────────────────────────────────────────────────

export type MesData    = { mes: string; ingresos: number; egresos: number }
export type SliceData  = { name: string; value: number }

// ─── Helpers de formato ───────────────────────────────────────────────────────

function fmtEje(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`
  return `$${n}`
}

function fmtPeso(n: number): string {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ─── Tooltips personalizados ──────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  background: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: 10,
  padding: '10px 14px',
  boxShadow: '0 10px 30px rgba(0,0,0,.5)',
}

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ color: string; name: string; value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ color: '#a1a1aa', fontSize: 11, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontSize: 13, fontWeight: 700, margin: '2px 0' }}>
          {p.name}: {fmtPeso(p.value)}
        </p>
      ))}
      {payload.length === 2 && (
        <p style={{ color: '#71717a', fontSize: 11, marginTop: 6, borderTop: '1px solid #3f3f46', paddingTop: 6 }}>
          Balance: {fmtPeso(payload[0].value - payload[1].value)}
        </p>
      )}
    </div>
  )
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{d.name}</p>
      <p style={{ color: d.payload.fill, fontSize: 12, fontWeight: 600, marginTop: 2 }}>
        {fmtPeso(d.value)}
      </p>
    </div>
  )
}

// ─── Donut con leyenda ────────────────────────────────────────────────────────

function DonutCard({
  title,
  data,
  colores,
  emptyMsg,
}: {
  title: string
  data: SliceData[]
  colores: string[]
  emptyMsg: string
}) {
  const total = data.reduce((a, d) => a + d.value, 0)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
      <h3 className="text-white font-bold text-sm">{title}</h3>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">{emptyMsg}</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colores[i % colores.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Leyenda manual */}
          <div className="space-y-2">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: colores[i % colores.length] }}
                  />
                  <span className="text-zinc-400 truncate">{d.name}</span>
                </div>
                <span className="text-zinc-300 font-semibold tabular-nums ml-3 shrink-0">
                  {fmtPeso(d.value)}{' '}
                  <span className="text-zinc-600">
                    ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Componente exportado ─────────────────────────────────────────────────────

export function FinanzasCharts({
  ultimos6Meses,
  categoriaEgresos,
  origenIngresos,
  mesLabel,
}: {
  ultimos6Meses:    MesData[]
  categoriaEgresos: SliceData[]
  origenIngresos:   SliceData[]
  mesLabel:         string
}) {
  const sinDatos = ultimos6Meses.every(m => m.ingresos === 0 && m.egresos === 0)

  return (
    <div className="space-y-6">
      {/* Barras: ingresos vs egresos últimos 6 meses */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-white font-bold text-sm mb-5">Ingresos vs Egresos — últimos 6 meses</h3>

        {sinDatos ? (
          <div className="flex items-center justify-center h-52 text-zinc-600 text-sm">
            Sin datos registrados todavía
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ultimos6Meses} barGap={4} barCategoryGap="32%">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="mes"
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickFormatter={fmtEje}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: '#27272a' }} />
              <Bar dataKey="ingresos" fill="#34d399" radius={[4, 4, 0, 0]} name="Ingresos" maxBarSize={40} />
              <Bar dataKey="egresos"  fill="#f87171" radius={[4, 4, 0, 0]} name="Egresos"  maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Donuts: distribución del mes seleccionado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DonutCard
          title={`Egresos por categoría — ${mesLabel}`}
          data={categoriaEgresos}
          colores={COLORES_EGRESO}
          emptyMsg="Sin egresos este mes"
        />
        <DonutCard
          title={`Origen de ingresos — ${mesLabel}`}
          data={origenIngresos}
          colores={COLORES_INGRESO}
          emptyMsg="Sin ingresos este mes"
        />
      </div>
    </div>
  )
}
