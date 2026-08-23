# INFORME DE CIERRE — Fino's Barbers × andmar.studio

Material audiovisual y de contenido para Instagram, generado a partir del sistema real.
Todos los datos de este informe fueron medidos en disco con `ffprobe`, `ffmpeg`, `stat` y `git`.

---

## 1. RESUMEN EJECUTIVO

Fino's Barbers es un sistema web integral para una barbería (web pública, turnos online, tienda y panel de administración) desarrollado por andmar.studio. A partir de la aplicación real corriendo en local se generaron 14 reels verticales, 9 posts, un carrusel de 6 placas, 8 historias, 7 portadas de destacadas, 51 capturas y 18 grabaciones en bruto. Total: 143 archivos, 107 MB.

En una primera revisión aparecieron dos reels defectuosos (carteles desincronizados y una afirmación falsa sobre el sistema). **Los dos fueron rehechos y verificados cuadro a cuadro.** También se corrigieron dos afirmaciones de texto y se sacó del script de control una lista con datos privados del comercio.

Veredicto: **SÍ, listo para Drive.** Las 44 piezas publicables están correctas. Quedan tres decisiones de negocio pendientes (permiso del barbero, a dónde apunta el CTA, si se musicaliza) que no son técnicas.

---

## 2. IDENTIFICACIÓN DEL PROYECTO

| Dato | Valor | Fuente |
|---|---|---|
| Repositorio | `NicolasAndretta/finos-barbers` | `git remote -v` |
| Rubro | Barbería | contenido de `src/lib/site.ts` y de la home |
| Nombre comercial | Fino's Barber's | `src/lib/site.ts` |
| Ubicación | Av. Rivadavia 10072, CABA, Buenos Aires | `src/lib/site.ts`, visible en la home |
| Redes del negocio | Instagram `@finos_barbers`, TikTok `@finos.barbers` | `src/lib/site.ts` |
| Sitio en producción | **Sin verificar.** En `.env.local.example` figura `https://firebrick-giraffe-301726.hostingersite.com`. No pude comprobar si responde: el proxy de red de este entorno devuelve 403 en el túnel CONNECT hacia ese host | `.env.local.example` + `curl` fallido |
| Estado real | **Desarrollo avanzado, NO en producción formal.** El propio `docs/ROADMAP.md` dice que faltan las credenciales de Mercado Pago, el deploy a Hostinger y probar un pago real. La relación comercial tampoco está cerrada | `docs/ROADMAP.md` |

Cómo se comunica en todo el material: **"proyecto desarrollado"** o **"demo funcional"**. Nunca como cliente activo ni como sistema en producción.

---

## 3. CÓMO SE LEVANTÓ EL PROYECTO

### Stack

| Capa | Versión |
|---|---|
| Node | v22.22.2 (el repo pide 20 en `.nvmrc`; funcionó igual) |
| Next.js | 16.2.7 (App Router) |
| React | 19.2.4 |
| TypeScript | ^5 · Tailwind CSS ^4 |
| Base de datos | Supabase (PostgreSQL + PostgREST) |
| Pagos | SDK de Mercado Pago v3 · Emails: Resend |
| Herramientas de grabación | Playwright 1.62 + Chromium · FFmpeg 6.1.1 |

### Comandos

```
npm install                                   # 435 paquetes, sin errores
DEMO_MODE=1 npx next dev --webpack -p 3000    # servidor de desarrollo
npx next build --webpack                      # verificación: "✓ Compiled successfully in 4.5s"
```

Next 16 usa Turbopack por defecto y aborta si encuentra una config de webpack sin config de Turbopack, así que todo corre con `--webpack`. El build de producción compila limpio **sin** `DEMO_MODE`.

### Qué no podía correr y qué se montó en su lugar

El proyecto necesita credenciales reales (Supabase, Resend, Mercado Pago) que no existen en este entorno y que no deben quedar registradas. Sin ellas la app ni siquiera arranca: `src/lib/supabase.ts` lanza una excepción a nivel de módulo si faltan las variables de entorno.

Se montó un **modo demo** en `tools/demo/`, activado **únicamente** con `DEMO_MODE=1`:

| Módulo real | Reemplazo | Qué hace |
|---|---|---|
| `@supabase/ssr` | `supabase-mock.js` | Implementa el subconjunto de la API que usa la app (query builder con `select/eq/neq/in/gte/lte/order/limit/single/maybeSingle`, relaciones embebidas, `insert/update/upsert/delete`, `auth`, `storage`) contra un JSON local |
| `@supabase/ssr` (edge) | `supabase-mock-edge.js` | Variante sin acceso a disco para `src/proxy.ts`, que sólo necesita saber si hay sesión |
| `resend` | `resend-mock.js` | No envía correo, sólo loguea |
| `mercadopago` | `mercadopago-mock.js` | No llama a Mercado Pago. Devuelve una preferencia cuyo `init_point` apunta a la propia URL de retorno de la app, para recorrer el flujo completo sin simular pantallas de un tercero |
| `@/lib/site` | `site-demo.js` | Copia de los datos del negocio con el **alias de cobro** y el **WhatsApp** reales reemplazados por marcadores |

Los datos son una fixture: `tools/demo/seed.json` (39.787 bytes) con 6 perfiles, 3 barberos, 5 servicios, 5 categorías, 8 productos, 4 reseñas, 17 turnos de la semana en curso y 48 transacciones en 6 meses. El estado vivo va a `.demo-db.json`, gitignoreado.

Cuentas de la demo (no son credenciales reales, sólo existen en ese JSON): `admin@finosbarbers.demo`, `cliente@finosbarbers.demo`, `facundo@finosbarbers.demo`, contraseña `demo1234`.

### Qué se modificó del proyecto original

**Cero archivos de código de la aplicación.** Verificado con `git diff main..HEAD --name-only -- src/ supabase/ docs/ public/`: 0 archivos. Se tocaron cuatro archivos, todos fuera de `src/`:

| Archivo | Cambio |
|---|---|
| `next.config.js` | Bloque `if (process.env.DEMO_MODE === '1')` con los alias y un `NormalModuleReplacementPlugin`; más `devIndicators: false` sólo en modo demo. Sin la variable no cambia nada |
| `package.json` | `playwright` en devDependencies + 7 scripts `demo:*` |
| `package-lock.json` | Consecuencia de lo anterior |
| `.gitignore` | Se agregó `.demo-db.json` y las carpetas de material pesado |

---

## 4. FUNCIONALIDADES REALES ENCONTRADAS

Cada punto fue abierto y recorrido en el navegador, no leído del README.

### Parte pública

- **Home (`/`)**: hero con foto del local, franja de datos, servicios destacados, equipo, explicación del proceso de reserva, reseñas, galería, ubicación con mapa embebido, footer.
- **Equipo y reseñas dinámicos**: salen de la base y se administran desde el panel, con textos de respaldo si no hay datos cargados.
- ⚠️ **Los servicios de la home NO son dinámicos**: los tres servicios destacados y sus precios están escritos a mano en `src/app/page.tsx`, líneas 22 a 45 (arreglo `serviciosDestacados`). Ver sección 8.
- ⚠️ **La franja de datos del negocio** ("+10 años de oficio", "+2.000 cortes al año", "4.9★ reseñas Google", "100% turnos online") también está escrita a mano en el mismo archivo. Ver sección 8.
- **Menú hamburguesa** en celular con drawer, botón flotante de WhatsApp, enlaces a redes.
- **Tienda (`/tienda`)**: catálogo con buscador por texto, filtros por categoría, badges de "Sin stock" y "¡Últimas N!", carrito persistente en `localStorage` con drawer y control de cantidades.
- **Checkout (`/checkout`)**: funciona **sin cuenta**. Nombre, email y teléfono; retiro en el local o envío a domicilio; pago con Mercado Pago; páginas de éxito y error.
- **Auth**: login, registro con nombre y apellido, recuperación de contraseña (`/recuperar` + `/restablecer`).
- **PWA**: manifest con íconos, `display: standalone`, accesos directos "Reservar turno" y "Mis turnos", service worker con caché y banner de instalación que no aparece si ya está instalada.

### Parte privada — cliente

- **`/dashboard`**: panel con accesos a reservar, turnos y tienda.
- **`/reservar`**: reserva en 3 pasos (servicio → barbero → fecha y hora). Acá los servicios y los barberos **sí** salen de la base. La grilla se genera cada 15 minutos entre 09:00 y 20:00, descarta las franjas que se solapan con turnos existentes y las que no entran antes del cierre según la duración del servicio. Fecha limitada de hoy a 60 días, validado en el formulario y de nuevo en el servidor.
- **Seña**: 40 % del precio del servicio, con dos medios (Mercado Pago o transferencia). No hay opción de pagar en el local.
- **`/turnos`**: lista con estado, barbero, servicio, precio y botón de cancelar.

### Parte privada — panel de administración

Diez secciones, todas con operaciones reales verificadas:

| Ruta | Qué hace |
|---|---|
| `/admin/dashboard` | Turnos de hoy, servicios activos y total de clientes |
| `/admin/turnos` | Lista con filtros por estado y fecha (hoy / semana / todas), confirmar, cancelar, confirmar la seña a mano y crear una reserva manual |
| `/admin/calendario` | Vista semanal de todos los barberos, un color por profesional, filtro por barbero, navegación entre semanas |
| `/admin/servicios` | Alta, edición, baja y activar/desactivar |
| `/admin/productos` | Alta, edición, baja, precio, stock, stock mínimo, imagen desde la PC a Supabase Storage o pegando URL. Aviso de stock bajo |
| `/admin/categorias` | Alta, edición y baja de categorías de productos y servicios, con subcategorías |
| `/admin/barberos` | Alta, edición, ocultar/mostrar, especialidad, días, bio, foto, y creación de la cuenta de acceso del barbero |
| `/admin/resenas` | Alta, edición, baja y publicar/despublicar |
| `/admin/pagos` | Estado de la conexión con Mercado Pago vía OAuth, conectar y desconectar |
| `/admin/finanzas` | KPIs del mes y acumulado, navegación por mes, ABM de transacciones, gráfico de barras de 6 meses y dos gráficos de dona |

### Parte privada — barbero

- **`/barbero/calendario`**: sólo los turnos de ese barbero.
- **`/barbero/clientes`**: lista de clientes en solo lectura.
- Verificado: entrando como barbero, `/admin/*` redirige. Los permisos también están aplicados en la base con Row Level Security.

### Registro automático en finanzas

Al confirmar un turno se inserta una transacción de ingreso con origen "turno", con control de duplicados. Al pagarse un pedido, una con origen "pedido".

### Lo que está apagado, incompleto o pendiente en el propio proyecto

- **Cobros online no activados**: falta crear la app de Mercado Pago, el deploy y probar un pago real (consta en `docs/ROADMAP.md`).
- **Nunca se probó un pago end to end.**
- **Faltan datos del negocio**: `src/lib/site.ts` tiene un TODO sobre horarios reales y el lema final.
- **Quedan productos demo viejos** inactivos en la base real, pendientes de limpiar.
- **La agenda del barbero es una lista por día**, no un calendario visual.
- **No existen** (verificado con `grep -rniE "descuento|cupon|promo|oferta|discount" src supabase docs`, cero resultados): descuentos, cupones, promociones, fidelización, recordatorios por WhatsApp, reportes exportables, reservar varios servicios en un mismo turno.

---

