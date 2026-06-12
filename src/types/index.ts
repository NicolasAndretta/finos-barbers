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
