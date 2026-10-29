import React from 'react'
import { SoloConElPlan } from '@/components/admin/SoloConElPlan'

// La caja: plan Premium (Fase 7).
export default function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ local: string }> }) {
  return (
    <SoloConElPlan params={params} capacidad="finanzas" titulo="Finanzas" queHace="La caja del local: ingresos, ventas y gastos, con gráficos de cada mes.">
      {children}
    </SoloConElPlan>
  )
}
