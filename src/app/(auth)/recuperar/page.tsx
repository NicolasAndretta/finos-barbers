import React from 'react'
import { MarcaAcceso } from '@/components/ui/MarcaAcceso'
import { RecuperarForm } from './RecuperarForm'

export default function Pagina() {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="mb-8">
        <MarcaAcceso />
      </div>
      <RecuperarForm />
    </div>
  )
}
