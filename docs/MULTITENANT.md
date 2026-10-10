# Multi-tenant — de "una barbería" a "muchos locales"

> Documento vivo del proyecto. Explica el plan, las decisiones tomadas y qué se
> hizo en cada fase, en lenguaje simple, para poder estudiarlo.
> Se trabaja en la rama `ccr-21a597dc-01874p`. La demo de Roble publicada en
> Hostinger sale de `main` y del proyecto de Supabase `finos-barbers`, que
> también usa la web de 369 (en producción). Ese proyecto es **producción**:
> nada se prueba ahí. El producto va a vivir en ese mismo proyecto (ver
> decisión 3).
>
> El producto todavía no tiene nombre (ver decisión 7). Roble es la barbería
> ficticia que se usa para mostrarlo.

---

## La idea en simple

Hoy el sistema sirve para **un** negocio: una base, un sitio, una marca.

El objetivo es **un solo sitio y una sola base donde conviven muchos locales**
(en inglés, *tenants*). Cada local ve solo lo suyo: sus turnos, sus clientes,
su tienda, su caja.

Una forma de imaginarlo: **un edificio con departamentos**.
- El edificio es el sitio y la base: hay uno solo, y se mantiene una sola vez.
- Cada local es un departamento.
- La **membresía** es la llave: dice en qué departamento podés entrar y con qué
  rol (dueño, barbero o cliente).
- La base de datos es **el portero** (RLS, ver glosario): aunque el código se
  equivoque y pida datos de otro departamento, el portero no lo deja pasar.

Eso último es lo más importante del diseño: la separación entre locales no
depende de que el código "se acuerde" de filtrar, sino de reglas que la propia
base aplica siempre.

---

## Decisiones tomadas (aprobadas el 10/10/2026)

### 1. Cada local tiene su carpeta: `sitio.com/elroble`
- **Por qué:** la demo vive en un dominio temporal de Hostinger que no admite
  subdominios (`elroble.sitio.com`). La carpeta funciona hoy, sin tocar DNS ni
  certificados.
- **Mercado Pago:** con carpeta alcanza con **una** dirección de vuelta
  registrada para todos los locales.
- **Preparado para dominio propio:** el `proxy.ts` va a decidir el local en dos
  pasos: primero mira si el dominio está cargado en una tabla `dominios` (vacía
  por ahora) y, si no, usa la carpeta. Sumar `turnoselroble.com.ar` va a ser
  cargar una fila, no reescribir páginas.

### 2. Usuarios: membresías por local + equipo de la plataforma
- Tabla `membresias`: usuario + local + rol (`dueño`, `barbero`, `cliente`).
  Una persona puede ser cliente en un local y barbero en otro.
- El dueño también puede ser barbero (tener su agenda): es lo normal en una
  barbería de barrio.
- Equipo de la plataforma, en una tabla aparte: Nico (administrador, ve todo) y
  Delfina (crea y activa barberías; sus permisos exactos están a definir, ver
  "Cómo se da de alta una barbería"). Va aparte a propósito: nadie puede
  volverse parte del equipo tocando un dato de un local.
- Consecuencia de tener una sola base: **un mail = una cuenta** en toda la
  plataforma. Cada local solo ve lo que esa persona hizo con él.

### 3. El producto vive en el proyecto `finos-barbers`, sin pagar hasta vender
El plan gratis de Supabase permite 2 proyectos y los dos están ocupados:
`codigo-rojo` (la tienda de tu prima, por salir) y `finos-barbers`. En
`finos-barbers` hoy conviven la demo de Roble y la web de 369
(369detail.com.ar, en producción, con su galería de fotos). El producto va a
vivir ahí también: lo que hay hoy pasa a ser Roble, el local de demostración.

| Base | Dónde | Para qué |
|---|---|---|
| **Producción** | Proyecto `finos-barbers` (archivo `.env.produccion.local`) | La demo, la web de 369 y, más adelante, el producto. Solo recibe migraciones ya probadas. |
| **Desarrollo** | Supabase local en la PC, con Docker (archivo `.env.local`) | Donde se construye y se prueba todo. Gratis, y no toca internet. |

