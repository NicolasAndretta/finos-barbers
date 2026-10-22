import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { getProfile } from '@/lib/auth'
import { getLocal } from '@/lib/local'

export async function generateMetadata({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  return { title: `Checkout | ${local?.nombre ?? ''}` }
}

export default async function CheckoutPage() {
  const profile = await getProfile()

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Checkout</h1>
        <p className="text-zinc-400 text-sm mt-1">Revisá tu pedido y elegí cómo recibirlo</p>
      </div>

      <CheckoutForm loggedIn={!!profile} />
    </div>
  )
}
