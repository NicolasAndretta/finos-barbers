import React from 'react'
import { SoloConElPlan } from '@/components/admin/SoloConElPlan'

// Las reseñas en la web: plan Pro en adelante (Fase 7).
export default function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ local: string }> }) {
  return (
    <SoloConElPlan params={params} capacidad="resenas" titulo="Reseñas" queHace="Las reseñas de tus clientes en tu página: las dejan ellos después de su turno, y vos elegís cuáles se ven.">
      {children}
    </SoloConElPlan>
  )
}
