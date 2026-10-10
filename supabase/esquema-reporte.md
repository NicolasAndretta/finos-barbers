# Esquema de la base — reporte

Generado por `scripts/exportar-esquema.mjs` el 2026-10-10 desde proyecto mcfgvxgcdnhgjbagrirr — entorno: produccion (Postgres 17.6).

> Resumen para leer de un vistazo lo que hay en `supabase/migrations/0000_base.sql`.
> No hace falta editarlo: se vuelve a generar con cada exportación.

## Resumen

- **14** tablas, **24** políticas RLS, **3** funciones, **1** disparadores, **12** índices sueltos.
- Storage: bucket `galeria` (público), bucket `imagenes` (público).

## Alertas para revisar

- 🔴 `public.handle_new_user()` lee `raw_user_meta_data` y menciona `role`. Revisar: si copia el rol que manda el navegador al registrarse, cualquiera podría crearse una cuenta de admin.
- 🟠 En `profiles` hay políticas que dejan a cada usuario editar su fila ("profiles: cliente actualiza su perfil"). Revisar que no pueda cambiarse su propia columna `role`.
- ℹ️ `fotos` tiene RLS y ninguna política: solo el servidor (service role) la puede usar. Está bien si es a propósito (por ejemplo, tokens).
- ℹ️ `mp_conexion` tiene RLS y ninguna política: solo el servidor (service role) la puede usar. Está bien si es a propósito (por ejemplo, tokens).
- ℹ️ `trabajos` tiene RLS y ninguna política: solo el servidor (service role) la puede usar. Está bien si es a propósito (por ejemplo, tokens).
- ℹ️ `videos` tiene RLS y ninguna política: solo el servidor (service role) la puede usar. Está bien si es a propósito (por ejemplo, tokens).

🔴 grave · 🟠 revisar · ℹ️ informativo

## Tablas

### `barberos`

- RLS: activado ✓ · Políticas: 2
- Columnas: `id` uuid (obligatoria), `nombre` text (obligatoria), `apellido` text (obligatoria), `activo` boolean (obligatoria), `created_at` timestamp with time zone (obligatoria), `bio` text, `foto_url` text, `especialidad` text, `dias` text[]
- Política **"barberos: admin puede modificar"** — all para public · ve/toca filas si: `public.is_admin()`
- Política **"barberos: publico puede leer"** — select para public · ve/toca filas si: `true`

### `categorias`

- RLS: activado ✓ · Políticas: 2
- Columnas: `id` uuid (obligatoria), `nombre` text (obligatoria), `slug` text (obligatoria), `tipo` text (obligatoria), `parent_id` uuid, `orden` integer (obligatoria), `activo` boolean (obligatoria), `created_at` timestamp with time zone
- Apunta a: `parent_id` → `public.categorias`
- Política **"categorias_admin_all"** — all para public · ve/toca filas si: `public.is_admin()` · escribe filas si: `public.is_admin()`
- Política **"categorias_public_read"** — select para public · ve/toca filas si: `true`

### `fotos`

- RLS: activado ✓ · Políticas: 0
- Columnas: `id` uuid (obligatoria), `trabajo_id` uuid (obligatoria), `etiqueta` text (obligatoria), `antes_url` text, `despues_url` text (obligatoria), `orden` integer (obligatoria)
- Apunta a: `trabajo_id` → `public.trabajos`

### `items_pedido`

- RLS: activado ✓ · Políticas: 3
- Columnas: `id` uuid (obligatoria), `pedido_id` uuid (obligatoria), `producto_id` uuid (obligatoria), `nombre` text (obligatoria), `precio` numeric(10,2) (obligatoria), `cantidad` integer (obligatoria), `created_at` timestamp with time zone
- Apunta a: `pedido_id` → `public.pedidos`, `producto_id` → `public.productos`
- Política **"items_pedido_admin_all"** — all para public · ve/toca filas si: `(EXISTS ( SELECT 1 FROM public.profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` · escribe filas si: `(EXISTS ( SELECT 1 FROM public.profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))`
- Política **"items_pedido_user_insert"** — insert para public · escribe filas si: `(EXISTS ( SELECT 1 FROM public.pedidos WHERE ((pedidos.id = items_pedido.pedido_id) AND (pedidos.user_id = auth.uid()))))`
- Política **"items_pedido_user_select"** — select para public · ve/toca filas si: `(EXISTS ( SELECT 1 FROM public.pedidos WHERE ((pedidos.id = items_pedido.pedido_id) AND (pedidos.user_id = auth.uid()))))`

