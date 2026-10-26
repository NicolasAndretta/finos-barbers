import React from 'react'
import { MarcaAcceso } from '@/components/ui/MarcaAcceso'
import { RestablecerForm } from './RestablecerForm'
import { esSlug } from '@/lib/local-datos'

// ?bienvenida=<local>: viene de la invitación de un dueño (Fase 6).
export default async function Pagina({ searchParams }: { searchParams: Promise<{ bienvenida?: string }> }) {
  const { bienvenida } = await searchParams
  return (
    <div className="flex flex-col items-center w-full">
      <div className="mb-8">
        <MarcaAcceso />
      </div>
      <RestablecerForm bienvenida={bienvenida && esSlug(bienvenida) ? bienvenida : undefined} />
    </div>
  )
}
