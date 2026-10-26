# supabase/

Todo lo que describe la base de datos vive acá, versionado junto con el código.

| Archivo | Qué es |
|---|---|
| `migrations/0000_base.sql` | **La foto**: la estructura completa de la base de producción (tablas, reglas, funciones, disparadores, políticas RLS, permisos). La genera `scripts/exportar-esquema.mjs`. No se edita a mano. |
| `migrations/0001` a `0004` | Los cambios que se hicieron antes de tener la foto. Ya están incluidos en ella; sobre la foto no cambian nada (son idempotentes). |
| `migrations/0005_cerrar_escrituras_directas.sql` | Arreglo de seguridad que salió de revisar la foto: cierra escrituras que un cliente podía hacer sin pasar por la app. Probado en desarrollo. |
| `migrations/0006_locales.sql` | Fase 1: la tabla `locales`, Roble como local de demostración, `local_id` en las 10 tablas de la barbería y el candado doble. |
| `migrations/0007_permisos_por_local.sql` | Fase 2: equipo, membresías y las políticas por local (el cuadro de quién ve qué). |
| `migrations/0008_locales_en_la_web.sql` | Fase 3a: el rubro de cada local, las direcciones reservadas, los datos públicos de un local (`datos_del_local`) y qué puede hacer cada uno en un local (`permisos_en_local`). |
| `migrations/0009_sin_local_por_defecto.sql` | Fase 3a: se termina el "Roble por defecto" (salvo `mp_conexion`, hasta la Fase 4). En producción va DESPUÉS de publicar el código de la Fase 3a. |
| `migrations/0010_horarios.sql` | Fase 3b: horarios reales (tablas `horarios` y `ausencias`, `guardar_horarios`), reglas de reserva de cada local (anticipación, días adelante, zona horaria) y Roble de lunes a sábado de 10 a 20. |
| `migrations/0011_cobros_por_local.sql` | Fase 4a: una conexión de Mercado Pago por local (con qué cuenta), la seña "devuelta", la caja acepta ventas de invitados, y las cuatro funciones que aplican un pago ya verificado (solo el servidor). En producción va ANTES de publicar el código de la Fase 4a. |
| `migrations/0012_sin_mecanismo_temporal.sql` | Fase 4b: saca el disparador temporal de la Fase 2 que copiaba la membresía de barbero desde el perfil (el código ya la crea directamente). No borra datos. |
| `migrations/0013_permisos_minimos.sql` | Fase 5: segunda cerradura en los permisos de Postgres de las tablas de la barbería (la clave pública solo lee; nadie tiene truncate, trigger ni references). No toca lo de 369 ni borra datos. |
| `migrations/0014` en adelante | Los cambios que siguen. Cada uno se prueba primero en desarrollo. |
| `rescate/volver-antes-de-0009-y-0012.sql` | **No es una migración** (nadie la corre sola): solo para una emergencia en el pase a producción, si hubiera que volver al código viejo después de la última tanda. Ver `docs/PASE-A-PRODUCCION.md`. |
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

# Comprobar que la base está bien armada por local y que lo de 369 no cambió
# (solo desarrollo)
node scripts/verificar-locales.mjs

# Probar la base como alguien que no usa la app (solo desarrollo)
node scripts/probar-seguridad.mjs

# TODAS las pruebas con un solo comando, con un resumen (solo desarrollo; las de
# navegador corren si la app está levantada)
npm run probar

# Probar que cada cuenta ve y toca solo lo de su local (solo desarrollo)
node scripts/probar-aislamiento.mjs

# La matriz completa: cada tabla × cada tipo de cuenta × cada operación, más los
# permisos de Postgres, las funciones expuestas y el Storage (solo desarrollo)
node scripts/probar-matriz.mjs

# Probar la reserva de turnos con un navegador, como un cliente (solo desarrollo;
# la app tiene que estar levantada: npm run build && npx next start -H 127.0.0.1)
node scripts/probar-reservas.mjs

# Probar dos locales en la misma web con un navegador: cada uno ve y toca solo
# lo suyo (solo desarrollo; con la app levantada, igual que la de arriba)
node scripts/probar-locales.mjs

# Probar los horarios con un navegador: horario cortado, profesional con horario
# propio, licencias, feriados, la anticipación y el panel (solo desarrollo; con la app levantada)
node scripts/probar-horarios.mjs

# Probar los cobros con un navegador y un Mercado Pago de mentira: cada local
# cobra en su cuenta, los pagos se verifican, las demos no cobran (solo
# desarrollo; la app se levanta distinto: ver arriba de probar-cobros.mjs)
node scripts/probar-cobros.mjs

# Probar las fotos con un navegador: se achican, pierden el GPS, van a la carpeta
# del local, el servidor rechaza lo que no es una foto, el tope (solo desarrollo;
# con la app levantada)
node scripts/probar-imagenes.mjs

# Probar las cuentas de barbero y su panel con un navegador (solo desarrollo; con
# la app levantada)
node scripts/probar-panel-barbero.mjs

# Cada uso de la llave del servidor, revisado: uno nuevo sin revisar hace fallar
# (no necesita la base ni la app)
node scripts/verificar-llave-servidor.mjs

# El equipo de la plataforma (Nico admin, Delfina comercial)
node scripts/equipo.mjs listar

# Copia de seguridad de producción (solo lectura; queda en respaldos/, que no se sube)
node scripts/respaldar-base.mjs --env .env.produccion.local
```

La copia de seguridad se hace antes de cada cambio en producción: el plan
gratis de Supabase no hace copias solo.
