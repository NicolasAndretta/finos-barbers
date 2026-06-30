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

## 🧹 Menor
- Admin de turnos: mostrar `metodo_pago` + `sena_estado` + botón "confirmar seña" (transferencias).
- Limpiar productos demo viejos inactivos del admin (nombres de prueba).
- Formato de precios con separador de miles (`$8.500`).
- Menú mobile (hamburguesa) en la home.