### `mp_conexion`

- RLS: activado ✓ · Políticas: 0
- Columnas: `id` uuid (obligatoria), `mp_user_id` text, `access_token` text (obligatoria), `refresh_token` text, `public_key` text, `expires_at` timestamp with time zone, `scope` text, `created_at` timestamp with time zone, `updated_at` timestamp with time zone

### `pedidos`

- RLS: activado ✓ · Políticas: 3
- Columnas: `id` uuid (obligatoria), `user_id` uuid, `estado` text (obligatoria), `tipo_entrega` text (obligatoria), `direccion_envio` text, `total` numeric(10,2) (obligatoria), `mp_preference_id` text, `mp_payment_id` text, `created_at` timestamp with time zone, `cliente_nombre` text, `cliente_email` text, `cliente_telefono` text
- Apunta a: `user_id` → `auth.users`
- Política **"pedidos_admin_all"** — all para public · ve/toca filas si: `(EXISTS ( SELECT 1 FROM public.profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` · escribe filas si: `(EXISTS ( SELECT 1 FROM public.profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))`
- Política **"pedidos_user_insert"** — insert para public · escribe filas si: `(user_id = auth.uid())`
- Política **"pedidos_user_select"** — select para public · ve/toca filas si: `(user_id = auth.uid())`

### `productos`

- RLS: activado ✓ · Políticas: 2
- Columnas: `id` uuid (obligatoria), `nombre` text (obligatoria), `descripcion` text (obligatoria), `precio` numeric(10,2) (obligatoria), `stock` integer (obligatoria), `imagen_url` text, `categoria` text (obligatoria), `activo` boolean (obligatoria), `created_at` timestamp with time zone, `categoria_id` uuid, `stock_minimo` integer (obligatoria)
- Apunta a: `categoria_id` → `public.categorias`
- Política **"productos_admin_all"** — all para public · ve/toca filas si: `(EXISTS ( SELECT 1 FROM public.profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` · escribe filas si: `(EXISTS ( SELECT 1 FROM public.profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))`
- Política **"productos_select_activos"** — select para public · ve/toca filas si: `(activo = true)`

### `profiles`

- RLS: activado ✓ · Políticas: 3
- Columnas: `id` uuid (obligatoria), `email` text (obligatoria), `nombre` text (obligatoria), `apellido` text (obligatoria), `role` text (obligatoria), `created_at` timestamp with time zone (obligatoria), `barbero_id` uuid
- Apunta a: `barbero_id` → `public.barberos`, `id` → `auth.users`
- Política **"profiles: admin acceso total"** — all para public · ve/toca filas si: `public.is_admin()`
- Política **"profiles: cliente actualiza su perfil"** — update para public · ve/toca filas si: `(auth.uid() = id)` · escribe filas si: `((auth.uid() = id) AND (role = 'client'::text))`
- Política **"profiles: cliente lee su perfil"** — select para public · ve/toca filas si: `(auth.uid() = id)`

### `resenas`

- RLS: activado ✓ · Políticas: 2
- Columnas: `id` uuid (obligatoria), `nombre` text (obligatoria), `texto` text (obligatoria), `rating` integer (obligatoria), `visible` boolean (obligatoria), `orden` integer (obligatoria), `created_at` timestamp with time zone
- Política **"resenas_admin_all"** — all para public · ve/toca filas si: `public.is_admin()` · escribe filas si: `public.is_admin()`
- Política **"resenas_public_read"** — select para public · ve/toca filas si: `(visible = true)`

### `servicios`

