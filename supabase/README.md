# supabase/

Todo lo que describe la base de datos vive acá, versionado junto con el código.

| Archivo | Qué es |
|---|---|
| `migrations/0000_base.sql` | **La foto**: la estructura completa de la base de la demo actual (tablas, reglas, funciones, disparadores, políticas RLS, permisos). Es el punto de partida de la base nueva del producto. La genera `scripts/exportar-esquema.mjs`. No se edita a mano. |
| `migrations/0001` a `0004` | Los cambios que se hicieron antes de tener la foto. Ya están incluidos en ella; sobre la foto no cambian nada (son idempotentes). |
| `migrations/0005` en adelante | Los cambios nuevos (muchos locales). Cada uno se prueba primero en desarrollo. |
| `seed-desarrollo.sql` | Datos de ejemplo: el catálogo de Roble, el local de demostración (servicios, barberos, productos, categorías, reseñas). Sin cuentas, turnos, pedidos ni tokens. |
| `esquema-reporte.md` | Resumen legible de la foto, con alertas de seguridad. Se regenera con cada exportación. |

## Las bases

| Archivo de credenciales | Base | Qué se hace con ella |
|---|---|---|
| `.env.local` | Desarrollo | Todo: construir y probar |
| `.env.demo-actual.local` | La demo de Roble publicada hoy | Solo se lee, una vez, para sacar la foto. Queda congelada hasta el lanzamiento. |
| `.env.produccion.local` | Producción del producto (se crea al final) | Se arma con las migraciones ya probadas |

Ninguno de estos archivos se sube a git. Ver `.env.local.example`.

## Comandos

```bash
# Armar (o actualizar) el proyecto de desarrollo con todo lo de esta carpeta
node scripts/preparar-desarrollo.mjs

# Aplicar una migración nueva en desarrollo
node scripts/migrate.mjs supabase/migrations/0005_algo.sql

# Aplicarla en la producción del producto (a propósito, cuando ya está probada)
node scripts/migrate.mjs --env .env.produccion.local --produccion supabase/migrations/0005_algo.sql

# Comparar una base contra la foto
node scripts/exportar-esquema.mjs --comparar supabase/migrations/0000_base.sql
```
