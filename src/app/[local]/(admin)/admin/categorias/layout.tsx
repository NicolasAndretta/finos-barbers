import React from 'react'
import { SoloConElPlan } from '@/components/admin/SoloConElPlan'

// La tienda es del plan Premium (Fase 7).
export default function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ local: string }> }) {
  return (
    <SoloConElPlan params={params} capacidad="tienda" titulo="Categorías" queHace="La tienda online: vendé tus productos desde tu página, ordenados por categoría.">
      {children}
    </SoloConElPlan>
  )
}
