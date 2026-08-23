# Fino's Barbers — proyecto desarrollado por andmar.studio

Documentación del proyecto y del material audiovisual generado a partir de él.

---

## Descripción

**Fino's Barbers** es un sistema web integral para una barbería, diseñado y
desarrollado por **andmar.studio**. No es una plantilla ni un maquetado: es una
aplicación completa, con base de datos, autenticación por roles, pagos y panel
de administración.

En una sola web conviven:

- el **sitio público** de la barbería,
- el **sistema de turnos** para los clientes,
- la **tienda online** de productos,
- el **panel administrativo** del negocio,
- el **panel financiero**,
- y un **acceso limitado para cada barbero**.

**Stack:** Next.js 16 (App Router, React 19) · TypeScript · Tailwind CSS v4 ·
PostgreSQL sobre Supabase (con Row Level Security) · Mercado Pago · Resend.

---

## Estado

| Aspecto | Estado |
|---|---|
| Desarrollo | Prácticamente terminado |
| Producción | **Todavía NO está formalmente en producción** |
| Presentación al barbero | Hecha, con respuesta positiva |
| Relación comercial | **No cerrada** |
| Cómo comunicarlo | **"Proyecto desarrollado"** o **"Demo funcional"** |

> Este estado condiciona todo el contenido: ver *Claims permitidos* y
> *Claims prohibidos* al final del documento.

---

## Funcionalidades verificadas

Todo lo listado fue **revisado en el código y comprobado corriendo la aplicación**
(cada pantalla fue abierta, recorrida y capturada). No hay nada listado "de oídas".

### Sitio público

- Home con hero, franja de datos del negocio, servicios destacados, equipo,
  explicación del proceso de reserva, reseñas, galería del local y ubicación con
  mapa embebido.
- Equipo y reseñas **dinámicos**: salen de la base de datos y se administran
  desde el panel (con textos de respaldo si todavía no hay datos cargados).
- ⚠️ **Los tres servicios destacados de la home NO son dinámicos**: están escritos
  a mano en `src/app/page.tsx` (arreglo `serviciosDestacados`, con los precios
  como texto). Lo que sí se carga desde el panel es el catálogo del formulario
  de reserva y el de la tienda. Por eso ninguna pieza afirma que la home se
  actualice sola, y el reel de servicios se grabó sobre el panel y la reserva,
  no sobre la home.
- ⚠️ **La franja de datos del negocio de la home** ("+10 años de oficio",
  "+2.000 cortes al año", "4.9★ reseñas Google", "100% turnos online") también
  está escrita a mano en el código. Son afirmaciones del comercio que no
  podemos respaldar, así que **se ocultan durante la grabación** y no aparecen
  en ninguna pieza.
- Menú hamburguesa en celular (drawer) y navegación por anclas.
- Botón flotante de WhatsApp y enlaces a redes.
- Datos del negocio centralizados en un solo archivo (dirección, horarios,
  medios de pago, redes, porcentaje de seña).

### Sistema de turnos

- Reserva en **3 pasos**: servicio → barbero → fecha y hora.
- **Disponibilidad real**: franjas cada 15 minutos entre 09:00 y 20:00,
  descartando las que se solapan con turnos ya tomados y las que no entran
  antes del cierre según la duración del servicio elegido.
- Rango de fechas limitado (de hoy hasta 60 días), validado en el formulario
  y también en el servidor.
- Índice único en base de datos que impide dos turnos superpuestos.
- **Seña obligatoria** para confirmar: un porcentaje configurable del precio
  del servicio (40% en este proyecto), con dos medios: **Mercado Pago** o
  **transferencia**.
- Email automático de confirmación y de cancelación (Resend).
- Panel del cliente: lista de sus turnos con estado, barbero, servicio, precio,
  y opción de cancelar.

### Panel administrativo

Diez secciones, todas con operaciones reales:

| Sección | Qué permite |
|---|---|
| Dashboard | Turnos de hoy, servicios activos y total de clientes |
| Turnos | Lista con filtros por estado y por fecha (hoy / semana / todas), confirmar, cancelar, confirmar la seña a mano y crear una reserva manual |
| Calendario | Vista semanal de todos los barberos, un color por profesional, filtro por barbero y navegación entre semanas |
| Servicios | Alta, edición, baja y activar/desactivar |
| Productos | Alta, edición, baja, precio, stock, stock mínimo e imagen (subida desde la PC a Supabase Storage o pegando una URL) |
| Categorías | Alta, edición y baja de categorías de productos y de servicios, con subcategorías |
| Barberos | Alta, edición, ocultar/mostrar, especialidad, días, bio, foto y **creación de la cuenta de acceso** del barbero |
| Reseñas | Alta, edición, baja y publicar/despublicar en la web |
| Cobros | Estado de la conexión con Mercado Pago (OAuth / Mercado Pago Connect), conectar y desconectar |
| Finanzas | KPIs del mes y acumulado, navegación por mes, alta/edición/baja de transacciones y gráficos |

