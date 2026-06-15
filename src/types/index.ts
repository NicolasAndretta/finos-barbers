export type Role = 'client' | 'admin'

export type Profile = {
  id: string
  email: string
  nombre: string
  apellido: string
  role: Role
  created_at: string
}

export type Servicio = {
  id: string
  nombre: string
  descripcion: string
  precio: number
  duracion_minutos: number
  activo: boolean
}

export type Barbero = {
  id: string
  nombre: string
  apellido: string
  activo: boolean
}

export type CategoriaProducto = 'cuidado-cabello' | 'barba' | 'accesorios' | 'otros'

export type Producto = {
  id: string
  nombre: string
  descripcion: string
  precio: number
  stock: number
  imagen_url: string | null
  categoria: CategoriaProducto
  activo: boolean
  created_at: string
}

export type TipoEntrega   = 'retiro' | 'envio'
export type EstadoPedido  = 'pendiente' | 'pagado' | 'cancelado' | 'enviado'

export type Pedido = {
  id: string
  user_id: string
  estado: EstadoPedido
  tipo_entrega: TipoEntrega
  direccion_envio: string | null
  total: number
  mp_preference_id: string | null
  mp_payment_id: string | null
  created_at: string
}

export type ItemPedido = {
  id: string
  pedido_id: string
  producto_id: string
  nombre: string
  precio: number
  cantidad: number
  created_at: string
}

export type TipoTransaccion   = 'ingreso' | 'egreso'
export type OrigenTransaccion = 'manual' | 'turno' | 'pedido'

export type CategoriaTransaccion =
  | 'servicios' | 'productos'
  | 'insumos' | 'alquiler' | 'sueldos'
  | 'servicios-publicos' | 'marketing' | 'mantenimiento'
  | 'otro'

export type Transaccion = {
  id: string
  tipo: TipoTransaccion
  categoria: CategoriaTransaccion
  monto: number
  descripcion: string
  fecha: string
  origen: OrigenTransaccion
  turno_id: string | null
  pedido_id: string | null
  created_by: string
  created_at: string
}

export type EstadoTurno = 'pendiente' | 'confirmado' | 'cancelado'

export type Turno = {
  id: string
  cliente_id: string
  barbero_id: string
  servicio_id: string
  fecha: string
  hora: string
  estado: EstadoTurno
  created_at: string
  profiles?: Profile
  servicios?: Servicio
  barberos?: Barbero
}