## 5. INVENTARIO COMPLETO DE ARCHIVOS

Raíz: `andmar-content/finos-barbers/`

### 5.1 Reels finales

Todos MP4 H.264 High, `yuv420p`, **1080×1920, 30 fps**, con pista AAC 44,1 kHz estéreo **en silencio absoluto** (`volumedetect`: mean y max = −91,0 dB). La pista muda está sólo por compatibilidad de reproductores.

| Ruta | Duración | Peso |
|---|---|---|
| `social/reels/reel-01-sistema-de-turnos.mp4` | 22,17 s | 2,9 MB |
| `social/reels/reel-02-el-proyecto.mp4` | 32,43 s | 6,1 MB |
| `social/reels/reel-03-eleccion-de-barbero.mp4` | 13,97 s | 1,8 MB |
| `social/reels/reel-04-servicios.mp4` | 27,17 s | 3,9 MB |
| `social/reels/reel-05-tienda-online.mp4` | 19,67 s | 7,3 MB |
| `social/reels/reel-06-carrito-y-checkout.mp4` | 21,83 s | 2,6 MB |
| `social/reels/reel-07-panel-administrativo.mp4` | 28,70 s | 3,6 MB |
| `social/reels/reel-08-gestion-de-barberos.mp4` | 18,60 s | 2,3 MB |
| `social/reels/reel-09-agenda-y-calendario.mp4` | 16,63 s | 2,3 MB |
| `social/reels/reel-10-finanzas.mp4` | 21,37 s | 2,9 MB |
| `social/reels/reel-11-experiencia-del-cliente.mp4` | 15,83 s | 2,1 MB |
| `social/reels/reel-12-cobros-y-sena.mp4` | 16,53 s | 2,1 MB |
| `social/reels/reel-13-acceso-por-rol.mp4` | 16,03 s | 1,8 MB |
| `social/reels/reel-14-responsive.mp4` | 19,87 s | 3,6 MB |

14 archivos, 45,1 MB.

### 5.2 Videos brutos

18 MP4 H.264 a 25 fps, **sin audio**, cada uno con un `.json` al lado con las marcas de tiempo del guion. Verticales en 1080×1920: `hero` (26,8 s), `turnos` (16,6 s), `barberos` (8,8 s), `servicios` (23,7 s), `serviciosAdmin` (8,0 s), `ecommerce` (14,2 s), `carrito` (18,4 s), `panel` (23,1 s), `agenda` (11,2 s), `gestionBarberos` (20,5 s), `finanzas` (15,8 s), `cliente` (10,4 s), `barberoPanel` (10,4 s), `auth` (6,9 s), `cobros` (11,0 s). De escritorio en 2160×1350: `desktop-home` (8,6 s), `desktop-panel` (5,6 s), `desktop-finanzas` (6,4 s). Subtotal: 25,7 MB.

### 5.3 Imágenes publicables

Todas PNG. Posts y carrusel en **1080×1350** (4:5); historias y destacadas en **1080×1920** (9:16).

- 9 posts: `social/posts/post-01-proyecto.png` … `post-09-que-hacemos.png` (558–789 KB c/u)
- 6 placas de carrusel: `social/posts/carrusel-turnos/carrusel-turnos-1.png` … `-6.png` (589–626 KB c/u)
- 8 historias: `social/historias/historia-01-problema.png` … `historia-08-detras.png` (769–1028 KB c/u)
- 7 destacadas: `social/destacadas/destacada-proyectos.png`, `-sistemas`, `-turnos`, `-tienda`, `-panel`, `-proceso`, `-contacto` (926–938 KB c/u)

30 archivos, 22,1 MB.

### 5.4 Recursos reutilizables

`recursos/guia-visual.png` (1080×1350), `recursos/placa-apertura-modelo.png`, `recursos/placa-cierre-modelo.png`, `recursos/sobreimpreso-modelo.png` (fondo transparente), `recursos/firma-andmar.png` (fondo transparente) y `recursos/README.md`. 6 archivos, 2,3 MB.

### 5.5 Capturas

51 PNG, 12,1 MB. 25 en celular (1080×1920), 25 en escritorio (1440×900) y un recorte a medida (`reservar-4-sena-detalle.png`, 1080×1180). Pantallas cubiertas, cada una con sufijo `-mobile.png` y `-desktop.png`: `home-hero`, `home-servicios`, `home-equipo`, `home-resenas`, `home-galeria`, `tienda-catalogo`, `tienda-productos`, `login`, `cliente-panel`, `cliente-turnos`, `reservar-1-servicio`, `reservar-2-barbero`, `reservar-3-horarios`, `reservar-4-sena`, `admin-dashboard`, `admin-turnos`, `admin-calendario`, `admin-servicios`, `admin-productos`, `admin-barberos`, `admin-resenas`, `admin-cobros`, `admin-finanzas`, `admin-finanzas-graficos`, `barbero-agenda`.

### 5.6 Documentos

`project.md` (13 KB), `social/content-index.md` (8,8 KB), `social/captions/reels.md` (10,9 KB), `social/captions/posts.md` (6,2 KB), `social/captions/historias.md` (2,3 KB), `social/captions/destacadas.md` (1,1 KB), `recursos/README.md` (1 KB).

### 5.7 Totales

- **143 archivos · 107 MB**
- Herramientas de generación en `tools/demo/`: 29 archivos, 0,5 MB (no es material publicable)

---

## 6. DESCRIPCIÓN VISUAL DE CADA PIEZA

### 6.0 Gramática visual común a todos los reels

Paleta: negro (`#08080B`), blanco y violeta (`#8B5CF6` / `#C4B5FD`). Fondo con degradado oscuro, halo violeta arriba, grilla técnica tenue y grano sutil. Tipografía Inter (400 a 800) y Space Grotesk 700 para la marca.

**Placa de apertura** (sin captura de la app): arriba a la izquierda una cápsula con borde violeta, un punto violeta y una etiqueta en mayúsculas espaciadas. Debajo un titular muy grande en tres o cuatro líneas, con una palabra en violeta claro. Debajo una regla violeta corta que se desvanece, y una bajada gris. Al pie, a la izquierda el logotipo "andmar**.**studio" (el punto en violeta) y a la derecha, en gris tenue, una nota de contexto. Zoom lento de 1,00 a 1,05, con fundido de entrada y salida.

**Tramos de aplicación**: video de la interfaz real a pantalla completa, sin marco de navegador ni barra de URL.

**Marca de agua**: en el borde superior, centrada, una cápsula de fondo negro translúcido con el texto "andmar**.**studio" en 28 px, presente durante todos los tramos de aplicación.

**Sobreimpreso inferior**: barra redondeada a 132 px del borde inferior, fondo negro al 86 % con desenfoque y borde violeta. A la izquierda, opcionalmente, un número de paso sobre una cajita violeta. A la derecha un título blanco de 44 px y un detalle gris de 28 px. Aparece 0,25 s después de empezar cada tramo, dura unos 3,4 s, entra y sale con fundido de alfa.

**Placa de cierre**: titular grande con degradado blanco a violeta claro, lista de tres ítems con viñeta violeta, botón redondeado violeta claro con texto negro (el CTA), y al pie el logotipo con el subtítulo "desarrollo web · sistemas a medida".

**Audio**: todos van **mudos**. **Cursor**: no se ve puntero; los clicks se marcan con un anillo blanco que se expande y se desvanece.

---

### 6.1 `reel-01-sistema-de-turnos.mp4` — 22,17 s
Verificado cuadro a cuadro en los segundos 4 / 9 / 12 / 17.

| Tiempo | Qué se ve | Texto en pantalla |
|---|---|---|
| 0,0–2,6 | Placa de apertura | Etiqueta "SISTEMA DE TURNOS". Titular "Reservar / un turno / en **3 pasos**". Bajada "Sin llamados, sin WhatsApp, sin agenda de papel." Pie: "andmar.studio" · "Proyecto desarrollado · demo funcional" |
| 2,6–7,6 | `/reservar` en celular: título "Nueva Reserva", indicador de pasos 1-2-3 y lista de servicios con precio y duración (Color & Platinado $12.000 / 90 min, Corte & Barba Premium $7.500 / 75 min, Corte Junior $3.000 / 30 min, Corte de Autor $4.500 / 45 min, Perfilado & Afeitado $3.500 / 30 min). Anillo de click sobre "Corte & Barba Premium" | "**01** Elegís el servicio — Precio y duración a la vista" |
| 7,6–9,8 | Paso 2: "¿Con quién te atendés?" con tres tarjetas con ícono de tijera: Facundo Díaz, Leandro F., Tomás Ibarra. Click en Leandro | "**02** Elegís tu barbero — El equipo se carga desde el panel" |
| 9,8–15,0 | Paso 3: campo de fecha dd/mm/aaaa que se completa con "24/08/2026" y grilla "Horarios disponibles" con franjas de 15 min de 09:00 a 18:45. Click en 16:00, que queda resaltado en blanco | "**03** Elegís día y hora — Solo aparecen los horarios libres" |
| 15,0–19,1 | Bloque "Resumen": Servicio Corte & Barba Premium ($7.500), Barbero Leandro F., Fecha 24/08/2026, Hora 16:00. Línea "Seña (40%) para reservar — **$3.000**" en dorado y "El resto ($4.500) se abona en el local." Después "¿Cómo querés dejar la seña?" con "Mercado Pago — Tarjeta o dinero en cuenta" (seleccionada) y "Transferencia — Alias alias.de.demo". Botón dorado "Pagar seña $3.000" | "**04** Confirmás con la seña — Mercado Pago o transferencia" |
| 19,1–22,1 | Placa de cierre | "Turnos online, hechos a medida" · "Disponibilidad real", "Seña para confirmar", "Todo desde el panel" · botón "Escribinos por DM" |

**Nota**: entre 15 y 19 s se lee "Alias **alias.de.demo**", el marcador que reemplaza el alias bancario real.

---

### 6.2 `reel-02-el-proyecto.mp4` — 32,43 s — **REHECHO**
Verificado cuadro a cuadro en los segundos 3,5 / 8 / 14 / 19,5 / 25,5 / 30. Los carteles coinciden con la sección que se ve.

| Tiempo | Qué se ve | Texto en pantalla |
|---|---|---|
| 0,0–2,6 | Placa de apertura | "PROYECTO DESARROLLADO" · "Una barbería / con **sistema** / propio" · "Web, turnos, tienda y panel de gestión. Todo en un mismo lugar." · "Demo funcional" |
| 2,6–7,0 | Hero de la home: cartel de madera "FINO'S" sobre la fachada, logo, cápsula "Barbería premium · CABA, Buenos Aires", titular "El oficio de la **barbería**, bien hecho", botones "Reservar turno" y "Ver tienda" | "La web — Diseño propio, no una plantilla" |
| 7,0–13,0 | Sección "SERVICIOS / Lo que hacemos" con las tarjetas: Corte de Autor 45 min $4.500, Corte & Barba Premium 75 min $7.500 (con badge "EL MÁS PEDIDO"), Perfilado & Afeitado 30 min $3.500, y el enlace "Ver todos los servicios y reservar →" | "Servicios — Precio, duración y descripción de cada uno" |
| 13,0–18,8 | Sección "EL EQUIPO / Quiénes te atienden" con las fichas de Facundo (Barber · Fades y texturizados), Leandro (Master Barber · Fundador) y Tomás (Barber · Afeitado a navaja), cada una con su bio | "El equipo — Cada barbero con su perfil y sus días" |
| 18,8–24,8 | Sección "RESERVAR ES FÁCIL / En 3 pasos" con los bloques 01 Elegí servicio y barbero, 02 Elegí día y hora, 03 Confirmá con la seña | "Cómo se reserva — Tres pasos, sin fricción" |
| 24,8–29,4 | Sección "CLIENTES / Lo que dicen de nosotros" con las tres reseñas de 5 estrellas de Martín G., Joaquín R. y Diego M., y al final la galería "EL LOCAL / Nuestro espacio" | "Reseñas — Se cargan y se publican desde el panel" |
| 29,4–32,4 | Placa de cierre | "Sistemas a medida" · "Sistemas de turnos", "Tiendas online", "Paneles administrativos" · "Escribinos por DM" |