### Tienda online

- Catálogo con buscador por texto y filtros por categoría.
- Stock real, con badges de **"Sin stock"** y **"¡Últimas N!"**.
- Carrito persistente en el navegador (sobrevive a recargar la página) con
  drawer lateral y control de cantidades.
- **Checkout sin cuenta** (invitado): nombre, email y teléfono.
- Elección entre **retiro en el local** o **envío a domicilio**.
- Pago con Mercado Pago y páginas de éxito y de error.
- El pedido pagado se registra automáticamente como ingreso en finanzas.

### Panel financiero

- KPIs: ingresos, egresos y balance del mes, más balance acumulado.
- Gráfico de barras de ingresos vs egresos de los últimos 6 meses.
- Gráficos de dona: egresos por categoría y origen de los ingresos.
- Alta, edición y baja de transacciones manuales, con categorías.
- **Registro automático** al confirmar un turno o al pagarse un pedido, con
  badge de origen (turno / tienda / manual) y sin duplicados.

### Autenticación y permisos

- Registro con nombre y apellido, login y **recuperación de contraseña**
  (pedir el mail + setear la nueva).
- Confirmación de email.
- Tres roles: **administrador**, **barbero** y **cliente**, con rutas
  protegidas y redirecciones según el rol.
- Área del barbero: **su** agenda y la lista de clientes en solo lectura.
  No ve stock, servicios, cobros ni finanzas.
- Los permisos también están aplicados en la base de datos (Row Level Security),
  no solo en la interfaz.

### Otros

- **PWA**: instalable en el celular, con manifest, íconos, accesos directos
  ("Reservar turno", "Mis turnos"), service worker con caché y un banner de
  instalación que no aparece si ya está instalada.
- **Responsive** verificado en celular, tablet y escritorio.
- Precios formateados en formato argentino (`$8.500`).

### Lo que el sistema NO tiene

Se verificó explícitamente y **no existe** en el proyecto:

- Sistema de **descuentos, cupones o promociones**.
- Programa de fidelidad o puntos.
- Recordatorios automáticos por WhatsApp.
- Reportes exportables (PDF / Excel).
- Reserva de varios servicios en un mismo turno.

> Por eso **no hay ninguna pieza de contenido sobre descuentos**: no se
> comunica nada que el sistema no haga.

---

## Páginas

| Ruta | Acceso | Qué es |
|---|---|---|
| `/` | Público | Home de la barbería |
| `/tienda` | Público | Catálogo de productos |
| `/checkout` | Público | Checkout (permite comprar sin cuenta) |
| `/checkout/success` · `/checkout/failure` | Público | Resultado del pago |
| `/login` · `/register` | Público | Ingreso y registro |
| `/recuperar` · `/restablecer` | Público | Recuperación de contraseña |
| `/dashboard` | Cliente | Panel del cliente |
| `/reservar` | Cliente | Reserva en 3 pasos |
| `/turnos` | Cliente | Sus turnos |
| `/admin/dashboard` | Admin | Resumen del negocio |
| `/admin/turnos` | Admin | Agenda con filtros y acciones |
| `/admin/calendario` | Admin | Calendario semanal por barbero |
| `/admin/servicios` | Admin | ABM de servicios |
| `/admin/productos` | Admin | ABM de productos y stock |
| `/admin/categorias` | Admin | ABM de categorías |
| `/admin/barberos` | Admin | ABM del equipo y cuentas de acceso |
| `/admin/resenas` | Admin | ABM de reseñas |
| `/admin/pagos` | Admin | Conexión de cobros con Mercado Pago |
| `/admin/finanzas` | Admin | Panel financiero con gráficos |
| `/barbero/calendario` | Barbero | Su agenda |
| `/barbero/clientes` | Barbero | Clientes (solo lectura) |

---

## Contenido generado

```
andmar-content/finos-barbers/
├── videos/bruto/        Grabaciones sin editar de cada pantalla (1080×1920 + escritorio)
├── capturas/            Capturas de todas las pantallas (celular y escritorio)
├── recursos/            Piezas gráficas reutilizables
├── social/
│   ├── reels/           Reels finales listos para publicar
│   ├── posts/           Posts y carrusel (1080×1350)
│   ├── historias/       Historias (1080×1920)
│   ├── destacadas/      Portadas de destacadas
│   ├── captions/        Captions, objetivo y CTA de cada pieza
│   └── content-index.md Índice general
└── project.md           Este archivo
```

Todo el material se grabó sobre la **aplicación real corriendo**, con datos de
demostración. No hay maquetas ni pantallas dibujadas: lo que se ve en los videos
es el sistema funcionando.

