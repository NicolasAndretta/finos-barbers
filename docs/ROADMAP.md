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

## 🔒 Pendiente — necesita acceso DDL a Supabase
Estas features requieren **crear/alterar tablas** en Supabase. Con las keys REST del
`.env.local` se pueden insertar datos, pero **no correr CREATE/ALTER TABLE**.

**Para destrabar (elegir una):**
1. Pasar la **connection string de Postgres** de Supabase (Settings → Database →
   Connection string). Con eso se aplica y verifica todo de punta a punta. *(No es un
   dato ultra-sensible, pero igual conviene rotarla después si se comparte.)*
2. O pegar el SQL de migración en el **SQL Editor** de Supabase (una vez).

### Migración a aplicar
- **Guest checkout** (comprar sin cuenta): `pedidos.user_id` nullable + columnas
  `cliente_nombre`, `cliente_email`, `cliente_telefono`. Hacer la tienda pública
  (hoy `(client)/layout.tsx` exige `requireUser()`). Checkout sin login.
- **Categorías y subcategorías**: tabla `categorias` (`id, nombre, slug, tipo[producto|servicio],
  parent_id, orden, activo`). FK `productos.categoria_id` y `servicios.categoria_id`.
- **Stock pro**: `productos.stock_minimo` + alertas de stock bajo en el admin.
- **Barberos**: `bio`, `foto_url`, `especialidad`, `dias[]` (ej. Facundo: sábados).
- **Reseñas**: tabla `resenas` (`nombre, texto, rating, visible, orden`) administrable.
- RLS: lectura pública de catálogo/reseñas; escritura solo admin.

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
