'use server'

import { createClient, createServiceClient } from '@/lib/supabase'
import { crearPreferencia } from '@/lib/mercadopago'
import { cuentaDelLocal } from '@/lib/mp-conexion'
import { direccionesDelCobro, modoDeCobro, referenciaDe } from '@/lib/cobros'
import { localDeAccion } from '@/lib/local'
import { localVisible } from '@/lib/local-datos'

type ItemCarritoRaw = { id: string; cantidad: number }

const esId = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

/**
 * El carrito lo arma el navegador, así que se revisa entero: ids con forma de
 * id, cantidades enteras de 1 a 99, y un renglón por producto (si llega dos
 * veces el mismo, se suman).
 */
function normalizarCarrito(raw: unknown): ItemCarritoRaw[] | null {
  if (!Array.isArray(raw)) return null
  const porProducto = new Map<string, number>()
  for (const item of raw) {
    const cantidad = Number((item as ItemCarritoRaw)?.cantidad)
    if (!esId((item as ItemCarritoRaw)?.id) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) return null
    const id = (item as ItemCarritoRaw).id
    porProducto.set(id, (porProducto.get(id) ?? 0) + cantidad)
  }
  return [...porProducto].map(([id, cantidad]) => ({ id, cantidad }))
}

export async function crearPedido(formData: FormData) {
  // El pedido es de la tienda de un local: el de la página donde se compró.
  const local = await localDeAccion(formData.get('local'))
  if (!localVisible(local)) return { error: 'Esta tienda no está vendiendo por ahora.' }

  // Cómo cobra este local (lib/cobros.ts). Sin Mercado Pago la tienda es un
  // catálogo: no se arma ningún pedido (antes quedaba uno colgado).
  const modo = await modoDeCobro(local)
  if (modo === 'sin_mercadopago') return { error: 'Esta tienda todavía no cobra online. Consultá por WhatsApp y te lo reservan.' }

  const itemsRaw     = formData.get('items') as string
  const tipoEntrega  = formData.get('tipo_entrega') as string
  const direccionRaw = (formData.get('direccion_envio') as string | null) ?? ''

  // Datos del invitado (cuando no hay sesión)
  const guestNombre   = ((formData.get('cliente_nombre')   as string | null) ?? '').trim()
  const guestEmail    = ((formData.get('cliente_email')    as string | null) ?? '').trim()
  const guestTelefono = ((formData.get('cliente_telefono') as string | null) ?? '').trim()

  if (!itemsRaw || !['retiro', 'envio'].includes(tipoEntrega)) return { error: 'Datos incompletos' }
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

  let itemsCarrito: ItemCarritoRaw[] | null
  try {
    itemsCarrito = normalizarCarrito(JSON.parse(itemsRaw))
  } catch {
    itemsCarrito = null
  }
  if (!itemsCarrito) return { error: 'Error al procesar el carrito' }
  if (!itemsCarrito.length) return { error: 'El carrito está vacío' }

  // Service role: validamos e insertamos server-side (sin debilitar el RLS).
  // Como la llave del servidor no pasa por las reglas de la base, acá se
  // filtra a mano: solo productos de ESTE local (si el carrito trae uno de
  // otro, no aparece y el pedido se frena abajo con "ya no está disponible").
  const supabase = createServiceClient()
  const ids = itemsCarrito.map(i => i.id)
  const { data: productos, error: prodError } = await supabase
    .from('productos')
    .select('id, nombre, precio, stock, activo')
    .eq('local_id', local.id)
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

  // En una demo nunca se cobra (decisión 5): no se arma ningún pedido, y la
  // pantalla explica cómo sería el pago en la tienda de verdad.
  if (modo === 'muestra') return { muestra: true, total }

  const cuenta = await cuentaDelLocal(local.id).catch(() => null)
  if (!cuenta) return { error: 'Esta tienda no puede cobrar online en este momento. Probá de nuevo en un rato o consultá por WhatsApp.' }

  // Email para MercadoPago y para contacto del pedido.
  const emailContacto = user?.email ?? guestEmail

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      local_id:         local.id,
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
        local_id:    local.id,
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

  // El cobro, con la cuenta de Mercado Pago del local. Que el pedido quedó
  // pagado lo decide después el aviso de Mercado Pago (api/mp/webhook): el
  // stock baja y la venta entra a la caja recién ahí.
  try {
    const cobro = await crearPreferencia(cuenta.token, {
      items: itemsCarrito.map(item => {
        const prod = productos.find(p => p.id === item.id)!
        return {
          id:          item.id,
          title:       prod.nombre,
          unit_price:  Number(prod.precio),
          quantity:    item.cantidad,
          currency_id: 'ARS' as const,
        }
      }),
      ...(emailContacto && { payer: { email: emailContacto } }),
      external_reference: referenciaDe({ tipo: 'pedido', id: pedido.id }),
      ...direccionesDelCobro(local, { ok: '/checkout/success', error: '/checkout/failure' }),
    })

    await supabase
      .from('pedidos')
      .update({ mp_preference_id: cobro.id })
      .eq('id', pedido.id)

    return { url_checkout: cobro.url }
  } catch (err) {
    console.error('[checkout] No se pudo armar el cobro del pedido:', err instanceof Error ? err.message : err)
    await supabase.from('pedidos').delete().eq('id', pedido.id)
    return { error: 'Error al iniciar el pago. Intentá de nuevo.' }
  }
}
