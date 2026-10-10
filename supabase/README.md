# supabase/

Todo lo que describe la base de datos vive acá, versionado junto con el código.

| Archivo | Qué es |
|---|---|
| `migrations/0000_base.sql` | **La foto**: la estructura completa de la base de producción (tablas, reglas, funciones, disparadores, políticas RLS, permisos). La genera `scripts/exportar-esquema.mjs`. No se edita a mano. |
| `migrations/0001` a `0004` | Los cambios que se hicieron antes de tener la foto. Ya están incluidos en ella; sobre la foto no cambian nada (son idempotentes). |
| `migrations/0005` en adelante | Los cambios nuevos (multi-tenant). Cada uno se prueba primero en desarrollo. |
| `seed-desarrollo.sql` | Datos de ejemplo para el proyecto de desarrollo: el catálogo del local (servicios, barberos, productos, categorías, reseñas). Sin cuentas, turnos, pedidos ni tokens. |
| `esquema-reporte.md` | Resumen legible de la foto, con alertas de seguridad. Se regenera con cada exportación. |

## Comandos

```bash
# Armar (o actualizar) el proyecto de desarrollo con todo lo de esta carpeta
node scripts/preparar-desarrollo.mjs

# Aplicar una migración nueva en desarrollo
node scripts/migrate.mjs supabase/migrations/0005_algo.sql

# Aplicarla en producción (a propósito, cuando ya está probada)
node scripts/migrate.mjs --env .env.produccion.local --produccion supabase/migrations/0005_algo.sql

# Comparar una base contra la foto
node scripts/exportar-esquema.mjs --comparar supabase/migrations/0000_base.sql
```

Las credenciales salen de `.env.local` (desarrollo) y `.env.produccion.local`
(producción). Ninguno de los dos se sube a git. Ver `.env.local.example`.