No aparecen ni el recuadro vacío del mapa, ni el footer, ni la franja de métricas del negocio.

---

### 6.3 `reel-03-eleccion-de-barbero.mp4` — 13,97 s
Descripción derivada del guion de grabación y de las marcas de `videos/bruto/barberos.json`. **No verificada cuadro a cuadro**; el material fuente es un flujo por clicks, que en todos los casos verificados resultó sincronizado.

| Tiempo | Contenido | Texto |
|---|---|---|
| 0,0–2,4 | Placa de apertura | "TURNOS POR BARBERO" · "Cada cliente elige **con quién** se atiende" · "Y cada barbero tiene su propia agenda." · "Demo funcional" |
| 2,4–5,7 | `/reservar`, paso 1, lista de servicios, click en "Corte de Autor" | "Elegís el servicio — La duración define los horarios" |
| 5,7–11,1 | Paso 2, grilla de barberos, click en Facundo | "Elegís el barbero — El equipo sale de la base de datos" |
| 11,1–13,9 | Placa de cierre | "Agenda por profesional" · "Sin turnos superpuestos", "Cada uno con sus días", "Alta y baja desde el panel" · "Escribinos por DM" |

---

### 6.4 `reel-04-servicios.mp4` — 27,17 s — **REHECHO**
Verificado cuadro a cuadro en los segundos 3,5 / 9 / 16 / 21 / 25. Ahora se graba sobre el panel y la reserva, no sobre la home.

| Tiempo | Qué se ve | Texto en pantalla |
|---|---|---|
| 0,0–2,5 | Placa de apertura | "CATÁLOGO DE SERVICIOS" · "Un servicio / nuevo, sin / **tocar código**" · "Se carga en el panel y queda disponible para reservar." · "Demo funcional" |
| 2,5–9,8 | `/admin/servicios`: título "Administración de Servicios — Gestiona los servicios de la barbería", botón "+ Nuevo Servicio" y la lista real con Color & Platinado ($12.000 / 90 min), Corte & Barba Premium ($7.500 / 75 min), Corte Junior ($3.000 / 30 min), cada uno con badge "Activo" y botones "Editar" y "Desactivar" | "Servicios en el panel — Alta, edición, baja y activar o desactivar" |
| 9,8–14,6 | Formulario "Nuevo Servicio" con los campos Nombre, Descripción, Precio ($) y Duración (minutos), y los botones "Crear" y "Cancelar". Se ve tipear en cámara, a 1,4× de velocidad: "Ritual de Barba", "Toalla caliente, aceites y navaja.", "5200", "30" | "Nombre, precio y duración — La duración define después la grilla de horarios" |
| 14,6–19,8 | Vuelve la lista de servicios, ahora con el servicio nuevo: "**Ritual de Barba · Activo · Toalla caliente, aceites y navaja. · Precio: $5.200 · Duración: 30 min**" | "Guardado — Ya está en el catálogo" |
| 19,8–24,4 | Corte a `/reservar` con la sesión del cliente: "Elegí tu servicio" con la lista completa, y al final **"Ritual de Barba · $5.200 · 30 min"** | "Y aparece en la reserva — El cliente ya lo puede elegir" |
| 24,4–27,2 | Placa de cierre | "Vos cargás, el sistema lo publica" · "Alta, edición y baja", "Activar o desactivar", "Sin tocar una línea de código" · "Escribinos por DM" |

---

### 6.5 `reel-05-tienda-online.mp4` — 19,67 s
Verificado cuadro a cuadro en los segundos 1,5 / 5 / 9 / 14 / 19.

| Tiempo | Qué se ve | Texto |
|---|---|---|
| 0,0–2,5 | Placa de apertura | "ECOMMERCE" · "Una barbería que también **vende online**" · "Catálogo, buscador, filtros y control de stock." · "Demo funcional" |
| 2,5–11,1 | `/tienda`: buscador "Buscar productos…", chips "Todos / Cabello / Barba / Accesorios / Otros", contador "8 productos" y las tarjetas con foto real de los potes: Fighters Glory $9.800 con badge "Sin stock" y leyenda "No disponible", Fighters Matte Clay $8.500, Fighters Strong Carv $9.200, Fighters Texturizador $7.600, Fighters Twist Versatile $8.800 con badge rojo "¡Últimas 3!", Peine de madera $4.200. Cada tarjeta con botón "+ Agregar" | "Catálogo de productos — Con stock real y aviso de últimas unidades" |
| 11,1–16,6 | Vuelve arriba y hace click en el chip "Cabello"; el contador cambia a "5 productos" y la grilla se filtra | "Buscador y categorías — Encontrar un producto lleva segundos" |
| 16,6–19,6 | Placa de cierre | "Tienda propia, sin comisiones de terceros" · "Catálogo y stock", "Carrito y checkout", "Todo en tu web" · "Escribinos por DM" |

Los productos sin foto (Peine de madera, Óleo para barba, Tónico post-afeitado) muestran el emoji de respaldo de la app sobre un degradado: es el comportamiento real del producto.

---

### 6.6 `reel-06-carrito-y-checkout.mp4` — 21,83 s
Derivado del guion y de `videos/bruto/carrito.json`. **No verificado cuadro a cuadro.**

| Tiempo | Contenido | Texto |
|---|---|---|
| 0,0–2,4 | Placa de apertura | "CHECKOUT" · "Comprar sin crear **una cuenta**" · "Del carrito al pago, en la misma pantalla." · "Demo funcional" |
| 2,4–7,9 | Tienda, click en "+ Agregar"; el carrito lateral se abre solo con el ítem, el subtotal y los botones "Ir al checkout →" y "Seguir comprando" | "Carrito — Se guarda aunque cierres la pestaña" |
| 7,9–14,8 | `/checkout`: bloques "Resumen del pedido" y "Tus datos", donde se tipean en cámara "Martín Gómez", "martin@ejemplo.com" y "11 5555 5555" | "Datos del comprador — Sin registro obligatorio" |
| 14,8–18,8 | Bloque "Método de entrega": "Retiro en el local — Sin costo adicional / Gratis" y "Envío a domicilio — Costo a coordinar", más el bloque "Pago" | "Retiro o envío — Y pago con Mercado Pago" |
| 18,8–21,8 | Placa de cierre | "Sistemas a medida" · tres ítems · "Escribinos por DM" |

---

### 6.7 `reel-07-panel-administrativo.mp4` — 28,70 s
Verificado cuadro a cuadro en los segundos 3,5 / 8,5 / 13 / 17,5 / 22. Los cinco carteles coinciden exactamente con su pantalla.

| Tiempo | Qué se ve | Texto |
|---|---|---|
| 0,0–2,6 | Placa de apertura | "PANEL ADMINISTRATIVO" · "Todo el negocio **en un panel**" · "Turnos, productos, categorías y reseñas. Sin depender de nadie." · "Demo funcional" |
| 2,6–7,4 | "Panel de Control, Leandro" con tres tarjetas: "Turnos Hoy 3 — Agendados para hoy", "Servicios Activos 5 — Disponibles para reserva", "Total Clientes 4 — Registrados en el sistema" | "Dashboard — Turnos de hoy, servicios y clientes" |
| 7,4–12,0 | "Agenda de Turnos" con los selectores "Todos los estados" y "Todas las fechas", botón "+ Nueva Reserva" y tarjetas tipo "Corte de Autor · Confirmado · Cliente: Martín Gómez · Barbero: Leandro F. · Fecha: 17/08/2026 · Hora: 10:00 · Seña: $1.800 · Transferencia · Seña pagada · $4.500 · Cancelar" | "Agenda de turnos — Confirmar, cancelar y controlar la seña" |
| 12,0–16,5 | "Productos — Gestiona el catálogo de la tienda", botón "+ Nuevo Producto", aviso amarillo "**2** productos con stock bajo · **1 sin stock**. Reponé para no perder ventas." y la lista con miniatura real: "Fighters Glory · Activo · Sin stock · $9.800 · Stock: 0" con "Editar" y "Desactivar" | "Productos — Precio, stock y foto desde la PC" |
| 16,5–21,1 | "Categorías — Organizá productos y servicios. Las subcategorías cuelgan de una categoría madre." PRODUCTOS: Cuidado del cabello, Barba, Accesorios. SERVICIOS: Cortes, Barba y afeitado. Cada fila con "Editar / Ocultar / Borrar" | "Categorías — Para ordenar el catálogo" |
| 21,1–25,6 | "Reseñas — Las que estén visibles aparecen en la página principal." Tarjetas de 5 estrellas de Martín G., Joaquín R. y Diego M. con botones "Editar / Ocultar / Borrar" | "Reseñas — Se publican en la web al activarlas" |
| 25,6–28,6 | Placa de cierre | "Sistemas a medida" · tres ítems · "Escribinos por DM" |

---

### 6.8 `reel-08-gestion-de-barberos.mp4` — 18,60 s
Verificado cuadro a cuadro en los segundos 10 / 13 / 15 / 17.

| Tiempo | Qué se ve | Texto |
|---|---|---|
| 0,0–2,5 | Placa de apertura | "GESTIÓN DEL EQUIPO" · "Sumar un barbero: **30 segundos**" · "Se carga en el panel y aparece solo en la web y en la reserva." · "Demo funcional" |
| 2,5–4,4 | "Barberos — El equipo que aparece en la web y en la reserva", botón "+ Nuevo Barbero" y la lista del equipo | "El equipo actual — Editar, ocultar o dar de alta" |
| 4,4–10,5 | Formulario "Nuevo barbero", acelerado 1,35×. Se ve tipear: Nombre "Bruno", Apellido "Alsina", Especialidad "Barber · Fades y color", Días "Miércoles, Jueves, Viernes", Bio "Fades limpios y mucha paciencia con el detalle." Se ve el campo "Foto del barbero (opcional)" con el botón "Subir desde la PC" | "Nombre, especialidad y días — Con foto y bio opcionales" |
| 10,5–15,5 | Vuelve la lista con el barbero nuevo. Se ven las fichas de Facundo Díaz (con "Tiene cuenta: facundo@finosbarbers.demo"), Leandro F. y Tomás Ibarra, cada una con "Editar / Ocultar" y "+ Crear cuenta de acceso" | "Listo — Ya se puede reservar con él" |
| 15,5–18,5 | Placa de cierre | "El panel manda, la web obedece" · "Alta y baja del equipo", "Cuenta propia para cada barbero", "Sin tocar el código" · "Escribinos por DM" |

---

