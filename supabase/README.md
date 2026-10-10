# supabase/

Todo lo que describe la base de datos vive acá, versionado junto con el código.

| Archivo | Qué es |
|---|---|
| `migrations/0000_base.sql` | **La foto**: la estructura completa de la base de producción (tablas, reglas, funciones, disparadores, políticas RLS, permisos). La genera `scripts/exportar-esquema.mjs`. No se edita a mano. |
| `migrations/0001` a `0004` | Los cambios que se hicieron antes de tener la foto. Ya están incluidos en ella; sobre la foto no cambian nada (son idempotentes). |
| `migrations/0005` en adelante | Los cambios nuevos (muchos locales). Cada uno se prueba primero en desarrollo. |
| `seed-desarrollo.sql` | Datos de ejemplo: el catálogo de Roble, el local de demostración (servicios, barberos, productos, categorías, reseñas). Sin cuentas, turnos, pedidos ni tokens. |
| `esquema-reporte.md` | Resumen legible de la foto, con alertas de seguridad. Se regenera con cada exportación. |
| `config.toml` | Configuración del Supabase local (desarrollo). La crea `npx supabase init`. |

## Las bases

| Archivo de credenciales | Base | Qué se hace con ella |
|---|---|---|
| `.env.local` | Desarrollo: Supabase local en la PC (Docker) | Todo: construir y probar |
| `.env.produccion.local` | Producción: el proyecto `finos-barbers` | La comparten la demo de Roble y la web de 369 (en producción), y ahí va a vivir el producto. Solo se toca con migraciones ya probadas, con copia de seguridad antes. |

Ninguno de estos archivos se sube a git. Ver `.env.local.example`.

## Comandos

```bash
# Levantar / apagar el Supabase local (desarrollo)
npx supabase start
npx supabase stop

# Armar (o actualizar) la base de desarrollo con todo lo de esta carpeta
node scripts/preparar-desarrollo.mjs

# Aplicar una migración nueva en desarrollo
node scripts/migrate.mjs supabase/migrations/0005_algo.sql

# Aplicarla en producción (a propósito, ya probada y con copia de seguridad)
node scripts/migrate.mjs --env .env.produccion.local --produccion supabase/migrations/0005_algo.sql

# Comparar una base contra la foto
node scripts/exportar-esquema.mjs --comparar supabase/migrations/0000_base.sql
```