- **Por qué:** se evaluó una base nueva solo para el producto (más prolija), pero
  obligaba a pagar un tercer proyecto antes de tener un solo cliente. El uso
  actual es mínimo (base: 28 de 500 MB; archivos: 0,03 de 1 GB), así que el plan
  gratis alcanza de sobra para las demos.
- **Regla de oro: nada de 369 se toca.** La foto de la Fase 0 muestra qué tablas,
  bucket y reglas usa la galería de 369 (y si depende de algo compartido, como
  `is_admin()`); quedan anotados como intocables y ninguna migración los cambia.
  Como la foto incluye todo, la copia local también tiene lo de 369: se puede
  comprobar que no se rompe antes de tocar producción.
- **Cada cambio en producción:** primero probado en desarrollo, con copia de
  seguridad justo antes (el plan gratis no hace backups solo: se hacen con
  `scripts/respaldar-base.mjs`), en un horario tranquilo, y revisando enseguida
  la demo y la galería de 369.
- **Cuándo pagar:** cuando entre la primera barbería que pague, el proyecto pasa
  al plan Pro (copias de seguridad diarias, no se pausa). Lo cubre el abono y
  beneficia también a la demo y a 369. En ese momento vemos cómo ordenar los
  proyectos para pagar lo mínimo, y si conviene darle a 369 su propio proyecto.
- **Límites compartidos:** la galería de 369 y las barberías comparten el espacio
  del plan gratis. Las imágenes nuevas se van a comprimir al subirlas.
- Los scripts que escriben en la base se niegan a tocar producción salvo que se
  lo pidas a propósito con `--produccion`.

### 4. `/` sola lleva a `/roble`
Mientras no exista la página pública del producto (fuera de alcance por ahora),
la dirección sola lleva al local de demostración.

### 5. Las demos aceptan reservas "de muestra"
En un local en estado **demo**, el flujo de reserva funciona completo para
mostrarlo en vivo, pero no se mandan mails, no se cobra por Mercado Pago y el
turno queda marcado como muestra. Además: cartel "Muestra" y sin indexar en Google.

### 6. Roble queda como local de demostración
Roble deja de ser "la marca del sitio" y pasa a ser un local más dentro del
producto: el ejemplo genérico para mostrar cuando todavía no hay datos de la
barbería que se visita.

### 7. El producto necesita nombre propio (a definir)
"Roble" es la barbería ficticia y "Finos" era un posible cliente que ya no
está: ninguno de los dos es el nombre del producto. El nombre se ve en el panel
de la plataforma, el pie de los mails, el cartel de las demos, el dominio y la
app de Mercado Pago que autorizan los dueños. Las páginas de cada barbería
muestran la marca de la barbería, no la del producto.
- Va a vivir en un solo archivo: cambiarlo es tocar una línea.
- Hace falta antes de la Fase 3 (cuando aparece en pantalla) y antes de crear la
  app de Mercado Pago y el dominio.
- El repo (`finos-barbers`) y los proyectos de Supabase se renombran después,
  junto con el sitio propio del producto: renombrar el repo puede afectar el
  deploy de Hostinger y conviene hacer todo de una vez.

---

## Lo que es de 369: intocable

> Sale de la foto del 10/10/2026 y del código de la web de 369 (repo
> `369-detail-studio`). Si esa web cambia, esta lista se revisa.

La web de 369 y la barbería comparten el proyecto de Supabase, pero adentro casi
no se cruzan. 369 usa **tres tablas y un bucket**, y entra siempre desde su
servidor con la llave maestra (service role). Su panel tiene una clave propia:
no usa las cuentas de Supabase.

| Es de 369 | Qué guarda |
|---|---|
| Tabla `trabajos` | Cada trabajo de la galería |
| Tabla `fotos` | Las fotos de cada trabajo, antes y después (apunta a `trabajos`) |
| Tabla `videos` | Los videos de Instagram y TikTok |
| Bucket `galeria` | Los archivos de las fotos: 78 archivos, 25,5 MB, todos en la carpeta `trabajos/` |

Las tres tablas tienen RLS activado y **ninguna política**: desde un navegador
no se ven ni se tocan; solo entra el servidor de 369. Así tienen que quedar.

