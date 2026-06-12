# Arquitectura — Finos Barbers

## Decisiones técnicas
- App Router de Next.js para layouts separados por rol
- Supabase Auth para manejo de sesiones
- Row Level Security (RLS) en Supabase para proteger datos
- Server Components para fetch de datos
- Client Components solo para interactividad

## Flujo de reserva
1. Cliente inicia sesión
2. Elige servicio
3. Elige barbero
4. Elige fecha y hora disponible
5. Confirma reserva
6. Supabase guarda el turno
7. Resend envía mail de confirmación

## Roles
- client: puede ver y reservar turnos propios
- admin: puede ver todos los turnos, gestionar servicios y barberos

## Variables de entorno necesarias
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
