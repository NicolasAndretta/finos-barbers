import { CalendarioSemanal } from '@/components/admin/CalendarioSemanal'

export const metadata = {
  title: 'Calendario | Finos Barbers',
}

export default function CalendarioPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Calendario
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Agenda semanal de todos los barberos
        </p>
      </div>

      <CalendarioSemanal />
    </div>
  )
}
