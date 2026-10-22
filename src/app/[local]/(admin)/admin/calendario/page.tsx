import { CalendarioSemanal } from '@/components/admin/CalendarioSemanal'
import { getLocal } from '@/lib/local'

export async function generateMetadata({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  return { title: `Calendario | ${local?.nombre ?? ''}` }
}

export default function CalendarioPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Calendario
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          La agenda de la semana, de todo el equipo
        </p>
      </div>

      <CalendarioSemanal />
    </div>
  )
}
