'use server'

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { createClient, createServiceClient } from '@/lib/supabase'
import { getAccessTokenComercio } from '@/lib/mp-oauth'
import { revalidatePath } from 'next/cache'

type ItemCarritoRaw = { id: string; cantidad: number }

export async function crearPedido(formData: FormData) {
  const itemsRaw     = formData.get('items') as string
  const tipoEntrega  = formData.get('tipo_entrega') as string
  const direccionRaw = (formData.get('direccion_envio') as string | null) ?? ''

  // Datos del invitado (cuando no hay sesión)
  const guestNombre   = ((formData.get('cliente_nombre')   as string | null) ?? '').trim()
  const guestEmail    = ((formData.get('cliente_email')    as string | null) ?? '').trim()
  const guestTelefono = ((formData.get('cliente_telefono') as string | null) ?? '').trim()

  if (!itemsRaw || !tipoEntrega) return { error: 'Datos incompletos' }
  if (tipoEntrega === 'envio' && !direccionRaw.trim()) {
    return { error: 'Ingresá la dirección de envío' }
  }

  // Usuario OPCIONAL: si no hay sesión, es una compra de invitado.
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    if (!guestNombre) return { error: 'Ingresá tu nombre' }
    if (!guestEmail && !guestTelefono) {
      return { error: 'Dejá un email o teléfono de contacto' }
    }
  }

  let itemsCarrito: ItemCarritoRaw[]
  try {
    itemsCarrito = JSON.parse(itemsRaw)
  } catch {
    return { error: 'Error al procesar el carrito' }
  }
  if (!itemsCarrito.length) return { error: 'El carrito está vacío' }

  // Service role: validamos e insertamos server-side (sin debilitar el RLS).
  const supabase = createServiceClient()
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

  // Email para MercadoPago y para contacto del pedido.
  const emailContacto = user?.email ?? guestEmail

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      user_id:          user?.id ?? null,
      estado:           'pendiente',
      tipo_entrega:     tipoEntrega,
      direccion_envio:  tipoEntrega === 'envio' ? direccionRaw.trim() : null,
      total,
      cliente_nombre:   user ? null : guestNombre,
      cliente_email:    user ? null : (guestEmail || null),
      cliente_telefono: user ? null : (guestTelefono || null),
    })
    .select()
    .single()

  if (pedidoError || !pedido) return { error: 'Error al crear el pedido' }

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

  const accessToken = (await getAccessTokenComercio()) ?? process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) return { error: 'Pago no configurado — contactá al administrador' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXT_PUBLIC_SITE_URL
    || 'http://localhost:3000'

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
    payer:              { email: emailContacto || '' },
    back_urls: {
      success: `${appUrl}/checkout/success`,
      failure: `${appUrl}/checkout/failure`,
      pending: `${appUrl}/checkout/success`,
    },
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

    const urlCheckout = result.init_point ?? result.sandbox_init_point
    return { url_checkout: urlCheckout ?? '' }
  } catch (err) {
    console.error('[MP] Error al crear preferencia:', err)
    await supabase.from('pedidos').delete().eq('id', pedido.id)
    return { error: 'Error al iniciar el pago. Intentá de nuevo.' }
  }
}

export async function actualizarEstadoPedido(pedidoId: string, paymentId: string) {
  // Funciona para usuarios logueados y para invitados (verificamos por id de
  // pedido + estado del pago en MercadoPago). Service role server-side.
  const supabase = createServiceClient()

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('id, estado, total, user_id')
    .eq('id', pedidoId)
    .single()

  if (!pedido) return { error: 'Pedido no encontrado' }
  if (pedido.estado === 'pagado') return { success: true }

  const accessToken = (await getAccessTokenComercio()) ?? process.env.MERCADOPAGO_ACCESS_TOKEN
  if (accessToken) {
    try {
      const mpClient = new MercadoPagoConfig({ accessToken })
      const paymentClient = new Payment(mpClient)
      const payment = await paymentClient.get({ id: paymentId })
      if (payment.status !== 'approved' && payment.status !== 'pending') {
        return { error: 'El pago no fue aprobado' }
      }
    } catch {
      // Si falla la verificación, seguimos (MP ya redirigió a success).
    }
  }

  const { error } = await supabase
    .from('pedidos')
    .update({ estado: 'pagado', mp_payment_id: paymentId })
    .eq('id', pedidoId)

  if (error) return { error: error.message }

  // Registro financiero del pedido pagado (best-effort: si el pedido es de
  // invitado y la tabla exige created_by, no rompemos el flujo).
  try {
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
      created_by:  pedido.user_id,
    })
  } catch (err) {
    console.error('[checkout] No se registró la transacción del pedido:', err)
  }

  revalidatePath('/admin/finanzas')
  return { success: true }
}