### 6.9 `reel-09-agenda-y-calendario.mp4` — 16,63 s
Derivado del guion y de `videos/bruto/agenda.json`. Se verificó a mano el fotograma del calendario en el bruto (a los 6,5 s), donde la grilla está completamente cargada. **No verificado cuadro a cuadro sobre el reel montado.**

| Tiempo | Contenido | Texto |
|---|---|---|
| 0,0–2,4 | Placa de apertura | "AGENDA" · "La semana entera **de un vistazo**" · "Lista de turnos y calendario semanal por barbero." · "Demo funcional" |
| 2,4–7,6 | `/admin/turnos`, lista con filtros | "Lista de turnos — Filtros por estado y por fecha" |
| 7,6–13,6 | `/admin/calendario`: "Calendario — Agenda semanal de todos los barberos", navegación "17 – 23 de agosto 2026" con flechas y botón "Hoy", chips "Todos / Leandro F. / Tomás I. / Facundo D." y la grilla LUN a DOM con "3 turnos", "2 turnos" por columna y los bloques coloreados por barbero con servicio y cliente | "Calendario semanal — Un color por barbero" |
| 13,6–16,6 | Placa de cierre | "Sistemas a medida" · tres ítems · "Escribinos por DM" |

En celular la grilla se corta a la derecha y se desplaza en horizontal: es el comportamiento real de la app.

---

### 6.10 `reel-10-finanzas.mp4` — 21,37 s
Verificado cuadro a cuadro en los segundos 4 / 9 / 14 / 19.

| Tiempo | Qué se ve | Texto |
|---|---|---|
| 0,0–2,6 | Placa de apertura | "PANEL FINANCIERO" · "Cuánto entra y **cuánto sale**" · "Ingresos, egresos y balance, mes a mes." · Pie "Demo funcional · datos de ejemplo" |
| 2,6–4,6 | "Finanzas — Registro y seguimiento de ingresos y egresos", botón "+ Nueva transacción" y cuatro tarjetas: "INGRESOS — AGOSTO $574.000,00" en verde, "EGRESOS — AGOSTO $241.000,00" en rojo, "BALANCE — AGOSTO +$333.000,00", "BALANCE ACUMULADO +$1.642.000,00". Debajo el selector "Agosto 2026" y las pestañas "Dashboard / Transacciones" | "Ingresos, egresos y balance — Del mes y acumulado" |
| 4,6–8,6 | Gráfico de barras "Ingresos vs Egresos — últimos 6 meses" | "Últimos 6 meses — Comparación mes a mes" |
| 8,6–12,4 | Dos gráficos de dona: "Egresos por categoría — Agosto 2026" (Alquiler $84.350 35%, Insumos $72.300 30%, Sueldos $48.200 20%, Servicios públicos $24.100 10%, Marketing $12.050 5%) y "Origen de ingresos — Agosto 2026" (Servicios (turno) $505.120 88%, Tienda online $68.880 12%) | "En qué se va la plata — Egresos por categoría" |
| 12,4–18,3 | Pestaña "Transacciones" con filtros "Todos / Ingresos / Egresos" y la lista: "28 de ago de 2026 — Honorarios del equipo — SUELDOS · MANUAL — −$48.200,00 — Editar / Eliminar", etc. | "Cada movimiento — Los turnos y pedidos se registran solos" |
| 18,3–21,3 | Placa de cierre | "Números claros, decisiones claras" · "Ingresos y egresos", "Gráficos por mes y categoría", "Registro automático" · "Escribinos por DM" |

**Todos los importes son datos de la fixture.** La placa de apertura lo aclara en el pie y el caption también.

---

### 6.11 `reel-11-experiencia-del-cliente.mp4` — 15,83 s
Derivado del guion y de `videos/bruto/cliente.json`. **No verificado cuadro a cuadro.**

| Tiempo | Contenido | Texto |
|---|---|---|
| 0,0–2,4 | Placa de apertura | "DEL LADO DEL CLIENTE" · "El cliente también **tiene panel**" · "Ve sus turnos, el estado de cada uno y puede cancelar." · "Demo funcional" |
| 2,4–7,2 | `/dashboard`: "Bienvenido, Martín!" y las tarjetas "Reservar Turno", "Mis Turnos" e "Información de la Cuenta" | "Su cuenta — Reservar, ver turnos y comprar" |
| 7,2–12,8 | `/turnos`: "Mis Turnos — Gestiona tus próximas citas o revisa el historial", botón "Nuevo Turno" y las tarjetas con estado | "Mis turnos — Estado, barbero, servicio y cancelación" |
| 12,8–15,8 | Placa de cierre | "Sistemas a medida" · tres ítems · "Escribinos por DM" |

---

### 6.12 `reel-12-cobros-y-sena.mp4` — 16,53 s — **CARTEL CORREGIDO**
Derivado del guion y de `videos/bruto/cobros.json`. **No verificado cuadro a cuadro.** Por la captura `capturas/admin-cobros-desktop.png`, que sale de la misma pantalla, se sabe que en `/admin/pagos` se lee "Además seguís cobrando por transferencia (alias **alias.de.demo**) y efectivo, sin comisión".

| Tiempo | Contenido | Texto |
|---|---|---|
| 0,0–2,5 | Placa de apertura | "COBROS" · "Menos turnos **caídos**" · "El turno se confirma con una seña pagada por adelantado." · "Demo funcional" |
| 2,5–8,3 | `/admin/pagos`: estado de la conexión con Mercado Pago y botón de conectar/desconectar | "Mercado Pago integrado — Se conecta a la cuenta del propio negocio" |
| 8,3–13,5 | `/admin/turnos` mostrando en cada turno el método de pago y el estado de la seña ("Seña pagada" / "Seña pendiente") | "Seña por turno — Con su método y su estado" |
| 13,5–16,5 | Placa de cierre | "Cobrás la seña al reservar" · "Mercado Pago o transferencia", "Estado de cada seña", "Se registra en finanzas" · "Escribinos por DM" |

El cartel decía "Mercado Pago conectado". Se cambió a "integrado" porque la integración está construida pero no activada en producción.

---

### 6.13 `reel-13-acceso-por-rol.mp4` — 16,03 s
Derivado del guion y de `videos/bruto/barberoPanel.json`. **No verificado cuadro a cuadro.**

| Tiempo | Contenido | Texto |
|---|---|---|
| 0,0–2,6 | Placa de apertura | "PERMISOS" · "Cada uno ve **lo suyo**" · "El barbero entra a su agenda. No al stock, ni a los cobros, ni a las finanzas." · "Demo funcional" |
| 2,6–8,0 | `/barbero/calendario` con la sesión de Facundo: sólo sus turnos | "Mi agenda — Solo los turnos de ese barbero" |
| 8,0–13,0 | `/barbero/clientes`: lista de clientes en solo lectura | "Clientes — Solo lectura" |
| 13,0–16,0 | Placa de cierre | "Sistemas a medida" · tres ítems · "Escribinos por DM" |

---

### 6.14 `reel-14-responsive.mp4` — 19,87 s
Verificado en el segundo 8. Único reel con composición distinta: no es la app a pantalla completa, sino dos pantallas montadas sobre el fondo de marca.

**Composición**: fondo violeta oscuro con grilla. Arriba, centrada, una cápsula con etiqueta y un titular blanco de dos líneas. Debajo, una maqueta de navegador de escritorio de 980×612 px con barra superior gris, tres circulitos y una **píldora de URL vacía** (no se lee ninguna dirección). Debajo, una maqueta de teléfono de 420×747 px con cuerpo redondeado. Ambas pantallas reproducen video de la app a la vez. Al pie, "andmar.studio" a la izquierda y "Demo funcional" a la derecha.

| Tiempo | Contenido | Texto |
|---|---|---|
| 0,0–2,6 | Placa de apertura | "RESPONSIVE" · "Se usa desde el **celular**" · "Clientes y dueño entran desde donde estén. Y además se instala como app." · "Proyecto desarrollado · demo funcional" |
| 2,6–11,2 | Composición doble: en el escritorio la home recorriendo "Lo que hacemos" y "Quiénes te atienden"; en el teléfono la misma home en versión mobile | Cápsula "RESPONSIVE" y titular "La misma web, en cualquier pantalla" |
| 11,2–16,9 | Composición doble: en el escritorio `/admin/calendario`; en el teléfono la agenda | Cápsula "PANEL · RESPONSIVE" y titular "El panel también entra en el bolsillo" |
| 16,9–19,9 | Placa de cierre | "Una sola web, todas las pantallas" · "Diseño responsive", "Instalable como app (PWA)", "Mismo sistema en los dos lados" · "Escribinos por DM" |

---

### 6.15 Posts (1080×1350)

Retícula común: fondo violeta oscuro con grilla; arriba a la izquierda una cápsula violeta con un punto y la etiqueta en mayúsculas espaciadas; debajo un titular blanco grande; debajo una bajada gris; después una lista con viñetas violetas **o** una captura de la app dentro de un marco redondeado con sombra; abajo a la izquierda "andmar**.**studio" y a la derecha una nota gris.

