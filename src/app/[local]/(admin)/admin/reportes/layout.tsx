import React from 'react'
import { SoloConElPlan } from '@/components/admin/SoloConElPlan'

// Los reportes: plan Pro en adelante (Fase 7).
export default function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ local: string }> }) {
  return (
    <SoloConElPlan params={params} capacidad="reportes" titulo="Reportes" queHace="Cuántos turnos tuviste, cuántos se cancelaron y cuántos no vinieron, mes a mes, por profesional y por servicio, y lo que facturaste.">
      {children}
    </SoloConElPlan>
  )
}
