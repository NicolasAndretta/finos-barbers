import { CheckoutForm } from '@/components/checkout/CheckoutForm'

export const metadata = {
  title: 'Checkout | Finos Barbers',
}

export default function CheckoutPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Checkout</h1>
        <p className="text-zinc-400 text-sm mt-1">Revisá tu pedido y elegí cómo recibirlo</p>
      </div>

      <CheckoutForm />
    </div>
  )
}