**No es de 369** (era la duda antes de tener la foto): `profiles`, `is_admin()`,
`handle_new_user()`, las cuentas de usuario y los mails de Supabase (confirmar
cuenta, recuperar contraseña). Todo eso lo usa solo la barbería: la Fase 2 lo
puede rediseñar sin afectar a 369.

### Reglas
1. Ninguna migración nombra `trabajos`, `fotos`, `videos` ni `galeria`: ni para
   cambiarlas, ni para ordenarlas, ni para sumarles `local_id` o políticas.
2. Son nombres ocupados. Si una barbería necesita su propia galería, sus tablas
   y su bucket se llaman de otra forma.
3. Storage hoy no tiene ninguna política: los archivos se suben siempre desde
   un servidor. Si alguna vez hace falta una, tiene que decir
   `bucket_id = 'imagenes'`, para no abrir `galeria`.
4. La llave maestra es la misma para los dos sitios. Si se cambia, se cambia en
   los dos a la vez.
5. El espacio es compartido (1 GB de archivos, 500 MB de base). Hoy todo lo que
   hay en Storage es de 369: el bucket `imagenes` de la barbería está vacío.
6. La web de 369 tiene un chequeo, `/api/health`, que lee `trabajos`. Con un
   monitor llamándolo cada pocos minutos, el proyecto no se pausa por falta de
   uso. Otro motivo para no tocar esa tabla.

### Algo de todo el proyecto que la foto no muestra
Producción tiene un *disparador de eventos* llamado `ensure_rls`: cada vez que
se crea una tabla en `public`, le activa RLS solo. La foto guarda la función
que usa (`rls_auto_enable()`) pero no el disparador, así que **en desarrollo no
existe**. Regla: toda migración que crea una tabla activa RLS a mano
(`alter table ... enable row level security`). Así las dos bases se comportan
igual.

### Cómo comprobar que 369 sigue bien
Después de cada cambio en producción:
- `https://369detail.com.ar` → la home y la galería muestran las fotos.
- `https://369detail.com.ar/api/health` → responde `{"ok":true,"db":"ok"}`.

---

## Fases

| # | Qué cambia | Estado |
|---|---|---|
| 0 | Esquema base versionado + proyecto de desarrollo | 🟡 Hecha el 10/10/2026; falta el OK de Nico y decidir cuándo va la `0005` a producción |
| 1 | Tabla `locales` y columna `local_id` en todas las tablas de la barbería; lo que existe hoy pasa a ser Roble, el local de demostración (sin cortar la demo ni tocar lo de 369) | ⏳ |
| 2 | Membresías y RLS por local (reemplaza `is_admin()`), con prueba de aislamiento | ⏳ |
| 3 | El sitio elige el local por la dirección; `SITE` pasa a ser datos del local | ⏳ |
| 4 | Llamadas con permisos totales filtradas por local; Mercado Pago e imágenes por local | ⏳ |
| 5 | Prueba automática de aislamiento completa | ⏳ |
| 6 | Alta de barberías desde el panel (demo → activo), ver la sección de abajo | ⏳ |
| 7 | Interruptores de plan: turnos, tienda, finanzas | ⏳ |

Cada fase se prueba en desarrollo. A producción van todas juntas después de la
Fase 5: con copia de seguridad, en un horario tranquilo, y revisando la demo y
la galería de 369 enseguida. Hasta ese momento producción sigue igual que hoy.

---

## Cómo se da de alta una barbería (propuesta para la Fase 6)

> Propuesta a confirmar. Se construye en la Fase 6, pero condiciona cosas antes:
> los datos de cada local con valores por defecto (Fase 1) y el lugar de
> Delfina en la plataforma (Fase 2).

**La idea:** crear una barbería es llenar un formulario desde el celu. No hace
falta una PC, ni código, ni a Nico.

### El recorrido
1. **Buscar** barberías (Instagram, Google Maps) y anotar lo que haya a mano:
   nombre, dirección, WhatsApp, Instagram, precios si están publicados.
2. **Crear la demo** desde el panel de la plataforma. Solo el nombre es
   obligatorio. Devuelve el link (`sitio/el-tano`) para mostrar. Lleva entre 5 y
   10 minutos.
3. **Mostrarla**, en persona o mandando el link por WhatsApp. Se ve el cartel
   "Muestra", no aparece en Google y las reservas son de prueba.