- RLS: activado ✓ · Políticas: 2
- Columnas: `id` uuid (obligatoria), `nombre` text (obligatoria), `descripcion` text (obligatoria), `precio` numeric(10,2) (obligatoria), `duracion_minutos` integer (obligatoria), `activo` boolean (obligatoria), `created_at` timestamp with time zone (obligatoria), `categoria_id` uuid
- Apunta a: `categoria_id` → `public.categorias`
- Política **"servicios: admin puede modificar"** — all para public · ve/toca filas si: `public.is_admin()`
- Política **"servicios: publico puede leer"** — select para public · ve/toca filas si: `true`

### `trabajos`

- RLS: activado ✓ · Políticas: 0
- Columnas: `id` uuid (obligatoria), `servicio` text (obligatoria), `categoria` text (obligatoria), `vehiculo` text (obligatoria), `visible` boolean (obligatoria), `en_inicio` boolean (obligatoria), `orden` integer (obligatoria), `creado_en` timestamp with time zone (obligatoria)

### `transacciones`

- RLS: activado ✓ · Políticas: 1
- Columnas: `id` uuid (obligatoria), `tipo` text (obligatoria), `categoria` text (obligatoria), `monto` numeric(12,2) (obligatoria), `descripcion` text (obligatoria), `fecha` date (obligatoria), `origen` text (obligatoria), `turno_id` uuid, `pedido_id` uuid, `created_by` uuid (obligatoria), `created_at` timestamp with time zone
- Apunta a: `created_by` → `auth.users`, `pedido_id` → `public.pedidos`, `turno_id` → `public.turnos`
- Política **"transacciones_admin_all"** — all para public · ve/toca filas si: `(EXISTS ( SELECT 1 FROM public.profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` · escribe filas si: `(EXISTS ( SELECT 1 FROM public.profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))`

### `turnos`

- RLS: activado ✓ · Políticas: 4
- Columnas: `id` uuid (obligatoria), `cliente_id` uuid (obligatoria), `barbero_id` uuid (obligatoria), `servicio_id` uuid (obligatoria), `fecha` date (obligatoria), `hora` time without time zone (obligatoria), `estado` text (obligatoria), `created_at` timestamp with time zone (obligatoria), `metodo_pago` text, `sena_monto` numeric, `sena_estado` text, `mp_preference_id` text, `mp_payment_id` text
- Apunta a: `barbero_id` → `public.barberos`, `cliente_id` → `public.profiles`, `servicio_id` → `public.servicios`
- Política **"turnos: admin acceso total"** — all para public · ve/toca filas si: `public.is_admin()`
- Política **"turnos: cliente cancela su turno"** — update para public · ve/toca filas si: `(auth.uid() = cliente_id)` · escribe filas si: `((auth.uid() = cliente_id) AND (estado = 'cancelado'::text))`
- Política **"turnos: cliente crea turno propio"** — insert para public · escribe filas si: `((auth.uid() = cliente_id) AND (estado = 'pendiente'::text))`
- Política **"turnos: cliente ve sus turnos"** — select para public · ve/toca filas si: `(auth.uid() = cliente_id)`

### `videos`

- RLS: activado ✓ · Políticas: 0
- Columnas: `id` uuid (obligatoria), `titulo` text (obligatoria), `categoria` text (obligatoria), `instagram_code` text, `tiktok_id` text, `thumbnail_url` text, `visible` boolean (obligatoria), `orden` integer (obligatoria), `creado_en` timestamp with time zone (obligatoria), `en_inicio` boolean (obligatoria)

## Funciones

- `public.handle_new_user()` — plpgsql, security definer, search_path fijo ✓
- `public.is_admin()` — sql, security definer, search_path fijo ✓
- `public.rls_auto_enable()` — plpgsql, security definer, search_path fijo ✓

## Disparadores

- `on_auth_user_created` en `auth.users` → `public.handle_new_user()`

## Datos de ejemplo para desarrollo (`supabase/seed-desarrollo.sql`)

- `barberos`: 3 fila(s)
- `categorias`: 5 fila(s)
- `productos`: 8 fila(s)
- `resenas`: 4 fila(s)
- `servicios`: 3 fila(s)
