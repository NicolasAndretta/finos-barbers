import React from 'react'
import { SoloConElPlan } from '@/components/admin/SoloConElPlan'

// La tienda es del plan Premium (Fase 7).
export default function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ local: string }> }) {
  return (
    <SoloConElPlan params={params} capacidad="tienda" titulo="Productos" queHace="La tienda online: vendé tus productos desde tu página, con su stock, y cobralos con Mercado Pago.">
      {children}
    </SoloConElPlan>
  )
}