4. **Si la quieren, activarla.** Es lo que llamábamos "instalación": no hay nada
   que instalar, porque la barbería ya existe en la plataforma. Activar es una
   lista de pasos en el panel:
   1. Revisar con el dueño precios, barberos y horarios.
   2. Invitar al dueño: se carga su mail y le llega una invitación para crear su
      contraseña (también se puede copiar el link y mandarlo por WhatsApp).
   3. El dueño conecta su Mercado Pago desde su celular. Lo tiene que hacer él,
      con su cuenta: la plata le cae directo a él.
   4. Tocar **Activar**: se borran las reservas de prueba, se va el cartel,
      Google la puede indexar y empiezan a salir los mails.
5. **Después**, el dueño cambia lo que quiera desde su panel: el logo original,
   fotos, precios.

Delfina puede hacer todo esto sola, en el local, desde el celu, en unos 15
minutos con el dueño al lado. A Nico lo necesitan solo para algo fuera de lo
común (por ejemplo, un dominio propio, más adelante).

### Si falta información
Ningún dato salvo el nombre frena la demo. Todo tiene un valor por defecto que
se ve bien y se completa después:

| Si no tienen... | Qué hace el sistema |
|---|---|
| El logo en buena calidad | Dibuja uno con el nombre, como hoy el de Roble. Si suben una imagen (aunque sea la foto de perfil de Instagram o una foto del cartel), la recorta y avisa si es chica. |
| Colores | Se elige una paleta armada (por ejemplo madera y cobre, o negro y dorado). |
| Fotos del local | La página se ve bien sin fotos: Roble no tiene ninguna. |
| Servicios y precios | Se parte de una plantilla (corte, barba, corte + barba...) con precios de referencia para ajustar. |
| Barberos | Alcanza con el nombre; la foto es opcional. |
| Horarios | Plantilla "lunes a sábado de 10 a 20". |

El panel muestra qué le falta a cada barbería (logo, fotos, precios), así saben
qué pedirle al dueño al activarla.

### Los estados de una barbería
`demo` → `activo` → `suspendido` (si deja de pagar) · `demo` → `archivado` (si
no se vendió). El sistema anota quién creó y quién activó cada una, por si
después quieren saber quién vendió qué.

### A decidir
- **Permisos de Delfina.** Propuesta: rol "comercial" que crea, edita y activa
  barberías, pero no ve los datos privados de las barberías ya activas (sus
  clientes, su caja) ni puede borrar. Nico sigue siendo el único administrador
  total. Alternativa: los mismos permisos que Nico.
- **Demos que no se venden.** Propuesta: se archivan solas a los 30 días (el link
  muestra "esta muestra terminó"), se pueden revivir con un botón y nunca se
  borran solas.
- **Cobro del abono:** fuera de alcance por ahora (se cobra a mano).

---

## Reglas de trabajo

- Una fase por vez: al terminar, se explica qué cambió y cómo verificarlo, y se
  espera el OK.
- Nada destructivo sobre la base (borrar tablas, columnas o datos) sin
  aprobación explícita.
- Los secretos van en archivos `.env*` (git los ignora). Nunca en el chat ni en el código.
- La foto `0000_base.sql` no se edita: los cambios van en migraciones nuevas
  (`0005`, `0006`...).
- En producción conviven la demo y la web de 369: nada de 369 se toca, y antes
  de cada cambio en producción se hace una copia de seguridad.
- Toda migración se prueba primero en desarrollo.
- Antes de dar algo por terminado: `npm run lint` y `npm run build` en verde.

---

## Glosario para estudiar

**Tenant / local** — Cada cliente del producto (cada barbería). En el código y en
la base vamos a decir *local*.

**Migración** — Un archivo `.sql` con cambios de estructura de la base (crear
una tabla, agregar una columna). Se numeran (`0001`, `0002`...) y se aplican en
orden. Así cualquier base se puede llevar al mismo estado corriendo los mismos
archivos.

**Idempotente** — Que se puede correr dos veces sin romper nada ni duplicar.
Por eso las migraciones usan `create table if not exists`, `add column if not
exists`, etc.