### Cómo se generó

El proyecto necesita credenciales reales (base de datos, emails, pagos) que no
deben quedar en ningún lado. Para poder grabar sin ellas se armó un **modo demo**
(`tools/demo/`, activado sólo con `DEMO_MODE=1`) que:

- reemplaza la base de datos por un almacén local con datos de ejemplo,
- reemplaza el envío de emails y la pasarela de pago por versiones simuladas,
- y **reemplaza los datos privados del comercio** (alias de cobro y WhatsApp)
  por marcadores, para que no aparezcan en ninguna grabación.

En producción no cambia absolutamente nada: el modo demo está apagado por defecto.

---

## Mejores assets

Ordenados por lo que más impacta:

1. **`social/reels/reel-01-sistema-de-turnos.mp4`** — el flujo de reserva completo.
   Es la pieza que mejor explica qué hacemos. Empezá por acá.
2. **`social/reels/reel-10-finanzas.mp4`** — los gráficos del panel financiero.
   Visualmente es lo más impresionante del sistema.
3. **`social/reels/reel-09-agenda-y-calendario.mp4`** — el calendario semanal a color.
4. **`social/reels/reel-07-panel-administrativo.mp4`** — el recorrido por el panel.
   El mejor argumento para un dueño de negocio.
5. **`capturas/admin-calendario-desktop.png`** — la mejor captura estática.
6. **`capturas/admin-finanzas-graficos-desktop.png`** — segunda mejor captura.
7. **`social/posts/carrusel-turnos/`** — carrusel educativo, alto guardado.

---

## Claims permitidos

Se puede decir, porque es verdad y está verificado:

- "Proyecto desarrollado por andmar.studio".
- "Demo funcional".
- "Sistema web integral para una barbería".
- "Turnos, servicios, barberos y tienda online en un mismo sistema".
- "Reserva online en 3 pasos con disponibilidad real".
- "Seña para confirmar el turno, con Mercado Pago o transferencia".
- "Panel administrativo con turnos, servicios, productos, categorías, barberos,
  reseñas, cobros y finanzas".
- "Panel financiero con gráficos de ingresos y egresos".
- "Accesos distintos para administrador, barbero y cliente".
- "Responsive e instalable como app (PWA)".
- "Diseñado y programado desde cero, no es una plantilla".
- "Estamos arrancando, y hacemos productos reales y profesionales".
- Al mostrar números de finanzas: aclarar **"datos de ejemplo"**.
- "Los servicios, productos, barberos y reseñas se cargan desde el panel"
  (verificado; **no** aplica a la sección de servicios de la home).

## Claims prohibidos

**No se puede decir**, porque no es verdad o no está verificado:

- ❌ "Nuestro cliente Fino's Barbers" / "trabajamos con Fino's Barbers".
- ❌ "Sistema en producción" / "en uso" / "operando hoy".
- ❌ Cualquier métrica: turnos gestionados, clientes, ventas, ahorro de tiempo,
  aumento de reservas, ROI.
- ❌ Cantidad de clientes o de proyectos entregados por andmar.studio.
- ❌ Testimonios o citas del barbero.
- ❌ Precios de nuestros servicios (no hay información confiable, no se inventan).
- ❌ Funcionalidades que no existen: descuentos, cupones, fidelización,
  recordatorios por WhatsApp, reportes exportables.
- ❌ Plazos de entrega o garantías que no se hayan acordado.
- ❌ "El dueño cambia un precio y la home se actualiza sola": la sección de
  servicios de la home está escrita a mano en el código.
- ❌ "Mercado Pago conectado / cobrando": la integración está construida y
  probada en demo, pero **no activada** en producción. Se dice "integrado".
- ❌ Mostrar el alias de cobro real, el WhatsApp real del barbero o cualquier
  dato personal. (Ya están reemplazados en todo el material generado.)

---

## Cómo regenerar el material

```bash
npm install
cp tools/demo/env.demo .env.local          # variables ficticias, no son credenciales
DEMO_MODE=1 npx next dev --webpack         # levanta la app en modo demo

node tools/demo/capture/escenas.js         # grabaciones verticales
node tools/demo/capture/escenas-desktop.js # grabaciones de escritorio
node tools/demo/capture/capturas.js        # capturas de pantalla
node tools/demo/brand/piezas.js            # posts, historias y destacadas
node tools/demo/edicion/reels.js           # reels finales
node tools/demo/edicion/responsive.js      # pieza responsive
node tools/demo/contenido/generar-docs.js  # captions + content-index
node tools/demo/control/revisar.js         # control final de calidad
```

Cuentas del modo demo (sólo locales, no son credenciales reales):
`admin@finosbarbers.demo`, `cliente@finosbarbers.demo` y `facundo@finosbarbers.demo`,
todas con la contraseña `demo1234`.
