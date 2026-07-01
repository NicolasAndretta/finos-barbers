# ROADMAP — Finos Barbers

Estado al 29/06/2026. Proyecto que pasa de demo a **cliente real (Leandro)**.

## ✅ Hecho (rebrand visual + contenido)
- Identidad de marca aplicada: **B&N + acento madera/cobre**, fiel al manual de Fino's.
  - Tokens en `globals.css` (remapeo de `amber-*` → madera), fuentes **Bevan** (display)
    + **Montserrat** (body), textura de madera sutil.
- **Home premium** reconstruida con contenido real: hero con foto del local, servicios,
  barberos, "cómo funciona", reseñas, galería, ubicación + mapa, WhatsApp flotante.
- **Logo** transparente (blanco/negro) en home, paneles (cliente/admin) y auth.
- Datos del negocio centralizados en `src/lib/site.ts` (dirección, IG, TikTok, seña 40%,
  alias de pago, medios de pago). ⚠️ Faltan: WhatsApp real y horarios reales (TODO Leandro).
- **5 productos reales Fighters** cargados en la tienda con sus fotos.
- Responsive verificado (mobile/tablet/desktop). Build + lint OK.
- Los 2 bugs del viejo `BUGS.md` ya estaban resueltos en el código.

## ✅ Schema aplicado (migración 0001)
Acceso DDL resuelto con `scripts/migrate.mjs` (lee `SUPABASE_DB_URL` del `.env.local`
gitignoreado). Ya está en la base, respetando el patrón RLS existente (`is_admin()`):
- `pedidos.user_id` nullable + `cliente_nombre/email/telefono` (base para guest checkout).
- Tabla `categorias` (productos y servicios, subcategorías vía `parent_id`).
- `productos.categoria_id` + `productos.stock_minimo`; `servicios.categoria_id`.
- `barberos.bio/foto_url/especialidad/dias`.
- Tabla `resenas` + RLS (lectura pública de visibles, escritura admin).

## ✅ Código de app sobre el schema (hecho y verificado)
- **Guest checkout**: tienda y checkout **públicos** (grupo `(tienda)`), compra sin
  cuenta con datos de invitado, pedido creado server-side con service role validado.
- **Categorías/subcategorías**: ABM en `/admin/categorias` + asignación; seed real.
- **Stock**: `stock_minimo` configurable + badge "Stock bajo"/"Sin stock" + aviso resumen.
- **Barberos**: ABM en `/admin/barberos` (bio/foto/especialidad/días) + home dinámica.
- **Reseñas**: ABM en `/admin/resenas` + sección pública desde `resenas`.

## ✅ Pagos del turno (migración 0002 + flujo, verificado en UI)
- Al reservar, **seña del 40%** (`SITE.senaPorcentaje`) calculada sobre el precio.
- **3 medios**: Mercado Pago (redirige y confirma al volver), Transferencia (muestra
  alias `ramon.falcon.leandro` + comprobante por WhatsApp), Efectivo en el local.
- Campos en `turnos`: `metodo_pago`, `sena_monto`, `sena_estado`, `mp_*`.
- Credenciales por env (MP), nunca hardcodeadas. Falta **probar un pago MP real** end-to-end.

## ✅ Cobros online con OAuth (construido — falta credenciales + prueba en vivo)
**Código completo** (migración 0003 + `lib/mp-oauth.ts` + rutas + panel):
- `mp_conexion` (tokens protegidos por RLS, solo server).
- `lib/mp-oauth.ts`: URL de autorización, intercambio de código, **refresh** automático,
  `getAccessTokenComercio()` (con fallback al token del `.env`).
- `/api/mp/oauth/connect` (genera state anti-CSRF + redirige) y `/api/mp/oauth/callback`
  (valida state, cambia código por token, guarda).
- `/admin/pagos`: estado de conexión + botón "Conectar Mercado Pago" / "Desconectar".
- Checkout y seña de turnos usan el token del comercio conectado.

**Falta para activarlo (lo hace Nico):**
1. Crear la **app de Mercado Pago** (panel developers de Andretta Studio) → `MP_CLIENT_ID`
   + `MP_CLIENT_SECRET` en `.env.local` / env del hosting. Redirect URI:
   `https://firebrick-giraffe-301726.hostingersite.com/api/mp/oauth/callback`.
2. **Deploy a Hostinger** (el callback necesita estar online).
3. Entrar a `/admin/pagos` → "Conectar" → autorizar → probar un pago.

## ✅ Pulido final (verificado en mobile con capturas)
- **Menú mobile (hamburguesa)** en la home: drawer con portal a `document.body`
  (para que el `fixed` se ancle al viewport y no al header con `backdrop-blur`).
- **Formato de precios** con separador de miles (`$8.500`) vía helper `lib/format.ts`
  (`formatPrecio`, es-AR), aplicado en tienda, carrito, checkout, reserva, turnos
  del cliente y panel admin.
- **Admin de turnos**: muestra `metodo_pago` + `sena_estado` y permite confirmar la
  seña de transferencias/efectivo a mano (`adminConfirmarSena`).

## ✅ Auth completa (verificado en mobile)
- **Recuperar contraseña**: `/recuperar` (pide email → mail) + `/restablecer` (setea la
  nueva), link en el login, banner de éxito. Callback respeta `?next=` (rutas internas).
- **Confirmación de email**: ya estaba (registro + callback `signup`/`recovery`). Si no
  llegan los mails, es config de Supabase (Auth → email/SMTP), no del código.

## ✅ Cargar imágenes desde la PC (verificado end-to-end)
- Bucket público `imagenes` (Supabase Storage, 5 MB, `scripts/crear-bucket.mjs`).
- Acción `subirImagen` (solo admin, valida tipo/tamaño) + componente reutilizable
  `ImageUploadField` (subir desde PC **o** pegar URL, con preview) en productos y barberos.

## ✅ Cuentas de barbero con acceso limitado (verificado: no entra al admin)
- Migración 0004: rol `barbero` + `profiles.barbero_id` (vínculo a su registro).
- Área `/barbero`: **Mi agenda** (solo sus turnos) + **Clientes** (solo lectura). No ve
  stock/servicios/cobros/finanzas. `requireBarbero` + redirects por rol + proxy.
- El admin crea la cuenta de cada barbero desde `/admin/barberos`.
- **Futuro (Opción 2):** panel donde Leandro habilita permisos extra por barbero.

## 🧹 Menor (pendiente)
- Limpiar productos demo viejos inactivos del admin (nombres de prueba). ⚠️ Requiere
  decisión de Nico sobre cuáles borrar (operación destructiva sobre la base).
- Reemplazar la agenda del barbero por un calendario visual (hoy es lista por día).