**Transacción** — Un grupo de instrucciones que entra **completo o no entra**.
Si una falla, se hace *rollback*: la base vuelve a como estaba antes de empezar.

**Catálogo de Postgres** — Las tablas internas donde Postgres anota todo lo que
tiene (`pg_class` = tablas, `pg_attribute` = columnas, `pg_policies` =
políticas...). El exportador de la Fase 0 lee de ahí.

**RLS (Row Level Security)** — Seguridad por filas. Con RLS activado en una
tabla, cada consulta que llega desde el navegador pasa por las *políticas*: si
ninguna la permite, no ve ni toca nada.

**Política** — Una regla de RLS. Tiene dos partes:
- `using (...)`: qué filas se pueden **ver o tocar** (select, update, delete).
- `with check (...)`: qué filas se pueden **escribir** (insert, update).

**Clave pública (anon) y service role** — La clave pública viaja en el navegador
y siempre pasa por RLS. La *service role* es la llave maestra del servidor:
**saltea RLS**. Por eso cada uso de `createServiceClient()` tiene que filtrar por
local a mano (Fase 4).

**security definer** — Una función que corre con los permisos de quien la creó,
no de quien la llama. Sirve, por ejemplo, para que `is_admin()` pueda leer
`profiles` aunque el usuario no tenga permiso. Tiene que fijar su `search_path`
para que nadie la engañe.

**search_path** — La lista de esquemas donde Postgres busca un nombre cuando no
le decís cuál. Con search_path vacío hay que escribir `public.turnos` completo.

**Seed** — Datos de ejemplo para cargar en una base vacía.

**Slug** — La parte de la dirección que identifica a cada barbería: en
`sitio/el-tano`, el slug es `el-tano`. Se arma solo a partir del nombre.

**Proxy (`src/proxy.ts`)** — En Next 16, el archivo que antes se llamaba
`middleware.ts`. Corre antes de cada página. Hoy refresca la sesión y protege
rutas; en la Fase 3 también va a decidir de qué local es cada visita.

---

## Bitácora

### Fase 0 — Parte 1 (10/10/2026)

**Problema:** la estructura de la base (las tablas principales, `is_admin()`,
las políticas) vivía solo en Supabase. Sin eso escrito en el repo no se puede
diseñar la seguridad por local, ni armar una copia para desarrollo.

**Qué se hizo** (todo en `scripts/`, nada toca la app ni la base):

| Archivo | Para qué sirve |
|---|---|
| `scripts/exportar-esquema.mjs` | Saca la "foto" de la base en modo **solo lectura** y escribe `0000_base.sql`, los datos de ejemplo y un reporte con alertas. También compara una base contra la foto. |
| `scripts/preparar-desarrollo.mjs` | Con un comando arma el proyecto de desarrollo: migraciones, datos de ejemplo y un usuario admin de prueba. Se niega a correr fuera de desarrollo. |
| `scripts/migrate.mjs` | El de siempre, ahora con guardia: no escribe fuera de desarrollo salvo que pongas `--produccion`. Acepta varios archivos y `--env`. |
| `scripts/lib/entorno.mjs` | Lee los `.env`, identifica a qué proyecto apunta cada uno y aplica la guardia. |
| `scripts/lib/postgres.mjs` | Conexión, sesión de solo lectura y aplicación de archivos en transacción. |
| `scripts/lib/esquema.mjs` | Lee el catálogo y genera el SQL, los datos de ejemplo, el reporte y la comparación. |
| `.env.local.example` | Suma `SUPABASE_DB_URL`, `SUPABASE_ENTORNO` y la cuenta admin de prueba. |

**Cómo se verificó** (sin acceso a la base real: el entorno de trabajo no puede
conectarse a Supabase). Se armó un Postgres local que imita a Supabase (`auth.users`,
Storage, roles `anon`/`authenticated`/`service_role`) con una "producción
simulada" llena de casos difíciles: un tipo enum, un contador numérico, una
vista, una función que devuelve filas de una tabla, una tabla sin RLS, el
disparador de registro que copia el rol, categorías con categoría madre, un
bucket con su política y una tabla en Realtime. Resultados:
- La foto aplicada sobre una base vacía, más 0001 a 0004, dio una copia
  **idéntica** en las 18 secciones.