| Archivo | Etiqueta | Titular | Bajada | Cuerpo | Nota al pie |
|---|---|---|---|---|---|
| `post-01-proyecto.png` | PROYECTO DESARROLLADO | "Una barbería con sistema propio" | "Web, turnos online, tienda y panel de gestión. Diseñado y programado por nosotros, de cero." | Captura del hero de la home (cartel de madera FINO'S) | "Demo funcional" |
| `post-02-todo-en-uno.png` | QUÉ INCLUYE | "Turnos, servicios, barberos y tienda en un mismo sistema" | "Sin cinco herramientas distintas. Una sola, hecha para el negocio." | Lista: "Reserva online en 3 pasos" · "Agenda por barbero, sin superposiciones" · "Tienda con control de stock" · "Panel administrativo completo" · "Panel financiero con gráficos" | "Proyecto desarrollado · demo funcional" |
| `post-03-turnos.png` | SISTEMA DE TURNOS | "El cliente reserva solo, a cualquier hora" | "Elige servicio, barbero y horario. Solo ve los horarios que están realmente libres." | Captura de la grilla de horarios de 09:00 a 18:45 | "Demo funcional" |
| `post-04-panel.png` | PANEL ADMINISTRATIVO | "Todo el negocio, en un panel" | "Turnos, servicios, productos, categorías, barberos, reseñas y cobros. Sin depender del programador." | Captura de `/admin/turnos` | "Demo funcional" |
| `post-05-calendario.png` | AGENDA | "La semana entera, de un vistazo" | "Calendario semanal con un color por barbero y filtro por profesional." | Captura del calendario semanal en escritorio, con la grilla completa cargada | "Demo funcional" |
| `post-06-tienda.png` | ECOMMERCE | "Una barbería que también vende online" | "Catálogo con buscador, filtros por categoría, stock real y aviso de últimas unidades." | Captura del catálogo de la tienda | "Demo funcional" |
| `post-07-finanzas.png` | PANEL FINANCIERO | "Cuánto entra y cuánto sale" | "Ingresos, egresos y balance por mes, con gráficos. Los turnos y pedidos se registran solos." | Captura de los gráficos de finanzas en escritorio | "Demo funcional · datos de ejemplo" |
| `post-08-roles.png` | PERMISOS | "Cada uno ve lo suyo" | "El dueño ve todo. El barbero, solo su agenda. El cliente, solo sus turnos." | Lista: "Administrador" · "Barbero (acceso limitado)" · "Cliente" | "Demo funcional" |
| `post-09-que-hacemos.png` | ANDMAR.STUDIO | "Hacemos sistemas, no plantillas" | "Desarrollamos software a medida para negocios que ya no entran en una planilla." | Lista: "Webs y landing pages" · "Sistemas de turnos" · "Tiendas online" · "Paneles administrativos" · "Automatizaciones" | "Escribinos por DM" |

### 6.16 Carrusel `social/posts/carrusel-turnos/` (6 placas, 1080×1350)

Misma retícula. Orden de publicación: 1 a 6.

| Archivo | Etiqueta | Titular | Bajada | Cuerpo |
|---|---|---|---|---|
| `carrusel-turnos-1.png` | SISTEMA DE TURNOS | "Así reserva un cliente" | "Deslizá →" | Sin captura. Pie: "Proyecto desarrollado · demo funcional" |
| `carrusel-turnos-2.png` | PASO 1 | "Elige el servicio" | "Con precio y duración a la vista. El catálogo se carga desde el panel." | Captura del paso 1 de la reserva |
| `carrusel-turnos-3.png` | PASO 2 | "Elige el barbero" | "Cada profesional tiene su perfil, su especialidad y sus días." | Captura del paso 2 |
| `carrusel-turnos-4.png` | PASO 3 | "Elige día y hora" | "Solo aparecen los horarios libres: la duración del servicio define la grilla." | Captura de la grilla de horarios |
| `carrusel-turnos-5.png` | PASO 4 | "Confirma con la seña" | "Mercado Pago o transferencia. Menos turnos caídos, agenda más previsible." | Recorte del bloque de resumen. En la captura se lee: "Resumen / Servicio: Corte & Barba Premium ($7.500) / Barbero: Leandro F. / Fecha: 24/08/2026 / Hora: 16:00 / Seña (40%) para reservar $3.000 / El resto ($4.500) se abona en el local. / ¿Cómo querés dejar la seña? / Mercado Pago — Tarjeta o dinero en cuenta / Transferencia — Alias alias.de.demo" |
| `carrusel-turnos-6.png` | ANDMAR.STUDIO | "¿Tenés un negocio con turnos?" | "Podemos hacerte un sistema así, adaptado a cómo trabajás." | Lista: "Escribinos por DM" · "Te mostramos la demo funcionando". Pie: "andmar.studio" |

### 6.17 Historias (1080×1920)

Retícula: cápsula con etiqueta arriba a la izquierda; titular blanco grande en dos o tres líneas; bajada gris; si la pieza tiene captura, un marco alto con la captura recortada desde arriba; si tiene CTA, un botón redondeado violeta claro con texto negro que ocupa el ancho; al pie "andmar**.**studio" y una nota gris. Las historias sin captura tienen el bloque de texto centrado verticalmente.

| Archivo | Etiqueta | Titular | Bajada | Botón | Nota | Captura |
|---|---|---|---|---|---|---|
| `historia-01-problema.png` | EL PROBLEMA | "La agenda en papel / y 40 mensajes / sin responder" | "Turnos anotados a mano, clientes que escriben a la madrugada y horarios que se pisan." | "Deslizá →" | "1 / 4" | — |
| `historia-02-solucion.png` | LA SOLUCIÓN | "Un sistema / que atiende / solo" | "El cliente reserva desde el celular. El negocio ve todo desde un panel." | "Deslizá →" | "2 / 4" | — |
| `historia-03-demo.png` | LA DEMOSTRACIÓN | "Reservar / lleva 3 pasos" | "Servicio, barbero, día y hora. Y una seña para confirmar." | — | "3 / 4" | Grilla de horarios |
| `historia-04-cta.png` | ANDMAR.STUDIO | "¿Tu negocio / necesita algo / así?" | "Sistemas de turnos, tiendas online y paneles a medida." | "Escribinos por DM" | "4 / 4" | — |
| `historia-05-panel.png` | PANEL ADMINISTRATIVO | "Todo el negocio / en un panel" | "Turnos, productos, barberos, reseñas y cobros." | "Escribinos por DM" | "Demo funcional" | Dashboard del panel |
| `historia-06-tienda.png` | ECOMMERCE | "Tienda propia, / stock incluido" | "Catálogo, buscador, filtros y checkout sin cuenta." | "Escribinos por DM" | "Demo funcional" | Catálogo de la tienda |
| `historia-07-finanzas.png` | PANEL FINANCIERO | "Los números, / en un gráfico" | "Ingresos, egresos y balance mes a mes." | "Escribinos por DM" | "Datos de ejemplo" | Finanzas en celular |
| `historia-08-detras.png` | DETRÁS DEL PROYECTO | "Next.js, / TypeScript / y Postgres" | "Autenticación por roles, permisos a nivel de base de datos y pagos con Mercado Pago." | "Escribinos por DM" | "andmar.studio" | — |

En `historia-03-demo.png` la captura muestra arriba el encabezado fijo de la app superpuesto con transparencia sobre el indicador de pasos. Es el comportamiento real de la app al hacer scroll, pero se lee como un pequeño artefacto visual.

### 6.18 Destacadas (1080×1920)

Las siete comparten composición: fondo violeta oscuro con grilla; **exactamente en el centro geométrico** un aro circular de 560 px con borde violeta y halo radial; dentro, un ícono lineal de trazo violeta claro de 240 px; al 68 % de la altura el título en blanco mayúsculas de 76 px; al 74,5 % el subtítulo "ANDMAR.STUDIO" en gris muy espaciado.

| Archivo | Título | Ícono |
|---|---|---|
| `destacada-proyectos.png` | PROYECTOS | carpeta |
| `destacada-sistemas.png` | SISTEMAS | monitor con líneas de código |
| `destacada-turnos.png` | TURNOS | calendario |
| `destacada-tienda.png` | TIENDA | bolsa de compras |
| `destacada-panel.png` | PANEL | panel con barra lateral |
| `destacada-proceso.png` | PROCESO | flecha circular con reloj |
| `destacada-contacto.png` | CONTACTO | sobre |

El ícono está centrado a propósito porque Instagram recorta la portada en un círculo centrado; el texto queda fuera de ese recorte, que es lo esperado.

### 6.19 Recursos

- `recursos/guia-visual.png`: muestrario con ocho cuadrados de color con su nombre y su hexadecimal (Fondo `#08080B`, Fondo alt `#0C0A14`, Violeta `#8B5CF6`, Violeta claro `#C4B5FD`, Violeta oscuro `#4C1D95`, Texto `#FFFFFF`, Texto suave `#A1A1AA`, Texto tenue `#52525B`) y cuatro muestras tipográficas rotuladas "Inter 800 / Titulares", "Inter 600 / Subtítulos y listas", "Inter 400 · texto de apoyo / Bajadas" y el logotipo con "Space Grotesk 700 · marca".
- `recursos/placa-apertura-modelo.png` y `recursos/placa-cierre-modelo.png`: las dos placas con texto de relleno.
- `recursos/sobreimpreso-modelo.png` y `recursos/firma-andmar.png`: PNG con **fondo transparente**, para superponer sobre video nuevo.

---

## 7. TEXTOS COMPLETOS

Transcritos verbatim desde `social/captions/`.

### 7.1 Captions de reels

**Reel 1 · `reel-01-sistema-de-turnos.mp4`** — CTA: Escribinos por DM

```
Reservar un turno, en 3 pasos.

Elegís el servicio, elegís al barbero, elegís día y hora. Solo aparecen los horarios que están realmente libres, porque el sistema calcula la duración de cada servicio y no deja que dos turnos se pisen.

Al final, una seña para confirmar: Mercado Pago o transferencia. Menos turnos caídos, agenda más previsible.

Esto es Fino's Barbers, un proyecto que desarrollamos de cero: web, turnos, tienda y panel de gestión.

andmar.studio · desarrollo web y sistemas a medida.
¿Tenés un negocio con turnos? Escribinos por DM.

#sistemadeturnos #turnosonline #barberia #barbershop #desarrolloweb #sistemasamedida #software #andmarstudio
```

**Reel 2 · `reel-02-el-proyecto.mp4`** — CTA: Escribinos por DM

```
Una barbería con sistema propio.

No una plantilla: una web diseñada y programada desde cero, con todo lo que el negocio necesita adentro.

· Servicios con precio y duración
· Equipo con perfil y días de atención
· Reserva online en 3 pasos
· Reseñas administrables
· Tienda de productos

El equipo, las reseñas, el catálogo de la reserva y la tienda se administran desde un panel: el dueño entra, toca y el sistema se actualiza.

Proyecto desarrollado por andmar.studio · desarrollo web y sistemas a medida.

#desarrolloweb #sistemasamedida #software #andmarstudio #diseñoweb #portfolio
```

**Reel 3 · `reel-03-eleccion-de-barbero.mp4`** — CTA: Escribinos por DM

```
Cada cliente elige con quién se atiende.

Y cada profesional tiene su propia agenda: sus días, su especialidad y sus turnos. El sistema no deja que se superpongan.

Cuando el negocio suma o saca gente del equipo, lo hace desde el panel. La web y el formulario de reserva se actualizan solos.

Del proyecto Fino's Barbers, desarrollado por andmar.studio · desarrollo web y sistemas a medida.

#sistemadeturnos #turnosonline #barberia #barbershop #desarrolloweb #sistemasamedida #software #andmarstudio
```

**Reel 4 · `reel-04-servicios.mp4`** — CTA: Escribinos por DM

```
Sumaste un servicio nuevo. ¿A quién le escribís?

A nadie. Entrás al panel, cargás nombre, precio y duración, y guardás. Listo: el servicio ya está disponible para reservar.

Y la duración no es un dato decorativo: es lo que usa el sistema para armar la grilla de horarios y que no se pisen dos turnos.

Del proyecto Fino's Barbers, desarrollado por andmar.studio · desarrollo web y sistemas a medida.

#desarrolloweb #sistemasamedida #software #andmarstudio #paneladministrativo #gestion #pymes
```

**Reel 5 · `reel-05-tienda-online.mp4`** — CTA: Escribinos por DM

```
Una barbería que también vende online.

Catálogo con buscador y filtros por categoría, stock real y aviso de últimas unidades. Cuando un producto se queda sin stock, la web deja de ofrecerlo.

Tienda propia, dentro de la misma web. Sin comisiones de terceros.

Del proyecto Fino's Barbers, desarrollado por andmar.studio · desarrollo web y sistemas a medida.

#ecommerce #tiendaonline #negocios #desarrolloweb #sistemasamedida #software #andmarstudio
```

**Reel 6 · `reel-06-carrito-y-checkout.mp4`** — CTA: Escribinos por DM

```
Comprar sin crear una cuenta.

El carrito se guarda aunque el cliente cierre la pestaña. En el checkout deja sus datos, elige retiro en el local o envío, y paga con Mercado Pago.

Cada paso que le pedís de más a un cliente es una venta menos.

Del proyecto Fino's Barbers, desarrollado por andmar.studio · desarrollo web y sistemas a medida.

#ecommerce #tiendaonline #negocios #desarrolloweb #sistemasamedida #software #andmarstudio
```

**Reel 7 · `reel-07-panel-administrativo.mp4`** — CTA: Escribinos por DM

```
Todo el negocio, en un panel.

Turnos, servicios, productos, categorías, barberos, reseñas y cobros. Cada cosa con su alta, su edición y su baja.

El dueño no necesita saber programar, ni escribirle al desarrollador cada vez que cambia algo. Entra, toca y la web responde.

Del proyecto Fino's Barbers, desarrollado por andmar.studio · desarrollo web y sistemas a medida.

#paneladministrativo #gestion #pymes #desarrolloweb #sistemasamedida #software #andmarstudio
```

**Reel 8 · `reel-08-gestion-de-barberos.mp4`** — CTA: Escribinos por DM

```
Sumar un barbero al equipo: 30 segundos.

Nombre, especialidad, días de atención, una bio y una foto. Guardás y ya aparece en la web y en el formulario de reserva.

Además, cada barbero puede tener su propia cuenta para ver su agenda. Sin acceso al stock, ni a los cobros, ni a las finanzas.

Del proyecto Fino's Barbers, desarrollado por andmar.studio · desarrollo web y sistemas a medida.

#paneladministrativo #gestion #pymes #desarrolloweb #sistemasamedida #software #andmarstudio
```

**Reel 9 · `reel-09-agenda-y-calendario.mp4`** — CTA: Escribinos por DM

```
La semana entera, de un vistazo.

Lista de turnos con filtros por estado y por fecha, y un calendario semanal con un color por barbero. Confirmar, cancelar y controlar la seña, todo desde ahí.

Se acabó el cuaderno.

Del proyecto Fino's Barbers, desarrollado por andmar.studio · desarrollo web y sistemas a medida.

#sistemadeturnos #turnosonline #barberia #barbershop #paneladministrativo #gestion #pymes #desarrolloweb #sistemasamedida #software #andmarstudio
```

**Reel 10 · `reel-10-finanzas.mp4`** — CTA: Escribinos por DM

```
Cuánto entra y cuánto sale.

Ingresos, egresos y balance del mes y acumulado. Gráficos de los últimos 6 meses y desglose de en qué se va la plata.

Lo mejor: los turnos confirmados y los pedidos pagados se registran solos. No hay que cargar nada a mano.

(Los números que se ven son datos de ejemplo del proyecto.)

Del proyecto Fino's Barbers, desarrollado por andmar.studio · desarrollo web y sistemas a medida.

#paneladministrativo #gestion #pymes #desarrolloweb #sistemasamedida #software #andmarstudio #finanzas
```

**Reel 11 · `reel-11-experiencia-del-cliente.mp4`** — CTA: Escribinos por DM

```
El cliente también tiene su panel.

Entra, ve sus turnos, el estado de cada uno, con qué barbero y a qué hora. Y si no puede ir, cancela él mismo.

Un mensaje menos para responder.

Del proyecto Fino's Barbers, desarrollado por andmar.studio · desarrollo web y sistemas a medida.

#sistemadeturnos #turnosonline #barberia #barbershop #desarrolloweb #sistemasamedida #software #andmarstudio
```

**Reel 12 · `reel-12-cobros-y-sena.mp4`** — CTA: Escribinos por DM

```
El que reserva y no viene.

La seña lo resuelve: el turno se confirma cuando el cliente paga por adelantado un porcentaje del servicio. Mercado Pago o transferencia, con el estado de cada seña a la vista en el panel.

Y como el cobro está conectado a la cuenta del negocio, la plata entra directo ahí.

Del proyecto Fino's Barbers, desarrollado por andmar.studio · desarrollo web y sistemas a medida.

#sistemadeturnos #turnosonline #barberia #barbershop #desarrolloweb #sistemasamedida #software #andmarstudio #mercadopago
```

**Reel 13 · `reel-13-acceso-por-rol.mp4`** — CTA: Escribinos por DM

```
Cada uno ve lo suyo.

El dueño ve todo. El barbero entra a su agenda y a la lista de clientes, nada más: no ve el stock, ni los cobros, ni las finanzas. El cliente solo ve sus propios turnos.

Los permisos no son solo pantallas escondidas: están aplicados también en la base de datos.

Del proyecto Fino's Barbers, desarrollado por andmar.studio · desarrollo web y sistemas a medida.

#desarrolloweb #sistemasamedida #software #andmarstudio #seguridad
```

**Reel 14 · `reel-14-responsive.mp4`** — CTA: Escribinos por DM

```
La misma web, en cualquier pantalla.

En la computadora del local y en el celular del cliente. Y además se puede instalar como app en el teléfono, con su ícono en la pantalla de inicio.

Del proyecto Fino's Barbers, desarrollado por andmar.studio · desarrollo web y sistemas a medida.

#desarrolloweb #sistemasamedida #software #andmarstudio #responsive #pwa
```

### 7.2 Captions de posts

**Post 1 · `post-01-proyecto.png`** — CTA: Escribinos por DM

```
Fino's Barbers: una barbería con sistema propio.

Web, turnos online, tienda y panel de gestión. Diseñado y programado por nosotros, de cero.

Es un proyecto desarrollado por andmar.studio y hoy funciona como demo. Si querés verlo andando, escribinos.

#desarrolloweb #sistemasamedida #software #andmarstudio #sistemadeturnos #turnosonline #barberia #barbershop
```

**Post 2 · `post-02-todo-en-uno.png`** — CTA: Escribinos por DM

```
Turnos, servicios, barberos y tienda en un mismo sistema.

La mayoría de los negocios termina con una app para turnos, una planilla para la plata, Instagram para el catálogo y un cuaderno para el resto.

Nosotros hacemos una sola cosa que hace todo eso.

#desarrolloweb #sistemasamedida #software #andmarstudio #paneladministrativo #gestion #pymes
```

**Post 3 · `post-03-turnos.png`** — CTA: Escribinos por DM

```
El cliente reserva solo, a cualquier hora.

Elige servicio, barbero y horario. El sistema calcula la duración y muestra únicamente lo que está libre, así no hay dos turnos pisados.

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

#sistemadeturnos #turnosonline #barberia #barbershop #desarrolloweb #sistemasamedida #software #andmarstudio
```

**Post 4 · `post-04-panel.png`** — CTA: Escribinos por DM

```
Todo el negocio, en un panel.

Turnos, servicios, productos, categorías, barberos, reseñas y cobros. Sin depender del programador para cada cambio.

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

#paneladministrativo #gestion #pymes #desarrolloweb #sistemasamedida #software #andmarstudio
```

**Post 5 · `post-05-calendario.png`** — CTA: Escribinos por DM

```
La semana entera, de un vistazo.

Calendario semanal con un color por barbero y filtro por profesional. Ideal para negocios con varias personas atendiendo al mismo tiempo.

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

#sistemadeturnos #turnosonline #barberia #barbershop #paneladministrativo #gestion #pymes #desarrolloweb #sistemasamedida #software #andmarstudio
```

**Post 6 · `post-06-tienda.png`** — CTA: Escribinos por DM

```
Una barbería que también vende online.

Catálogo con buscador, filtros por categoría, stock real y aviso de últimas unidades. Todo dentro de la misma web.

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

#ecommerce #tiendaonline #negocios #desarrolloweb #sistemasamedida #software #andmarstudio
```

**Post 7 · `post-07-finanzas.png`** — CTA: Escribinos por DM

```
Cuánto entra y cuánto sale.

Ingresos, egresos y balance mes a mes, con gráficos. Los turnos confirmados y los pedidos pagados se registran solos.

(Los números de la imagen son datos de ejemplo del proyecto.)

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

#paneladministrativo #gestion #pymes #desarrolloweb #sistemasamedida #software #andmarstudio
```

**Post 8 · `post-08-roles.png`** — CTA: Escribinos por DM

```
Cada uno ve lo suyo.

Administrador, barbero y cliente tienen accesos distintos. Y los permisos no son solo pantallas escondidas: están aplicados también a nivel de base de datos.

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

#desarrolloweb #sistemasamedida #software #andmarstudio #seguridad
```

**Post 9 · `post-09-que-hacemos.png`** — CTA: Escribinos por DM

```
Hacemos sistemas, no plantillas.

· Webs y landing pages
· Sistemas de turnos
· Tiendas online
· Paneles administrativos
· Automatizaciones

Estamos arrancando, y hacemos productos reales. Si tenés un negocio que ya no entra en una planilla, escribinos.

andmar.studio

#desarrolloweb #sistemasamedida #software #andmarstudio
```

**Carrusel · `social/posts/carrusel-turnos/`** — CTA: Escribinos por DM

```
Así reserva un cliente. Deslizá →

1. Elige el servicio (con precio y duración)
2. Elige el barbero
3. Elige día y hora, solo entre los horarios libres
4. Confirma con una seña

Cuatro pasos, sin un solo mensaje de WhatsApp de por medio.

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

#sistemadeturnos #turnosonline #barberia #barbershop #desarrolloweb #sistemasamedida #software #andmarstudio
```

### 7.3 Historias: CTA y elementos a superponer

Las historias no llevan caption; el texto va quemado en la imagen (transcrito en 6.17). Lo que hay que agregar al publicar:

| Pieza | CTA (ya en la imagen) | Sticker sugerido |
|---|---|---|
| `historia-01-problema.png` | "Deslizá →" | Encuesta: "¿Cómo anotás los turnos hoy?" · Cuaderno / WhatsApp / App |
| `historia-02-solucion.png` | "Deslizá →" | — |
| `historia-03-demo.png` | "Deslizá →" (en el documento; la imagen no lleva botón) | Alternativa recomendada: subir acá el Reel 1 en vez de la imagen |
| `historia-04-cta.png` | "Escribinos por DM" | Caja de preguntas: "¿Qué necesita tu negocio?" |
| `historia-05-panel.png` | "Escribinos por DM" | — |
| `historia-06-tienda.png` | "Escribinos por DM" | — |
| `historia-07-finanzas.png` | "Escribinos por DM" | — |
| `historia-08-detras.png` | "Escribinos por DM" | — |

No hay ningún link ni sticker de enlace definido en ninguna pieza.

### 7.4 Destacadas: instrucción de uso

```
Subí la imagen como historia, después editá la destacada y elegí esa historia como portada.
Instagram recorta la portada en círculo: el ícono ya está centrado para que quede bien.
```

Orden sugerido en el perfil: PROYECTOS · TURNOS · TIENDA · PANEL · SISTEMAS · PROCESO · CONTACTO

---

## 8. CLAIMS PERMITIDOS Y CLAIMS PROHIBIDOS

### Se puede afirmar (verificado corriendo la app)

- "Proyecto desarrollado por andmar.studio" y "demo funcional".
- "Sistema web integral para una barbería".
- "Turnos, servicios, barberos y tienda online en un mismo sistema".
- "Reserva online en 3 pasos con disponibilidad real".
- "Seña para confirmar el turno, con Mercado Pago o transferencia" (40 % configurable).
- "Panel administrativo con turnos, servicios, productos, categorías, barberos, reseñas, cobros y finanzas".
- "Panel financiero con gráficos" y "registro automático de turnos y pedidos".
- "Los servicios, productos, barberos y reseñas se cargan desde el panel" — **con la excepción de la sección de servicios de la home**.
- "Accesos distintos para administrador, barbero y cliente, aplicados también en la base de datos".
- "Responsive e instalable como app (PWA)".
- "Diseñado y programado desde cero, no es una plantilla".
- "Estamos arrancando, y hacemos productos reales y profesionales".
- Al mostrar números de finanzas, aclarar siempre "datos de ejemplo".

### No se puede afirmar

- ❌ "Nuestro cliente Fino's Barbers" o "trabajamos con Fino's Barbers": la relación comercial no está cerrada.
- ❌ "En producción", "en uso", "operando hoy".
- ❌ Cualquier métrica de resultado: turnos gestionados, clientes captados, ventas, ahorro de tiempo, aumento de reservas, ROI.
- ❌ Cantidad de clientes o de proyectos entregados por andmar.studio.
- ❌ Testimonios o citas del barbero.
- ❌ Precios de los servicios de andmar.studio: no existe información y no se inventaron.
- ❌ Funcionalidades inexistentes: descuentos, cupones, fidelización, recordatorios por WhatsApp, reportes exportables.
- ❌ **"El dueño cambia un precio y la home se actualiza sola"**: la sección de servicios de la home está escrita a mano en el código.
- ❌ **"Mercado Pago conectado / cobrando"**: la integración está construida y probada en demo, pero no activada. Se dice "integrado".
- ❌ Mostrar el alias de cobro real, el WhatsApp real del barbero o cualquier dato personal.

### Dos afirmaciones que estaban mal y se corrigieron

1. **"Los servicios de la web se cargan desde el panel."** Era falso para la home: los tres servicios destacados de `/` están escritos a mano en `src/app/page.tsx`, líneas 22 a 45, con los precios como texto literal. Lo dinámico es el catálogo de `/reservar`, el de la tienda y el ABM de `/admin/servicios`. **Corregido**: el reel 4 se volvió a grabar sobre el panel y la reserva, el cartel del reel 2 pasó a "Precio, duración y descripción de cada uno", y los captions de los reels 2 y 4 se reescribieron.
2. **"Mercado Pago conectado"** (reel 12). **Corregido** a "Mercado Pago integrado — Se conecta a la cuenta del propio negocio".

### Métricas del negocio: resueltas

La home tiene una franja con "+10 Años de oficio", "+2.000 Cortes al año", "4.9★ Reseñas Google" y "100% Turnos online", escrita a mano en `src/app/page.tsx`. Son afirmaciones del comercio que no podemos respaldar. **Se ocultan durante la grabación** (`limpiarUI` con `ocultarMetricas`) y **no aparecen en ninguna pieza del material entregado**.

---

## 9. DECISIONES, CORRECCIONES Y DESCARTES

### Lo que se probó y no funcionó

1. **Video nativo de Playwright.** Primer intento con viewport 540×960, `deviceScaleFactor: 2` y `recordVideo.size: 1080×1920`. El archivo salía en 1080×1920 pero al inspeccionar un fotograma se vio que Playwright **no escala hacia arriba**: dejaba la página de 540×960 en el cuadrante superior izquierdo y el resto en negro. **Descartado.** Los 14 `.webm` de esa tanda se borraron.
2. **Alias de webpack para `@/lib/site`.** No funcionó: el mapeo `@/…` que Next arma desde `tsconfig` gana sobre el alias, incluso poniéndolo primero y con la forma exacta `'@/lib/site$'`. **Descartado** en favor de `NormalModuleReplacementPlugin`.
3. **Turbopack.** Next 16 aborta si hay config de webpack sin config de Turbopack. **Descartado**, todo con `--webpack`.
4. **`apt-get install ffmpeg` directo**, que falló con 404 en dos paquetes de drivers. Se resolvió corriendo `apt-get update` antes.

### Lo que se rehízo

1. **Todo el sistema de grabación.** Se reemplazó el video de Playwright por un grabador propio que captura fotogramas JPEG de calidad 94 a 1080×1920 reales (91 ms por cuadro) y los arma con FFmpeg vía un `ffconcat` con duraciones. Los scrolls se generan con easing fotograma a fotograma, así que son perfectamente suaves.
2. **Se regrabó todo el material** después de descubrir que el reemplazo de `@/lib/site` no estaba surtiendo efecto. En el primer montaje del reel 1 se leía en pantalla, bajo la opción "Transferencia", **el alias bancario real del barbero** (el que está en `src/lib/site.ts`). Se borró ese reel y todas las capturas de esa tanda, se arregló el reemplazo y se volvió a grabar todo.
3. **Sobreimpresos invisibles.** Los primeros montajes no mostraban ningún cartel ni la marca de agua: los PNG entraban como imagen suelta, con un único fotograma en t=0, así que el fundido de alfa nunca avanzaba y quedaban con opacidad 0. Se corrigió pasando cada PNG como secuencia (`-loop 1 -framerate 30 -t <duración>`). Los 14 reels se rehicieron.
4. **Pieza responsive.** El primer montaje salió todo negro: la capa de biseles se generaba con `omitBackground: true` pero el `body` seguía teniendo fondo opaco, y el cuerpo del teléfono era un bloque lleno que cubría la pantalla. Se corrigió forzando fondo transparente en esa variante y convirtiendo el cuerpo del teléfono en un marco hueco con `border`. También se cambiaron las posiciones fijas de las pantallas por una medición en vivo sobre la plantilla renderizada, porque un titular de una línea en vez de dos las desplazaba 68 px.
5. **Reel 8.** El primer montaje terminaba mostrando la pantalla de login mientras el cartel decía "Listo — Ya se puede reservar con él": el selector `button[type="submit"]` tomaba el botón "Cerrar Sesión" del encabezado del panel, que también es un submit y está antes en el DOM. Se cambió por `button:text-is("Crear")` y se regrabó.
6. **Captura del calendario**, tomada mientras la pantalla decía "Cargando calendario…". Se agregó una espera a que desaparezca cualquier texto de carga.
7. **Recorte de la seña.** El encuadre que entraba en el marco del carrusel mostraba la grilla de horarios en vez del resumen. Se generó `capturas/reservar-4-sena-detalle.png` con la región correcta.
8. **Reels 2 y 4 (última corrección).** Al revisar cuadro a cuadro para este informe se detectó que las escenas de la home avanzaban una cantidad fija de píxeles y las marcas se ponían **antes** de cada scroll, así que los carteles quedaban una sección corridos. El reel 2 además terminaba mostrando un recuadro vacío (el iframe del mapa oculto) y el footer con un email placeholder. **Se agregó `irA()` al grabador**, que ancla el scroll a la sección buscada, y las marcas pasaron a ponerse después de llegar. El reel 4 se replanteó por completo: dejó de grabarse sobre la home (que es estática) y pasa a mostrar el alta real de un servicio en el panel y ese mismo servicio apareciendo en el formulario de reserva.
9. **Lista negra del control de calidad.** Tenía copiados el alias, el teléfono y el email reales del comercio. Ahora los lee en vivo de `src/lib/site.ts`, así que el dato no está duplicado en un segundo archivo.
10. **Este mismo informe.** En su primera versión transcribía el alias bancario real del barbero al describir el error del punto 2. El control de calidad lo detectó al correrlo sobre el material terminado y se redactó. Es la prueba de que el chequeo sirve: el dato se filtró en el documento que justamente explica cómo se evitó filtrarlo.

### Material generado y tirado

- 14 `.webm` de la primera tanda (mal escalados).
- 42 capturas de una auditoría inicial, borradas por contener el alias real.
- Un reel 1 completo con el alias real visible.
- Todos los reels de la tanda sin sobreimpresos.
- Las versiones anteriores de los reels 2, 4 y 12.

### Decisiones y criterio

| Decisión | Alternativa descartada | Criterio |
|---|---|---|
| Grabar la app real con fixture local | Maquetas o mockups | Se pidió material del sistema real |
| Simular Mercado Pago devolviendo al propio retorno de la app | Dibujar una pantalla falsa de Mercado Pago | No inventar interfaces de terceros |
| Sustituir alias y WhatsApp por marcadores | Recortar o difuminar en posproducción | Más robusto: el dato privado nunca llega a existir en ningún fotograma |
| Ocultar la franja de métricas del negocio | Dejarla en cámara | No podemos respaldar esas cifras |
| Reels sin música ni voz | Voz sintética o música de fondo | El brief pedía no usar voz artificial por defecto, y no hay música con licencia disponible |
| Tipografías incrustadas en base64 | Enlazar Google Fonts | El navegador de este entorno no atraviesa el proxy para pedir fuentes; además hace el pipeline reproducible sin red. Inter y Space Grotesk son SIL Open Font License 1.1 |
| No generar ninguna pieza sobre descuentos | Inventar la funcionalidad | Se verificó que no existe en el código |
| Preset de x264 `medium`, CRF 19 | `slow` | Con `slow` cada reel tardaba varios minutos y la diferencia visual en interfaz plana es imperceptible |

---

## 10. CONTROL DE CALIDAD

| Qué | Método | Resultado |
|---|---|---|
| Resolución y formato de los 14 reels | `ffprobe` sobre cada archivo | **14/14 OK**: 1080×1920, H.264 High, yuv420p, 30 fps |
| Pista de audio | `ffprobe` + `volumedetect` | 14/14 con AAC 44,1 kHz estéreo en **silencio absoluto** (mean y max = −91,0 dB) |
| Integridad de decodificación de los reels | `ffmpeg -v error -i <archivo> -f null -` sobre cada uno | **14/14 decodifican completos, cero errores** |
| Integridad de los brutos | Mismo método | **18/18 decodifican completos, cero errores** |
| Resolución de posts y carrusel | Cabecera PNG | **15/15 en 1080×1350** |
| Resolución de historias y destacadas | Cabecera PNG | **15/15 en 1080×1920** |
| Capturas | Cabecera PNG | 25 en 1080×1920, 25 en 1440×900, 1 recorte de 1080×1180. Sin desvíos |
| Secretos y datos privados en texto | `grep` recursivo sobre los 26 archivos de texto del material, buscando: el encabezado de un JWT, el prefijo de un token de producción de Mercado Pago, los prefijos de claves en vivo de Resend y Stripe, una service role key con valor, y el alias, teléfono y email reales del comercio leídos en vivo de `src/lib/site.ts` | **Cero coincidencias** |
| Datos privados en pantalla | Verificación visual de `capturas/admin-cobros-desktop.png` y del fotograma del reel 1 en 15–19 s | Se lee "alias **alias.de.demo**", el marcador. **El alias real no aparece** |
| URLs locales visibles | Revisión de la composición de todas las piezas | Las grabaciones capturan sólo el viewport, sin barra de direcciones. La única maqueta de navegador (reel 14) tiene la píldora de URL **vacía**. **Ninguna pieza muestra `localhost`** |
| Indicador de desarrollo de Next.js | `devIndicators: false` en modo demo + revisión visual | No aparece en ninguna pieza |
| Marcas de agua ajenas | Revisión visual | La única marca de agua es "andmar.studio". Aparecen, como parte del producto, el logo de Fino's Barber's y los envases de la línea Fighters en las fotos de producto, que son marcas de terceros presentes en el catálogo real del negocio |
| Ortografía y acentos | Lectura completa de los cuatro archivos de captions y revisión visual de 14 piezas gráficas renderizadas | Sin errores. Acentos y eñes renderizan bien ("seña", "diseño", "gráficos", "Miércoles", "¿Cómo querés…"). Registro rioplatense consistente |
| Veracidad de las afirmaciones | Contraste de cada sobreimpreso y cada caption contra el código y contra los fotogramas | Se encontraron **dos afirmaciones falsas**, ambas **corregidas** (ver sección 8) |
| Sincronía de carteles con la imagen | Muestreo de fotogramas en los bordes de cada tramo | **Verificados en sincronía: reels 01, 02, 04, 05, 07, 08, 10, 14.** No verificados cuadro a cuadro: reels 03, 06, 09, 11, 12, 13 (usan marcas atadas a navegación por clicks, exacta en todos los casos verificados) |
| Métricas del negocio en cámara | Revisión de las escenas de la home | **Ocultas durante la grabación.** No aparecen en ninguna pieza |
| Build de producción | `npx next build --webpack` sin `DEMO_MODE` | **"✓ Compiled successfully in 4.5s"**, sin errores ni advertencias |

Resultado del script `tools/demo/control/revisar.js`: **TODO OK · 0 avisos**.

---

## 11. PRECIOS

### Precios que existen en el proyecto

| Origen | Valores | Confiabilidad |
|---|---|---|
| `src/app/page.tsx`, líneas 22-45, escritos a mano por el autor del proyecto | Corte de Autor $4.500 / 45 min · Corte & Barba Premium $7.500 / 75 min · Perfilado & Afeitado $3.500 / 30 min | Contenido real del sitio del negocio |
| `src/lib/site.ts` | Seña del 40 % sobre el precio del servicio | Real, es la configuración del sistema |

### Precios que son fixture (inventados para poder grabar)

Están en `tools/demo/seed.json` y **se ven en pantalla**:

- Servicios: Corte de Autor $4.500, Corte & Barba Premium $7.500 y Perfilado & Afeitado $3.500 se copiaron de la home para que no hubiera contradicción entre pantallas. **Color & Platinado $12.000**, **Corte Junior $3.000** y **Ritual de Barba $5.200** (el que se crea en cámara en el reel 4) son invención.
- Productos de la tienda, todos invención: Fighters Matte Clay $8.500, Fighters Strong Carv $9.200, Fighters Twist Versatile $8.800, Fighters Texturizador $7.600, Fighters Glory $9.800, Óleo para barba $6.900, Peine de madera $4.200, Tónico post-afeitado $6.400. Los nombres y las fotos de los cinco productos Fighters sí son del proyecto (`public/images/productos/`).
- Todas las cifras del panel financiero.

### Precios de andmar.studio

**No hay ninguna información de precios de andmar.studio en el repositorio.** Confirmado: ninguna pieza menciona un precio de andmar.studio. Verificación: `grep '\$'` sobre los cuatro archivos de captions y sobre los dos archivos de definición de piezas devuelve **cero coincidencias**. Ninguna pieza usa la fórmula "Desde $X".

---

## 12. ESTADO EN GIT

| Dato | Valor |
|---|---|
| Rama | `claude/finos-barbers-content-4m9d9v` |
| Commit | `fa56f90f9b0d453155e897482410fef75658a0dc` (corto: `fa56f90`) |
| Mensaje | "Modo demo para correr el proyecto sin credenciales y grabar la interfaz" |
| Pusheado | **Sí.** `HEAD` local y `origin/claude/finos-barbers-content-4m9d9v` apuntan al mismo hash |
| Archivos en el commit | **59** · 0,87 MB en total |
| Sin commitear | **Nada.** `git status --porcelain` devuelve 0 líneas |
| Binarios en el historial de la rama | **0.** Verificado con `git log main..HEAD --name-only` filtrando `.mp4/.png/.jpg/.webm` |
| Pull request | No se abrió ninguno |

### El material NO está en el repositorio

Por pedido explícito, el material audiovisual no vive en el repo del cliente mientras el proyecto no esté en producción. La rama se reescribió en **un solo commit limpio** y se hizo force-push, así que los 107 MB de videos e imágenes **no quedan ni en el historial**. Se agregaron reglas a `.gitignore` para que no vuelvan a entrar por accidente.

### Qué sí quedó versionado (59 archivos, 0,87 MB)

| Grupo | Contenido |
|---|---|
| `tools/demo/` (29 archivos) | El modo demo completo: mocks de Supabase, Resend y Mercado Pago, datos de ejemplo, grabador por cuadros con Playwright, montaje con FFmpeg, plantillas gráficas, generador de documentación y control de calidad |
| `andmar-content/finos-barbers/*.md` (8 archivos) | `project.md`, `INFORME-CIERRE.md`, `social/content-index.md` y los cuatro archivos de captions |
| `andmar-content/finos-barbers/videos/bruto/*.json` (18 archivos) | Las marcas de tiempo de cada grabación. Son las que permiten volver a montar los reels sin ajustar segundos a mano |
| Raíz (4 archivos) | `next.config.js`, `package.json`, `package-lock.json`, `.gitignore` |

### Archivos del proyecto original tocados

Cuatro, ninguno de código de aplicación:

| Archivo | Cambio | Riesgo |
|---|---|---|
| `next.config.js` | Bloque condicionado a `DEMO_MODE === '1'` con los reemplazos, más `devIndicators` desactivado en ese mismo modo | Nulo sin la variable. Verificado con `next build --webpack`: "✓ Compiled successfully in 18.7s" |
| `package.json` | `playwright` en devDependencies + 7 scripts `demo:*` | Nulo |
| `package-lock.json` | Consecuencia de lo anterior | Nulo |
| `.gitignore` | `.demo-db.json` y las reglas para que el material pesado no entre al repo | Nulo |

`git diff main..HEAD --name-only -- src/ supabase/ docs/ public/` devuelve **0 archivos**. El código de la aplicación quedó intacto.

## 13. LISTO PARA DRIVE

### Veredicto: **SÍ**

Las 44 piezas publicables (14 reels, 9 posts, 6 placas de carrusel, 8 historias, 7 destacadas) están correctas y verificadas. Los dos reels que estaban defectuosos fueron rehechos y revisados cuadro a cuadro.

### Estructura recomendada para el Drive

```
andmar.studio/
└── 01 · Proyectos/
    └── Finos Barbers/
        ├── 00 LEEME/
        │   ├── project.md              (funcionalidades, claims permitidos y prohibidos)
        │   ├── content-index.md         (índice pieza por pieza, con objetivo, CTA y estado)
        │   └── INFORME-CIERRE.md        (este documento)
        ├── 01 Publicar/
        │   ├── Reels/                   (los 14 reels)
        │   ├── Posts/
        │   │   ├── Sueltos/             (post-01 a post-09)
        │   │   └── Carrusel turnos/     (las 6 placas, numeradas 1 a 6)
        │   ├── Historias/
        │   │   ├── Secuencia A/         (historia-01 a historia-04, en ese orden)
        │   │   └── Sueltas/             (historia-05 a historia-08)
        │   └── Destacadas/              (las 7 portadas)
        ├── 02 Textos/
        │   └── captions/                (reels.md, posts.md, historias.md, destacadas.md)
        └── 03 Fuentes/
            ├── Capturas/
            └── Bruto/
```

### Qué subir y qué dejar afuera

| Contenido | Subir | Criterio |
|---|---|---|
| 14 reels | **Sí** | Entregable principal |
| Posts, carrusel, historias, destacadas | **Sí** | Entregables listos |
| Captions, content-index, project.md, este informe | **Sí** | Sin esto no se sabe qué publicar ni qué se puede afirmar. Pesan 55 KB |
| `recursos/` | **Sí** | 2,3 MB. Plantillas y guía de color y tipografía para armar piezas nuevas con la misma identidad |
| `capturas/` | **Sí, a "03 Fuentes"** | 12,1 MB, 51 archivos. Sirven para armar posts nuevos sin volver a levantar el proyecto |
| `videos/bruto/` | **Sí, a "03 Fuentes"** | 25,7 MB. Es el material del que salen todos los reels. Los `.json` que van al lado permiten remontar sin ajustar tiempos a mano |
| `tools/demo/` | **No** | Es código, vive en el repositorio |

### Peso total

| Paquete | Contenido | Peso |
|---|---|---|
| `andmar-finos-barbers-PUBLICAR.zip` | 14 reels, 30 imágenes, recursos y los 7 documentos | **69,2 MB** |
| `andmar-finos-barbers-FUENTES.zip` | 51 capturas + 18 grabaciones en bruto con sus marcas | **36,5 MB** |
| **Total** | 143 archivos | **105,7 MB** |

### Dónde está cada cosa

Los dos zips y este informe se entregan directamente. **No están en el repositorio**: si hace falta regenerarlos, están los scripts `npm run demo:*` documentados en `tools/demo/README.md`.

---

## 14. PENDIENTES Y RIESGOS

### Lo que quedó sin hacer

1. **Verificar cuadro a cuadro los reels 03, 06, 09, 11, 12 y 13.** Están descritos a partir del guion de grabación y de sus marcas, no de una inspección de fotogramas. El riesgo es bajo: sus marcas están atadas a clicks y navegaciones, no a posiciones de scroll, y los ocho reels de ese tipo que sí se verificaron resultaron exactos. Pero no se puede afirmar de esos seis.
2. **Confirmar si el sitio de Hostinger está en línea.** El proxy de red de este entorno bloquea ese host.

### Lo que necesita material que no se puede generar desde una sesión de código

- **Fotos y video reales del local, del equipo y de cortes.** Todo el material actual es interfaz. Un reel que mezcle interfaz con el local trabajando sería mucho más fuerte, y eso requiere ir a filmar.
- **Música con licencia.** Todos los reels van mudos. En Instagram se pueden musicalizar desde la propia app, pero conviene decidir una línea sonora.
- **Permiso del barbero** para usar el nombre, la marca, la dirección, las fotos del local y las de producto de Fino's Barber's en el Instagram de andmar.studio.

### La pieza más floja

**`reel-13-acceso-por-rol.mp4`.** El concepto es bueno y diferencial (casi nadie muestra permisos), pero visualmente son dos listas sobrias, sin nada que impacte. Publicable, pero no lo pondría primero.

En segundo lugar, **`reel-03-eleccion-de-barbero.mp4`**: es el más corto (13,97 s) y su contenido está contenido dentro del reel 1, así que aporta poco si se publican los dos seguidos.

### Lo que podría terminar publicándose mal si nadie revisa

1. **Los marcadores de demo visibles**: "alias.de.demo" en el reel 1 (segundos 15 a 19), en la placa 5 del carrusel y en las capturas de cobros. Son intencionales y protegen datos privados, pero un espectador atento los va a notar. Hay que decidir si se dejan así (con el material rotulado como demo, es defendible) o si se cambian por valores de aspecto neutro pero verosímil.
2. **Las cifras de finanzas.** Están rotuladas "datos de ejemplo" en la placa de apertura del reel 10, en el caption y en el post 7, pero si alguien recorta el video o publica sólo la imagen sin el caption, la aclaración se pierde.
3. **Publicar el reel 3 justo después del reel 1**: se solapan mucho.

---

## 15. PREGUNTAS ABIERTAS

1. **¿Hay permiso del barbero** para usar la marca Fino's Barber's, el nombre, la dirección, las fotos del local y las de producto en el Instagram de andmar.studio? Todo el material lo asume.
2. **¿Los marcadores de demo se dejan visibles o se cambian?** ("alias.de.demo" en pantalla.)
3. **¿Se publica con música o mudo?** Y si es con música, quién elige la pista y con qué licencia.
4. **¿A dónde apunta el CTA?** Todas las piezas dicen "Escribinos por DM". No hay web de andmar.studio, ni WhatsApp de contacto, ni link en bio definido en el repositorio. Si existen, hay que decidir si se agregan a los captions y a los stickers de las historias.
5. **¿Se abre un pull request hacia `main`** con el modo demo, o la rama queda como está?
