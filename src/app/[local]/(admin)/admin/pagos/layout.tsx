import React from 'react'
import { SoloConElPlan } from '@/components/admin/SoloConElPlan'

// Las señas con Mercado Pago: plan Pro en adelante (Fase 7).
export default function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ local: string }> }) {
  return (
    <SoloConElPlan params={params} capacidad="senas" titulo="Cobros" queHace="Cobrar la seña de cada turno con Mercado Pago, directo a tu cuenta: se terminan los que reservan y no vienen.">
      {children}
    </SoloConElPlan>
  )
}