- Correr todo dos veces no duplica nada.
- Los datos de ejemplo no incluyen cuentas, turnos, ni el token de Mercado Pago.
- Las guardias frenan: sin etiqueta, credenciales cruzadas entre proyectos,
  foto ya existente, migración con error (se deshace sola).
- La conexión del exportador rechaza escrituras.

**De paso: lint en verde.** `npm run lint` ya fallaba en `main` con 4 errores en
código que no era de esta fase. Se corrigieron sin cambiar nada visible:
- `admin/pagos/page.tsx`: comillas escritas como `&quot;` (se ven igual).
- `AdminNav.tsx` y `MobileMenu.tsx`: la forma de saber si el componente ya está
  en el navegador pasó de `useState + useEffect` a `useSyncExternalStore` (la
  recomendada por React). Se probó el menú del celular en un navegador real:
  abre, bloquea el scroll de fondo y cierra, sin errores en la consola.

Quedan 6 advertencias que ya existían (uso de `<img>` en lugar de `next/image`
y un comentario de lint sobrante). No hacen fallar el lint.

### Decisiones del 10/10/2026 (después de la Parte 1)

- **Roble queda como local de demostración** (decisión 6).
- **El producto necesita nombre propio**, a definir antes de la Fase 3 (decisión 7).
- **Propuesta de alta de barberías** (sección "Cómo se da de alta una
  barbería"): pendiente de confirmar los permisos de Delfina y qué pasa con las
  demos que no se venden.
- **Dónde vive el producto** (decisión 3). Primero se decidió una base nueva solo
  para el producto. Después se cambió: el plan gratis ya tiene sus 2 proyectos
  ocupados (`codigo-rojo` y `finos-barbers`) y una base nueva obligaba a pagar
  antes de vender. Quedó así: producción es `finos-barbers` (compartido con la
  demo y con la web de 369) y desarrollo corre en la PC con Supabase local
  (Docker), gratis.
- **Ajuste en los scripts:** `.env.produccion.local` es `finos-barbers`, la base
  protegida: si `.env.local` apunta ahí, los scripts de escritura frenan. La
  foto ahora desactiva la validación de funciones para toda la conexión (y la
  vuelve a activar al final), así funciona igual con `migrate.mjs` y con el
  Supabase local, que aplica las migraciones solo al levantarse.

### Copia de seguridad (10/10/2026)

`scripts/respaldar-base.mjs` guarda en la PC, en modo solo lectura, una copia
de la base: la estructura (`esquema.sql`) y todas las filas (`datos.json`) de
las tablas de `public`, la lista de archivos de Storage (no los archivos) y las
cuentas sin contraseñas ni códigos de acceso. Queda en `respaldos/`, que git
ignora. Si le falta permiso para leer alguna tabla, avisa y guarda el resto.
Probado: descarta los secretos de las cuentas, no escribe en la base, sigue
adelante con permisos limitados, y los datos guardados se pueden volver a
cargar en una base vacía.

### Fase 0 — Partes 2 y 3, y revisión de la foto (10/10/2026)

**Qué se hizo**
- Credenciales separadas: `.env.produccion.local` (producción, etiquetada) y
  `.env.local` (el Supabase local de la PC).
- **Primera copia de seguridad** de producción, en `respaldos/` (no se sube).
- **La foto:** 14 tablas, 24 políticas, 3 funciones, 1 disparador y 2 buckets.
  Quedó en `supabase/migrations/0000_base.sql`, con su reporte.
- **Desarrollo en la PC:** Supabase local con Docker (Postgres 17, igual que
  producción). La comparación contra la foto dio ✓ en las 18 secciones.
- **La app contra la copia local:** responden la home, la tienda (muestra los
  productos activos y esconde los inactivos), el login y el registro; el admin
  de prueba entra al panel; un cliente nuevo ve `/reservar` con los servicios
  de la base; y un cliente que pide el panel de admin o de barbero es devuelto
  a su lugar.
- Qué es de 369 quedó escrito arriba, en "Lo que es de 369: intocable".

**Las alertas del reporte, una por una**

| Alerta | Qué resultó |
|---|---|
| 🔴 `handle_new_user()` lee `raw_user_meta_data` y menciona `role` | **Falsa alarma.** Del formulario toma solo nombre y apellido; el rol lo escribe fijo: `'client'`. Probado: registrarse pidiendo ser admin deja la cuenta como cliente. |
| 🟠 `profiles` deja a cada usuario editar su fila | **Está bien.** La política exige que después del cambio `role` siga siendo `'client'`. Probado: no puede pasarse a admin ni a barbero. |
| ℹ️ `fotos`, `trabajos` y `videos` sin políticas | A propósito: son de 369 y solo entra su servidor. |
| ℹ️ `mp_conexion` sin políticas | A propósito: guarda los tokens de Mercado Pago. |

El agujero del registro que se temía **no existe**.

**Lo que el reporte no detecta y apareció leyendo la foto a mano**

Se probó con una cuenta de cliente de verdad contra la copia local, hablándole
a la base sin pasar por la app. Cuatro escrituras pasaban y no deberían:
crear un pedido propio ya "pagado", agregarle renglones a un pedido propio,
crear un turno con la seña ya "pagada" y crear un turno con un pago inventado.

- **Arreglo:** `supabase/migrations/0005_cerrar_escrituras_directas.sql`. Borra
  dos políticas de alta que la app nunca usó (los pedidos los crea el servidor)
  y endurece la de alta de turnos. No toca nada de 369 ni borra datos.
- **Probado en desarrollo:** las cuatro quedan bloqueadas, y la reserva normal y
  la cancelación siguen andando. Contra la foto cambia solo la sección 14
  (políticas), en esas tres.
- **Producción: pendiente.** Va sola (no espera a la Fase 5), con el OK de Nico
  y copia de seguridad justo antes.

**Anotado para la Fase 2** (no se toca ahora: ahí se rediseñan los permisos)
- `profiles`: el cliente puede cambiar el `email` y el `barbero_id` de su propio
  perfil. No gana permisos (lo que manda es `role`), pero ese mail es el que
  usa la app para los avisos. Tendría que poder cambiar solo nombre y apellido.
- `turnos`: al cancelar, la política controla que el turno quede cancelado pero
  no impide cambiar otras columnas en el mismo paso.
- Hay 5 cuentas con rol `admin`. Hay que decidir cuáles pasan al equipo de la
  plataforma y cuáles quedan como dueñas de Roble.

**Otros hallazgos**
- **Un error que no es de seguridad** (para la Fase 4): después de crear el
  turno, `reservas.ts` guarda el `mp_preference_id` con la sesión del cliente y
  la base lo rechaza en silencio, porque al cliente solo le deja cancelar. No
  afecta el cobro: la confirmación llega por otro camino.
- **La foto no guarda disparadores de eventos.** Producción tiene `ensure_rls`
  (ver "Lo que es de 369"). Por eso toda migración que crea una tabla activa
  RLS a mano.
- **La rama `seguridad/pedidos-user-update`** existe solo en la PC de Nico.
  Trae una `0005_pedidos_quitar_update_de_usuario.sql` que ya está aplicada en
  producción y, por eso, incluida en la foto. No hay que traerla a esta rama:
  su número choca con la `0005` nueva y su efecto ya está.

**Lo que falló y cómo se resolvió**
- `preparar-desarrollo.mjs` se caía al crear el admin de prueba: la librería de
  Supabase necesita WebSocket y Node 20 (el de `.nvmrc`) no lo trae. Ahora hace
  esa única llamada con `fetch`. La app no tenía el problema.
- `supabase start`: se apagó *analytics* en `config.toml`. En Windows pide
  abrir un puerto de Docker sin protección y, si no, hace fallar el arranque.
- Si se corta `npm run dev` de golpe, puede quedar a medio escribir un archivo
  en `.next/dev` y el build falla con `Cannot find name 'AppRoutes'`. Se
  arregla borrando la carpeta `.next/dev` (se rehace sola).
- El paso a paso pedía reservar "en efectivo", que el cliente ya no puede
  elegir, y no mencionaba `NEXT_PUBLIC_SITE_URL`. Corregido.

**Pendiente para cerrar la Fase 0:**
1. OK de Nico a lo hecho.
2. Decidir cuándo va la `0005` a producción.
