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

## 🛠️ Pendiente — código de app sobre el schema nuevo
Ahora que el schema existe, falta el código que lo usa:
- **Guest checkout**: tienda pública (hoy `(client)/layout.tsx` exige `requireUser()`),
  checkout sin login (insertar pedido server-side con service role, validado), página
  de éxito legible por invitado.
- **Admin de categorías/subcategorías**: ABM + asignarlas a productos y servicios.
- **Stock**: alertas de stock bajo (`stock <= stock_minimo`) en el panel.
- **Barberos**: editar bio/foto/especialidad/días en el admin y mostrarlos en la home/reserva.
- **Reseñas**: ABM en el admin + sección pública leyendo de `resenas`.
- Seed de demo de todo lo anterior (categorías reales, bios de Leandro/Facundo, reseñas).

## 💳 Pendiente — pagos del turno (pedido de Nico, 29/06)
- Al **reservar turno** se debe poder pagar con **todos los medios** (no solo Mercado
  Pago): transferencia, tarjetas, efectivo en el local, etc.
- Cobrar **40% de seña** al reservar (el resto en el local).
- Integraciones hechas con profesionalidad y **sin pasarle datos sensibles a Nico**
  (credenciales por variables de entorno, nunca hardcodeadas ni compartidas en claro).

## 🧹 Menor
- Limpiar productos demo viejos inactivos del admin (nombres de prueba).
- Formato de precios con separador de miles (`$8.500` en vez de `$8500`).
- Menú mobile (hamburguesa) en la home para los links de nav.
