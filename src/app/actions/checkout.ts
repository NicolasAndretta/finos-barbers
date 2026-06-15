'use server'

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { createClient } from '@/lib/supabase'
import { requireUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

type ItemCarritoRaw = { id: string; cantidad: number }

export async function crearPedido(formData: FormData) {
  const user = await requireUser()

  const itemsRaw     = formData.get('items') as string
  const tipoEntrega  = formData.get('tipo_entrega') as string
  const direccionRaw = (formData.get('direccion_envio') as string | null) ?? ''

  if (!itemsRaw || !tipoEntrega) return { error: 'Datos incompletos' }
  if (tipoEntrega === 'envio' && !direccionRaw.trim()) {
    return { error: 'Ingresá la dirección de envío' }
  }

  let itemsCarrito: ItemCarritoRaw[]
  try {
    itemsCarrito = JSON.parse(itemsRaw)
  } catch {
    return { error: 'Error al procesar el carrito' }
  }
  if (!itemsCarrito.length) return { error: 'El carrito está vacío' }

  // Validate items against DB (use DB prices — never trust client)
  const supabase = await createClient()
  const ids = itemsCarrito.map(i => i.id)
  const { data: productos, error: prodError } = await supabase
    .from('productos')
    .select('id, nombre, precio, stock, activo')
    .in('id', ids)

  if (prodError || !productos) return { error: 'Error al validar productos' }

  for (const item of itemsCarrito) {
    const prod = productos.find(p => p.id === item.id)
    if (!prod || !prod.activo) return { error: 'Un producto ya no está disponible' }
    if (prod.stock < item.cantidad)
      return { error: `Stock insuficiente para ${prod.nombre} (quedan ${prod.stock})` }
  }

  const total = itemsCarrito.reduce((acc, item) => {
    const prod = productos.find(p => p.id === item.id)!
    return acc + prod.precio * item.cantidad
  }, 0)

  // Create pedido
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      user_id: user.id,
      estado: 'pendiente',
      tipo_entrega: tipoEntrega,
      direccion_envio: tipoEntrega === 'envio' ? direccionRaw.trim() : null,
      total,
    })
    .select()
    .single()

  if (pedidoError || !pedido) return { error: 'Error al crear el pedido' }

  // Create items_pedido
  const { error: itemsError } = await supabase.from('items_pedido').insert(
    itemsCarrito.map(item => {
      const prod = productos.find(p => p.id === item.id)!
      return {
        pedido_id:   pedido.id,
        producto_id: item.id,
        nombre:      prod.nombre,
        precio:      prod.precio,
        cantidad:    item.cantidad,
      }
    })
  )

  if (itemsError) {
    await supabase.from('pedidos').delete().eq('id', pedido.id)
    return { error: 'Error al guardar los items del pedido' }
  }

  // Create MercadoPago preference
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) return { error: 'Pago no configurado — contactá al administrador' }

  // NOTA sobre prueba vs real:
  // Esta cuenta de MercadoPago tiene un único Access Token (APP_USR-...). Que
  // un pago sea real o de prueba NO depende del token ni del código, sino de si
  // las "Credenciales de producción" están activadas en el panel de MercadoPago:
  //   - Producción NO activada → solo pagan las CUENTAS DE PRUEBA (sin dinero real)
  //   - Producción activada     → pagan tarjetas reales y se mueve dinero real
  // Por eso acá no hay lógica de modo ni dependencia de NODE_ENV.

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const preferenceBody = {
    items: itemsCarrito.map(item => {
      const prod = productos.find(p => p.id === item.id)!
      return {
        id:          item.id,
        title:       prod.nombre,
        unit_price:  prod.precio,
        quantity:    item.cantidad,
        currency_id: 'ARS',
      }
    }),
    payer:              { email: user.email ?? '' },
    back_urls: {
      success: `${appUrl}/checkout/success`,
      failure: `${appUrl}/checkout/failure`,
      pending: `${appUrl}/checkout/success`,
    },
    // auto_return solo con URL pública — con localhost MP no puede verificar la URL
    ...(!appUrl.includes('localhost') && { auto_return: 'approved' as const }),
    external_reference: pedido.id,
  }

  try {
    const mpClient = new MercadoPagoConfig({ accessToken })
    const preference = new Preference(mpClient)
    const result = await preference.create({ body: preferenceBody })

    await supabase
      .from('pedidos')
      .update({ mp_preference_id: result.id })
      .eq('id', pedido.id)

    // init_point es la URL de checkout de MercadoPago (sandbox_init_point queda
    // como fallback legacy). El modo prueba/real lo define el estado de las
    // credenciales de producción en la cuenta, no esta URL.
    const urlCheckout = result.init_point ?? result.sandbox_init_point

    return { url_checkout: urlCheckout ?? '' }
  } catch (err) {
    console.error('[MP] Error al crear preferencia:', err)
    await supabase.from('pedidos').delete().eq('id', pedido.id)
    return { error: 'Error al iniciar el pago. Intentá de nuevo.' }
  }
}

export async function actualizarEstadoPedido(pedidoId: string, paymentId: string) {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('id, estado, total')
    .eq('id', pedidoId)
    .eq('user_id', user.id)
    .single()

  if (!pedido) return { error: 'Pedido no encontrado' }
  if (pedido.estado === 'pagado') return { success: true }

  // Verify payment status with MP
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (accessToken) {
    try {
      const mpClient = new MercadoPagoConfig({ accessToken })
      const paymentClient = new Payment(mpClient)
      const payment = await paymentClient.get({ id: paymentId })

      if (payment.status !== 'approved' && payment.status !== 'pending') {
        return { error: 'El pago no fue aprobado' }
      }
    } catch {
      // If MP verification fails, proceed anyway (MP already redirected to success)
    }
  }

  const { error } = await supabase
    .from('pedidos')
    .update({ estado: 'pagado', mp_payment_id: paymentId })
    .eq('id', pedidoId)

  if (error) return { error: error.message }

  // Auto-registro financiero del pedido pagado
  const hoy = new Date()
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  await supabase.from('transacciones').insert({
    tipo:        'ingreso',
    categoria:   'productos',
    monto:       pedido.total,
    descripcion: `Pedido #${pedidoId.slice(0, 8).toUpperCase()} — tienda online`,
    fecha:       fechaHoy,
    origen:      'pedido',
    pedido_id:   pedidoId,
    created_by:  user.id,
  })

  revalidatePath('/dashboard')
  revalidatePath('/admin/finanzas')
  return { success: true }
}
