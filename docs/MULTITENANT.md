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
  Delfina (rol **comercial**, decidido el 13/10/2026: ver "Cómo se da de alta
  una barbería"). Va aparte a propósito: nadie puede volverse parte del equipo
  tocando un dato de un local.
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
- Hace falta antes de crear la app de Mercado Pago, el dominio y la página del
  producto. **Para la Fase 3 no** (decidido el 22/10): mientras no haya nombre se
  usa uno provisorio en ese mismo archivo, y cambiarlo después es una línea.
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
| 0 | Esquema base versionado + proyecto de desarrollo | ✅ 10/10/2026 (la `0005`, verificada en producción el 13/10) |
| 1 | Tabla `locales` y columna `local_id` en todas las tablas de la barbería; lo que existe hoy pasa a ser Roble, el local de demostración (sin cortar la demo ni tocar lo de 369) | ✅ Hecha en desarrollo el 10/10/2026; OK de Nico el 14/10 (va a producción con el resto, después de la Fase 5) |
| 2 | Membresías y RLS por local (reemplaza `is_admin()`), con prueba de aislamiento | ✅ Hecha en desarrollo el 14/10/2026; OK de Nico el 22/10 (va a producción con el resto, después de la Fase 5) |
| 3a | El sitio elige el local por la dirección; `SITE` pasa a ser datos del local; panel por local con permisos de la Fase 2; un solo login; rubro y nombre provisorio | ✅ Hecha en desarrollo el 22/10/2026; OK de Nico el 25/10 (va a producción con el resto, después de la Fase 5) |
| 3b | Horarios reales del local y de cada profesional (la reserva solo ofrece lo abierto) | ✅ Hecha en desarrollo el 25/10/2026; OK de Nico el 26/10 (va a producción con el resto, después de la Fase 5) |
| 4a | Cada local cobra en su propia cuenta de Mercado Pago: una conexión por local, el aviso de Mercado Pago como fuente de verdad, las demos no cobran | ✅ Hecha en desarrollo el 26/10/2026; OK de Nico el 26/10 (va a producción con el resto, después de la Fase 5) |
| 4b | Imágenes por local; las llamadas con la llave del servidor, revisadas y filtradas por local | ✅ Hecha en desarrollo el 26/10/2026, aprobada de antemano por Nico (va a producción con el resto, después de la Fase 5) |
| 5 | Prueba automática de aislamiento completa | ✅ Hecha en desarrollo el 26/10/2026, aprobada de antemano por Nico. Sigue el pase a producción de todo junto (lo corre Nico: `docs/PASE-A-PRODUCCION.md`) |
| 6 | Alta de barberías desde el panel (demo → activo), ver la sección de abajo | ✅ Hecha en desarrollo el 26/10/2026, aprobada de antemano por Nico. **No va en el pase de las Fases 1 a 5**: va en un pase siguiente (la `0014` y el código) |
| 6b | Arreglos de lo que se vio en producción: muestras que vencen, avisos, velocidad | ✅ Hecha en desarrollo el 29/10/2026, con vía libre de Nico. Pase: `docs/PASE-FASE-6B.md` |
| 7 | Los planes (Básico, Pro, Premium) en la base: límites, candados, panel según el plan; reseñas verificadas, reportes, exportar | ✅ Hecha en desarrollo el 29/10/2026, aprobada de antemano por Nico. Pase: `docs/PASE-FASE-7.md` (después del de la 6b) |
| Marca | El color de acento y el logo de cada local; un cliente ya no cancela un turno que pasó | ✅ Hecha en desarrollo el 29/10/2026, **aprobada por Nico ese día** (todos los planes). Pase: `docs/PASE-MARCA.md` (después del de la 7) |
| 7b | Reservar sin cuenta (aprobada el 29/10) | ⏳ Necesita el dominio del producto: sin mails, el cliente no tiene cómo cancelar |
| 8 | Cobro automático del abono (suscripciones de Mercado Pago) | ⏳ Propuesta; por ahora se cobra a mano |

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

### Decidido: los permisos de Delfina (13/10/2026)
Rol **comercial**. Crea, edita y activa barberías, pero no ve los datos
privados de las barberías ya activas (sus clientes, su caja) ni puede borrar.
Nico sigue siendo el único administrador total. Se construye en la Fase 2.

### Ideas para después (14/10/2026, sin aprobar todavía)
- **Es un SaaS:** un producto de Nico que usan muchas barberías, cada una con
  abono mensual. Convive con los sistemas a medida (setup caro + fee), que son
  otra línea. El archivo de precios del universo todavía dice que el SaaS "no
  existe": hay que actualizarlo cuando se definan los precios (referencia ahí:
  u$s 45 / 65 / 95 por mes).
- **Tres niveles de plan** (por ejemplo: básico = turnos; pro = + tienda y
  señas por Mercado Pago; premium = + finanzas y reportes). Es la Fase 7. Qué
  lleva cada plan lo decide Nico antes de esa fase.
- **Fase 8 propuesta: cobro automático del abono** con las suscripciones de
  Mercado Pago (débito mensual con tarjeta). Si un pago rebota, el local pasa
  solo a `suspendido` y vuelve a `activo` cuando paga. Son **dos cobros que no
  se mezclan**: la seña que el cliente le paga a la barbería va a la cuenta de
  Mercado Pago de la barbería; el abono que la barbería le paga a Nico va a la
  cuenta de Nico.
- **La página del producto:** necesita el nombre (antes de la Fase 3).

### A decidir
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
- Toda migración se puede correr dos veces, y además tiene que convivir con la
  foto: `preparar-desarrollo.mjs` vuelve a pasar **todas** las migraciones cada
  vez, empezando por la foto. Por eso, si una migración cambia una regla que ya
  estaba en la foto, **le conserva el nombre**: la foto solo crea una regla si
  no encuentra ninguna con ese nombre.
- Toda migración que crea una tabla le activa RLS a mano y la anota en
  `scripts/verificar-locales.mjs` (lleva local, no lleva, o es de 369).
- La foto nunca se corre contra producción: volvería a crear políticas que las
  migraciones posteriores cerraron.
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

**Clave foránea (vínculo)** — Una regla que dice "esta columna apunta a una fila
que existe en otra tabla": un turno apunta a un barbero. Si el barbero no
existe, la base rechaza el turno.

**Candado doble (clave foránea compuesta)** — Un vínculo que apunta con dos
columnas a la vez: `(local_id, barbero_id)`. Ya no alcanza con que el barbero
exista: tiene que existir **en el mismo local** que el turno. Es lo que impide
que los datos de dos barberías se mezclen aunque el código se equivoque.

**Valor por defecto** — Lo que la base escribe en una columna cuando nadie le
dice qué poner. `local_id` tiene uno temporal (Roble) para que la app siga
andando mientras todavía no manda el local. Se quita en la Fase 4.

**Membresía** — La fila que dice "esta persona, en este local, es esto"
(dueño, barbero o cliente). Es la llave de cada departamento del edificio.

**Disparador (trigger)** — Código que la base corre sola cuando pasa algo en
una tabla. Las "guardias" de la Fase 2 son disparadores que corren antes de
cada cambio y pueden comparar la fila vieja con la nueva, cosa que una
política no puede hacer.

**Contraprueba** — Romper algo a propósito para comprobar que la prueba se da
cuenta. Una prueba que nunca falla puede no estar probando nada.

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
- **Producción: aplicada.** Fue sola, sin esperar a la Fase 5, con el OK de
  Nico y copia de seguridad antes. Verificada el 13/10/2026 (ver "Cierre de la
  Fase 0").

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
- **Los datos de ejemplo se editaron a mano.** La exportación traía 3 productos
  de prueba inactivos, cargados en junio para probar el panel. Se sacaron de
  `seed-desarrollo.sql` (quedan 5). Siguen en producción: si el archivo se
  vuelve a generar, reaparecen hasta que se borren de ahí. Por eso el reporte
  dice 8 productos y el archivo tiene 5.
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

**Cierre de la Fase 0:** Nico dio el OK el 10/10/2026 y aplicó la `0005` en
producción desde su terminal. El entorno de trabajo del asistente bloquea los
cambios en producción, así que de ahora en más esos pasos los corre Nico.
Copia de seguridad el 10/10/2026 a las 22:06, y después:

```bash
# Parado en la carpeta del proyecto (en Git Bash, con / y no con \)
cd "C:/Users/Usuario/Desktop/ANDRETTA-UNIVERSO/desarrollo-web/finos-barbers"
node scripts/migrate.mjs --env .env.produccion.local --produccion supabase/migrations/0005_cerrar_escrituras_directas.sql
```

Verificado el 13/10/2026, todo en solo lectura:
- Producción contra la foto: cambia solo la sección 14 (políticas), en las
  tres que toca la `0005`, igual que en desarrollo. Lo de 369, idéntico.
- La demo: home, barberos, reseñas, tienda, login y panel protegido, bien.
- 369: home, galería, fotos del bucket y `/api/health`, bien.
- Copia de seguridad de después (13/10/2026, 20:18) contra la de antes: las 17
  tablas idénticas fila por fila. El cambio tocó solo permisos, no datos.

Recién con el agujero cerrado en producción se subió la rama: el repo es
público y la `0005` explica lo que cerraba.

### Fase 1 — Locales (10/10/2026)

**Problema:** la base no sabía que existen "locales". Todas las filas eran,
sin decirlo, de la única barbería.

**Qué se hizo:** una migración, `supabase/migrations/0006_locales.sql`. Solo
base de datos: no se tocó ni una línea de la app y no cambió nada visible.

| Cambio | En simple |
|---|---|
| Tabla `locales` | Una fila por barbería: su dirección (`slug`), nombre, estado (demo, activo, suspendido, archivado) y los datos que hoy están fijos en `site.ts`. Un dato vacío quiere decir "falta cargar". |
| Roble | Cargado como local de demostración, en estado `demo`, con los datos actuales. |
| `local_id` en 10 tablas | `barberos`, `categorias`, `servicios`, `productos`, `resenas`, `turnos`, `pedidos`, `items_pedido`, `transacciones` y `mp_conexion`. Todo lo que existía quedó marcado como de Roble. |
| Valor por defecto temporal | Si la app crea una fila sin decir el local, cae en Roble. Es lo que permite no tocar la app todavía. Se quita en la Fase 4. |
| Candado doble | 9 vínculos entre tablas pasaron de "apunta a algo que existe" a "apunta a algo que existe en su mismo local". |
| Categorías | El nombre es único dentro de cada local, no en toda la base. |

**Decisiones de diseño**
- **`profiles` no lleva local.** Una cuenta es de toda la plataforma. A qué
  local pertenece cada persona lo va a decir la membresía (Fase 2).
- **El candado doble reemplaza los vínculos viejos, no agrega otros.** La app
  pide "el turno con su barbero" sin decir por qué vínculo; con dos vínculos
  entre las mismas tablas la base no sabría cuál usar y daría error.
- **`locales` la ven solo el admin y el servidor.** Qué datos del local son
  públicos se decide en la Fase 3, cuando el sitio empiece a leerlos.
- **No se guardan datos calculados** (el link de Instagram, el WhatsApp con
  formato): los arma el código en la Fase 3.
- **Nadie borra un local desde la app,** y la base no deja borrar uno que tenga
  datos. Un local que no sigue se archiva.

**Dos scripts nuevos** (los dos corren solo en desarrollo)

| Script | Para qué sirve |
|---|---|
| `scripts/verificar-locales.mjs` | Controla que toda tabla esté clasificada (lleva local, no lleva, o es de 369), que no haya filas sin local, que los vínculos sean dobles, que lo de 369 esté igual que en la foto, y prueba el candado: crea un local de mentira, intenta las mezclas y deshace todo. Una tabla nueva sin clasificar lo hace fallar. |
| `scripts/probar-seguridad.mjs` | Le habla a la base como alguien que no usa la app: intenta registrarse como admin, cambiarse el rol, tocar lo de 369, ver los locales, crear pedidos pagados y turnos con la seña paga. Es la base de la prueba de aislamiento de las Fases 2 y 5. |

**Cómo se verificó**
- La migración corre dos veces sin cambios, y la cadena entera (foto + `0001`
  a `0006` + datos de ejemplo) también.
- `verificar-locales.mjs`: todo ✓. La base rechazó las 7 mezclas entre locales
  que se intentaron y aceptó lo que tenía que aceptar.
- `probar-seguridad.mjs`: todo ✓.
- Contra la foto cambian solo las secciones esperadas (tablas, reglas,
  vínculos, índices y lo propio de `locales`). Ninguna línea que cambia nombra
  algo de 369.
- La app compilada contra la base migrada: home, tienda, login, registro, panel
  del admin y `/reservar` del cliente responden igual que antes.
- `npm run lint` y `npm run build` en verde.

**Queda anotado para más adelante**
- **Fase 2:** al volver a pasar la foto en desarrollo reaparecen las políticas
  viejas hasta que corre la migración que las reemplaza. Esa migración tiene
  que borrar las viejas por nombre cada vez.
- **Fase 3:** hay direcciones que un local no puede usar como `slug`, porque
  son páginas del sitio (`admin`, `tienda`, `login`...). Hoy la base solo
  controla el formato. También ahí se define qué datos de `locales` son públicos.
- **Fase 4:** quitar el valor por defecto de `local_id`, y que `mp_conexion`
  tenga una sola conexión por local.
- **A producción** va con el resto, después de la Fase 5. Es compatible con el
  código publicado hoy (por el valor por defecto), así que no corta la demo.

### Fase 2 — Plan aprobado (14/10/2026)

> Todavía no se construyó. Esto es lo que Nico aprobó, para retomarlo desde
> cualquier sesión.

**Qué cambia** (solo base de datos; la app no se toca)
1. Tabla `membresias`: persona + local + rol (`dueño`, `barbero`, `cliente`).
   Una persona puede tener roles distintos en locales distintos.
2. Tabla del equipo de la plataforma, aparte: **solo dos cuentas, Nico
   (admin) y Delfina (comercial)**. Quién es del equipo se carga con un
   comando: nunca se escribe en el repo (es público).
3. Todas las políticas se reescriben: de "es admin o no" a "qué sos en este
   local". El cuadro aprobado:

| | Visitante | Cliente | Barbero | Dueño | Delfina (comercial) | Nico (admin) |
|---|---|---|---|---|---|---|
| Catálogo (servicios, barberos, productos, reseñas) | ve | ve | ve | ve y edita | ve y edita | todo |
| Turnos | — | los suyos | los de su agenda | los de su local | solo de demos | todo |
| Pedidos de la tienda | — | los suyos | — | los de su local | solo de demos | todo |
| Caja | — | — | — | la de su local | — | todo |
| Datos de clientes | — | el suyo | los de sus turnos | los de su local | solo de demos | todo |
| Datos del local | — | — | — | edita el suyo | crea, edita y activa | todo |
| Borrar un local | nadie | nadie | nadie | nadie | nadie | nadie (se archiva) |

4. De paso: el cliente solo puede cambiar nombre y apellido de su perfil, y al
   cancelar un turno solo puede cambiar el estado.

**Cómo sigue andando la app sin tocarla:** las cuentas de hoy se convierten en
membresías de Roble, y un mecanismo temporal las mantiene al día cuando se
crea una cuenta o un barbero (se quita cuando el código maneje membresías).

**Decisiones del 14/10/2026**
- **El equipo son dos cuentas: Nico y Delfina.** Las otras cuentas que hoy son
  `admin` (hay 5 en producción) dejan de serlo: pasan a ser cuentas comunes,
  sin panel. No se borran (borrar es irreversible y no suma seguridad). La
  lista se revisa con Nico al pasar a producción, después de la Fase 5. Si
  Delfina no tiene cuenta, se crea ese día. Roble no necesita dueño: lo
  maneja el equipo.
- **Delfina ve turnos, pedidos y clientes de los locales en estado demo** (son
  datos de prueba). De los activos, nada privado.
- **El catálogo público solo se ve si el local está en demo o activo.**

**Riesgo: medio-alto.** El panel del admin habla con la base con la sesión del
usuario, así que depende por completo de estas políticas. Dos formas de
fallar: que el panel pierda acceso (se ve enseguida) o que un local vea datos
de otro (no se ve: lo tiene que encontrar la prueba).

**Cómo se verifica**
- Prueba de aislamiento: dos locales en desarrollo, una cuenta de cada tipo,
  cada una intenta ver y tocar lo de la otra; se compara contra el cuadro.
  Crece a partir de `scripts/probar-seguridad.mjs`.
- Recorrido con Playwright de los tres paneles (admin, barbero, cliente), como
  el de la Fase 1.
- 369 sin cambios (`scripts/verificar-locales.mjs`), lint y build en verde.

**Para construirla hace falta la PC** (Docker con el Supabase local): las
pruebas usan cuentas reales y el navegador. Desde la nube se puede escribir la
migración y probarla contra un Postgres que imite a Supabase, como en la Fase
0, pero no cerrarla.

### Fase 2 — Permisos por local, hecha en desarrollo (14/10/2026)

**Qué se hizo:** una migración, `supabase/migrations/0007_permisos_por_local.sql`.
Solo base de datos: la app no se tocó.

| Pieza | En simple |
|---|---|
| `equipo` | Nico (admin) y Delfina (comercial). Se carga con `node scripts/equipo.mjs`; nunca en el repo. |
| `membresias` | Qué es cada persona en cada local: `dueno`, `barbero` o `cliente`. El barbero lleva su agenda (candado doble: de su mismo local). |
| Reglas con nombre | `puede_administrar`, `puede_editar_catalogo`, `puede_operar_privado`, `es_mi_agenda`, `puede_ver_persona`, `local_publico`. Cada regla del cuadro, una vez. |
| Políticas | Borrón y cuenta nueva en las tablas de la barbería (las de 369 no se tocan), con el cuadro aprobado. |
| Guardias | El cliente solo cambia nombre y apellido de su perfil; al cancelar, solo el estado del turno; el dueño no cambia estado ni dirección de su local. |
| Membresías solas | Reservar o comprar te hace cliente del local. TEMPORAL: crear un barbero desde el panel (rol en el perfil) le crea la membresía. |

**Scripts nuevos**
- `scripts/probar-aislamiento.mjs` — arma un segundo local y siete tipos de
  cuenta, y compara lo que cada una ve y toca contra el cuadro. 100 controles.
- `scripts/equipo.mjs` — `listar`, `agregar <mail> admin|comercial`, `quitar
  <mail>` y `revisar` (cuentas con panel de admin que no son del equipo).
- `preparar-desarrollo.mjs` ahora deja la cuenta de prueba como admin del equipo.

**Cómo se verificó**
- La migración corre dos veces, y la cadena entera (foto + `0001` a `0007`).
- `probar-aislamiento.mjs`: 100 controles ✓. **Contraprueba:** se abrió a
  propósito un agujero (una política que deja a cualquiera ver todos los
  turnos) y la prueba marcó 6 fallas, justo donde tocaba. Volver a pasar la
  `0007` lo cerró, porque borra todas las políticas de cada tabla.
- `probar-seguridad.mjs` 43 ✓ y `verificar-locales.mjs` 64 ✓ (369 igual que
  en la foto).
- Recorrido con navegador de los tres paneles: el admin entra, ve el catálogo
  y le crea la cuenta a un barbero; una clienta reserva con él; el barbero la
  ve en su agenda; el admin la ve en la suya; la clienta cancela.
- `npm run lint` y `npm run build` en verde.

**Encontrado en el recorrido: un error que ya existe en producción**
La lista de horarios de la reserva (`getHorariosDisponibles`, en
`src/app/actions/reservas.ts`) consulta los turnos del barbero con la sesión
del cliente, y el cliente solo puede ver los suyos (así era antes de la Fase 2
y sigue siendo). Entonces la lista muestra libres los horarios que ocuparon
otros. Si eligen el mismo horario exacto, la base lo frena ("El horario
seleccionado ya no está disponible"). Si se pisan a medias (uno a las 10:00 de
45 minutos y otro a las 10:15), **nada lo frena: dos turnos superpuestos para
el mismo barbero.**
- **Arreglo propuesto:** que esa consulta vaya con la llave del servidor. Solo
  lee horas y duraciones de ese barbero ese día (ningún dato personal), y el
  barbero ya es de un solo local, así que es seguro con muchos locales.
- **Está en la demo publicada** (sale de `main`). Arreglarlo ahí es decisión de
  Nico: `main` no se toca sin su OK.
- **Arreglado en desarrollo el 14/10 a la noche** (ver la entrada siguiente).

**Queda anotado para más adelante**
- **Fase 3/4:** el código todavía elige el panel con `profiles.role`. Un dueño
  que no sea del equipo no ve el panel de admin hasta que el código lea las
  membresías. Cuando lo haga, se quita el mecanismo temporal de los barberos.
- **Fase 4:** el panel del barbero y la lista de clientes usan la llave del
  servidor: no pasan por estas reglas. Hay que filtrarlos por local.
- **Al pasar a producción (después de la Fase 5):** correr `equipo.mjs agregar`
  con las cuentas de Nico y Delfina **enseguida** de aplicar la `0007` (si no,
  nadie ve el panel), y `equipo.mjs revisar` para decidir qué hacer con las
  otras cuentas admin.
- En la copia local quedaron cuentas y turnos de los recorridos (datos de
  prueba). Se borran con `npx supabase db reset` + `preparar-desarrollo.mjs`,
  si hace falta.

### Arreglo: turnos que se pisan (14/10/2026, de noche)

Nico autorizó arreglarlo ("arreglá en lo que haga falta"). Eran **dos huecos**
y se cerraron los dos, en `src/app/actions/reservas.ts` y
`src/components/client/ReservaForm.tsx`. La base no se tocó.

| Hueco | Qué pasaba | Arreglo |
|---|---|---|
| La lista | Mostraba libres los horarios que ocuparon otros clientes. | Los turnos ocupados se consultan con la llave del servidor. Solo se leen hora y duración, y lo único que sale es la lista de horarios libres. |
| Al guardar | La base solo frena dos turnos que **empiezan** a la misma hora. Si otro reservaba 10:15 mientras el cliente miraba la lista, el turno de las 10:00 se guardaba igual. | Antes de guardar se vuelve a calcular la lista y la hora tiene que estar en ella. Si no está: "El horario que elegiste ya no está libre. Elegí otro de la lista.", y la lista se actualiza sola. |

**Además**
- La lista de horarios exige sesión iniciada y datos con forma válida (una
  Server Action se puede llamar sin pasar por la pantalla).
- En el celu, el aviso de error quedaba arriba, fuera de la vista de quien
  apretó el botón de abajo. Ahora la pantalla lo trae al centro.
- El aviso que ya existía pasó a voseo ("elegí", no "elige").
- **Seguro:** si al servidor le falta la llave (`SUPABASE_SERVICE_ROLE_KEY`,
  que en Hostinger un redeploy puede borrar), la lista no queda vacía: vuelve a
  funcionar como antes, con el error viejo, y el registro del servidor lo avisa.
  Se probó levantando la app sin la llave.

**Cómo se verificó (con pruebas de navegador, antes y después)**
- Lista: turno de otra persona de 10:00 a 10:45. Antes ofrecía 09:45, 10:00,
  10:15 y 10:30 ✗. Después no ofrece ninguno, y sí 09:30 y 10:45 ✓.
- Al guardar: el cliente elige 10:00, otra persona reserva 10:15 y el cliente
  confirma. Antes se guardaba encima ✗. Después no se guarda, avisa y la lista
  nueva ofrece 09:45 y 11:00 pero no 10:00 a 10:45 ✓ (en compu y en celu).
- En el celu el aviso queda a la vista y sin que lo tape el menú. Antes no ✗,
  después ✓.
- Una reserva normal en el celu se sigue guardando ✓.
- `npm run lint` (0 errores, las 6 advertencias viejas) y `npm run build` en
  verde; `verificar-locales`, `probar-seguridad` y `probar-aislamiento` en verde.

**Queda abierto**
- Si dos clientes confirman horarios que se pisan **en el mismo instante**,
  los dos pasan la revisión. Es muy poco probable con el tráfico de una
  barbería. Se cierra del todo con una regla en la base que no deje guardar
  dos turnos superpuestos del mismo barbero (una migración: se propone a Nico,
  no se aplica sola).
- **La demo publicada todavía tiene el error.** El mismo arreglo está listo en
  la rama `arreglo/turnos-que-se-pisan`, que sale de `main` y no está unida a
  `main`. Se publica con Nico presente, verificando enseguida el chequeo de la demo,
  la reserva con una cuenta real y 369.

**Actualización del 22/10:** la rama a publicar ahora es `arreglo/next-16-4`
(commit `9413522`): trae este arreglo y, encima, Next 16.4.2 con build por
webpack (la falla crítica de Next, ver "Fase 3 — Plan aprobado"). Sale de
`main`, así que publicarla sigue siendo solo avanzar `main`. El paso 2 de abajo
queda: `git push origin 9413522:main` (lo corre Nico: `main` se publica solo
a mano).

**Cómo se publica en la demo (con Nico, unos 10 minutos)**
1. La base no cambia: no hace falta copia de seguridad.
2. `git push origin arreglo/turnos-que-se-pisan:main`. La rama sale del último
   commit de `main`, así que `main` solo avanza, sin un commit de unión. Si
   alguien hubiera tocado `main`, git rechaza el push y no pasa nada.
3. Hostinger publica solo. Cuando cambia el build: la home de Roble muestra
   los barberos (prueba que las variables siguen), la tienda, el login, y 369
   con su galería.
4. Nico entra con su cuenta, va a "Reservar turno" y ve la lista de horarios.
   Si aparece vacía, falta la llave del servidor en el hPanel.
5. Volver atrás: un `git revert` del commit del arreglo en `main` (un commit
   nuevo que lo deshace, sin reescribir la historia), con el OK de Nico.

Nota: `main` tiene 4 errores de lint viejos (en `pagos`, `AdminNav` y
`MobileMenu`) que la rama de trabajo ya corrigió. No se pasaron a esta rama,
para que lo que se publica sea solo el arreglo. El build no los mira.

**Las pruebas quedaron en el repo (15/10/2026):** `scripts/probar-reservas.mjs`
junta las tres pruebas de navegador del arreglo (lista, lista vieja en el celu,
reserva normal) y limpia lo que crea. 6 controles ✓. Necesita la app levantada
contra desarrollo y Playwright (lo toma de `codigo-rojo-web` si este proyecto
no lo tiene).

### Fase 3 — Plan aprobado (22/10/2026)

Nico aprobó el plan con las cuatro recomendaciones: panel por local en la
dirección (`/roble/admin`), un solo login para todos los locales, nombre
provisorio "Turnos" (en `src/lib/producto.ts`, se cambia en una línea) y la
fase partida en dos (3a y 3b), cada una con su OK. "Vos pensá en lo que sea más
correcto, lo que sea una buena práctica y tenga más lógica."

Antes de la 3a, un paso 0: **Next 16.2.7 tenía una falla crítica conocida**
(se podía saltear el `proxy` en apps compiladas con Turbopack). Se pasó a
Next 16.4.2 y a `next build --webpack`, como 369 y Código Rojo. Las
dependencias de producción quedan sin vulnerabilidades (las 5 que quedan son
de `braces`, que solo usa el lint). Lint, build y las 5 pruebas en verde.

### Fase 3a — Cada local con su dirección y sus datos, hecha en desarrollo (22/10/2026)

**Qué cambió, en simple**

| Antes | Ahora |
|---|---|
| Una sola barbería, con sus datos escritos a mano en `lib/site.ts` | Cada local vive en su carpeta (`/roble`, `/otro-local`) y sus datos salen de la base. `lib/site.ts` ya no existe |
| `/reservar`, `/tienda`, `/admin` | `/roble/reservar`... Los links viejos redirigen solos a Roble (nada que ya se haya mandado a un cliente se rompe) |
| El panel lo decidía el "rol" de la cuenta (de toda la plataforma) | Cada local tiene su panel, y entra quien tiene permiso en ESE local (las reglas de la Fase 2). Un dueño que no es del equipo ya ve su panel |
| El login mandaba a todos a `/dashboard` | Un solo login que muestra la marca del local del que venís y te devuelve a la página que querías |
| La home mezclaría el catálogo de todos los locales | Cada pantalla filtra por su local. Lo que se guarda dice siempre de qué local es |
| "Barbero" en todos lados | Cada local tiene rubro (barbería, uñas, pestañas, peluquería, estética) y sus palabras ("manicura", "peluquero") |
| Un solo ícono ("RB BARBERÍA") y una sola app instalable | Ícono y app instalable de cada local, con sus iniciales y su nombre |
| La base completaba "Roble" sola si faltaba el local | Ya no: si algo llega sin local, la base lo rechaza (salvo `mp_conexion`, hasta la Fase 4) |

**La base: dos migraciones nuevas**
- `0008_locales_en_la_web.sql`: el rubro; las direcciones reservadas (un local
  no se puede llamar "login" ni "reservar"); `datos_del_local(slug)`, que da
  solo los datos públicos de un local (los visitantes siguen sin poder leer la
  tabla `locales`); y `permisos_en_local(local)`, qué puede hacer quien está
  conectado en ese local.
- `0009_sin_local_por_defecto.sql`: se termina el "Roble por defecto".
  **⚠️ En producción va DESPUÉS de publicar el código de la Fase 3a.**

**Cómo identifica el local el código** (comentado en cada archivo)
- Las páginas: por la dirección. `src/app/[local]/layout.tsx` busca el local;
  si no existe da 404; si está suspendido o archivado muestra un aviso (salvo
  a quien lo administra).
- Las acciones del servidor reciben el nombre corto del local y lo buscan
  ellas mismas: nunca confían en un id que mande el navegador.
- Lo que se toca por id (activar un producto, confirmar un turno) lo frena la
  base si no es de tu local; y si no se tocó ninguna fila, la pantalla avisa en
  vez de decir "guardado".
- Lo que usa la llave del servidor (el checkout, el panel del barbero, crear
  cuentas de barbero) filtra a mano por local: ahí no hay reglas de la base que
  lo cuiden.

**Lo que quedó solo para Roble, a propósito**
- La franja "+10 años de oficio" y "Nuestro espacio" de la home: son texto
  inventado de la demo. En un local real serían datos falsos sobre un negocio
  que existe. Pasan a la base cuando cada local pueda personalizar su home
  (Fase 6).
- Mercado Pago: hay una sola conexión, la de Roble. Los demás locales ven
  "disponible muy pronto" en Cobros. Por local, en la Fase 4.

**Arreglos de paso**
- La home ya no promete "te llega el recordatorio" (no hay recordatorios
  todavía: una de las dos fallas de la demo que encontró el mapa del producto).
- Los servicios de la home salen de la base. Antes eran tres inventados con
  precios que no coincidían con los de la reserva.
- El carrito se guarda por local (antes uno solo, `roble-cart`).
- Textos en tuteo pasados a voseo (reservar, mis turnos, login, tienda).
- El aviso de instalar la app decía "FB" (de Finos Barbers): ahora las
  iniciales del local.

**Cómo se verificó**
- `node scripts/preparar-desarrollo.mjs` arma la base de cero (0000 a 0009 y
  los datos de ejemplo de Roble).
- `verificar-locales` 67 ✓ · `probar-seguridad` 43 ✓ · `probar-aislamiento`
  101 ✓. Las tres tenían filas de prueba que se apoyaban en el "Roble por
  defecto": ahora dicen su local. Tres controles pasaban por la razón
  equivocada (los frenaba que faltara el local, no el permiso): corregidos.
- `probar-reservas` 6 ✓ (con las direcciones nuevas; antes de actualizarla
  pasó también con las viejas, a través de las redirecciones).
- **`scripts/probar-locales.mjs` (nuevo), 31 ✓**: arma un segundo local (de
  uñas, en Rosario) y revisa en el navegador que cada home y cada tienda
  muestren lo suyo, que un cliente reserve en el local nuevo con su seña (30%)
  y su alias, que la dueña entre a su panel y no al de Roble, los locales
  suspendido y archivado, el 404 y los links viejos. En celu y en compu.
- **Contraprueba:** se sacó a propósito el filtro por local de la lista de
  servicios y `probar-locales` marcó 3 fallas, justo donde se ven los
  servicios. Se volvió a poner (archivo idéntico a la copia) y pasó de nuevo.
- Capturas de la home de Roble y del local nuevo, y del panel, en celu y en
  compu: sin scroll de costado.
- `npm run lint` (0 errores, las 6 advertencias viejas) y `npm run build` en verde.

**Para la Fase 4 (anotado)**
- Mercado Pago por local (`mp_conexion` y el webhook), imágenes por local
  (ya se suben a una carpeta por local), y sacar el mecanismo temporal que crea
  la membresía de barbero desde `profiles.role`.
- **Decidido (25/10):** las cuentas de barbero las crea quien administra el
  local y también la comercial mientras el local está en demo ("por si tiene
  que hacerlo"); una vez entregado, es responsabilidad del dueño. Hecho.

### Demo publicada: turnos que se pisan + Next 16.4.2 (25/10/2026)

Nico corrió `git push origin 9413522:main` (main: `bfb2400` → `9413522`, sin
commit de unión). Hostinger publicó solo, con el build nuevo por webpack: la
versión pasó de `nxhfCbN01sYyjEe2QnT9R` a `TyAmrAnjQ4PKieMUJb6Pr`. Revisión
enseguida: la demo responde y muestra barberos y reseñas de la base (las
variables de Hostinger sobrevivieron), tienda, login y panel protegido; 369 con
su chequeo de salud, su galería y sus fotos. Todo ✓.

La base de producción no se tocó. Producción sigue sin las Fases 1 a 3a (van
juntas después de la Fase 5).

### Fase 3b — Plan aprobado (25/10/2026)

Horarios reales: arregla la segunda falla de la demo (ofrece domingos, desde
las 9 y horas que ya pasaron). Decisiones de Nico:
- **Horario cortado: sí.** Un día puede tener varios tramos (de 10 a 13 y de 15
  a 20); en el hueco no se puede reservar.
- **Anticipación mínima para reservar hoy: 1 hora**, y cada local la cambia.
- **Hasta cuántos días adelante: 60**, y cada local lo cambia.

El plan: horarios por día de cada local (con tramos), horarios propios de cada
profesional (si no tiene, usa los del local), ausencias (vacaciones de un
profesional, feriados del local), la hora en la zona horaria del local, la web
mostrando los mismos horarios que usa la reserva, una pantalla "Horarios" en el
panel, y Roble arrancando con lo que ya dice su web (lunes a sábado de 10 a 20,
domingos cerrado). Pruebas con navegador y contraprueba.

Pregunta de Nico, para el futuro: Roble muestra más que el plan Básico (es la
vidriera del Premium). Con los planes (Fase 7), conviene que la demo se pueda
mostrar en cada plan con un interruptor.

### Fase 3b — Horarios reales, hecha en desarrollo (25/10/2026)

**Qué cambió, en simple**

| Antes | Ahora |
|---|---|
| La reserva ofrecía todos los días, de 9 a 20, aunque la web dijera "domingos cerrado" | Ofrece solo lo que está abierto, según el horario de cada local |
| Un horario por día | Varios tramos por día (horario cortado): en el hueco del mediodía no se reserva |
| Todos los profesionales en el horario del local | Cada uno puede tener su horario propio; se ofrece lo que tienen en común con el local |
| Vacaciones y feriados: nada | Ausencias: licencias de un profesional o feriados del local, de una fecha a otra |
| Para hoy ofrecía horas que ya habían pasado | Para hoy, nada antes de "ahora + la anticipación" (1 hora, cada local la cambia) |
| Siempre 60 días adelante | 60 por defecto, cada local lo cambia |
| La hora del servidor | La hora de la zona del local |
| La web mostraba un texto aparte | La web muestra los mismos horarios que usa la reserva |
| La pantalla decía "No hay horarios" | Explica por qué: cerrado, no atiende, de licencia, todavía no se puede, ya no quedan |

En el panel hay una pantalla nueva, **Horarios**: reglas, horario del local día
por día, horario de cada profesional y ausencias. La ven todos los que entran
al panel (dueño, admin, comercial).

**La base:** `0010_horarios.sql`. Roble arranca de lunes a sábado de 10 a 20,
como ya decía su web. La columna vieja `locales.horarios` (el texto) quedó sin
uso; sacarla es borrar, así que va aparte y con el OK de Nico.
Además, la `0008` ahora borra y vuelve a crear `datos_del_local` (en vez de
"create or replace"): al volver a correr todas las migraciones, la `0010` ya le
había cambiado la forma. Mismo resultado final; todavía no fue a producción.

**Cómo se verificó**
- Las cuentas de horarios (`src/lib/horarios.ts`) probadas sueltas: 10 casos
  con resultado conocido (horario cortado, turnos tomados, anticipación, cambio
  de año, zona horaria).
- **`scripts/probar-horarios.mjs` (nuevo), 18 ✓**: un local de prueba con lunes
  cortado, un profesional con horario propio, una licencia, un feriado y 14 días
  para reservar. Revisa cada caso en la reserva, el límite de "hoy" (en una
  zona horaria donde sea de día, para que pruebe algo a cualquier hora), la web,
  y el panel: cerrar un día, que frene tramos que se pisan, cargar un feriado.
  En celu y en compu.
- **Contraprueba:** se volvió a poner a propósito el horario fijo de 9 a 20 y
  las pruebas marcaron 4 fallas (el hueco del mediodía, el horario propio de
  Beto, la apertura de Roble a las 10). Se restauró (archivo idéntico) y pasan.
- `probar-aislamiento` suma 11 controles de horarios y ausencias (nadie toca los
  de otro local, el público no ve las ausencias): 112 ✓. `verificar-locales`
  74 ✓, `probar-seguridad` 43 ✓, `probar-reservas` 7 ✓ (ahora espera de 10:00 a
  19:30), `probar-locales` 31 ✓.
- `preparar-desarrollo` arma la base de cero (0000 a 0010), dos veces seguidas.
- `npm run lint` (0 errores, las 6 advertencias viejas) y `npm run build` en verde.

**Encontrado y arreglado en las pruebas:** después de guardar un horario, el
aviso "Horario guardado" desaparecía al instante (la pantalla se rearmaba al
recargar los datos). Ahora queda a la vista.

### Fase 4 — Plan aprobado (26/10/2026)

Nico aprobó el plan con todas las recomendaciones ("hacelo como vos recomendás
todo"). Se parte en dos, como la 3, y cada parte lleva su OK.

**4a — Cada local cobra en su propia cuenta de Mercado Pago**
- **Una conexión por local.** Hasta ahora había una sola, y al conectar se
  borraban todas las demás. La base no va a dejar guardar dos para el mismo local.
- **Conecta desde el panel de su local quien lo administra** (el dueño o el
  admin). La comercial no: es la plata del dueño. Hay una sola dirección de
  vuelta para todos los locales (decisión 1), y el local que conecta viaja en
  una cookie del servidor, no en la dirección.
- **El panel muestra con qué cuenta se conectó** y cuándo vence. La comercial
  ve solo "conectado: sí o no" (la cuenta del dueño es un dato privado).
- **La conexión se renueva con 30 días de margen**, como en Código Rojo.
- **Se cobra siempre con la cuenta del local:** se va el token de respaldo del
  archivo de variables.
- **El aviso de Mercado Pago pasa a decidir si algo está pagado**, y la página
  de vuelta hace la misma verificación. Para marcar pagado tienen que coincidir
  cuatro cosas: que esté aprobado, que lo haya cobrado la cuenta del local, que
  sea de un turno o pedido de ese local, y que el monto sea el que corresponde.
  Esto cierra además una falla en la confirmación de pagos que también tiene la
  demo publicada; el detalle se anota cuando esté cerrada en producción (el
  repo es público).
- **Devoluciones:** la seña queda "devuelta"; el pedido, cancelado, con el stock
  repuesto y la salida en la caja. Si ya se había enviado, queda para revisarlo
  a mano.
- **Un local en demo nunca cobra** (decisión 5). La opción de Mercado Pago se
  muestra y lleva a una pantalla que explica que en la muestra no se cobra. Lo
  mismo en la tienda.
- **Un local activo sin Mercado Pago:** la reserva ofrece solo transferencia, y
  la tienda queda como catálogo, con "Consultar por WhatsApp".
- **Confirmar un pago es una sola operación en la base** (entra completa o no
  entra), y solo la puede usar el servidor.
- **De paso:** la tienda descuenta el stock cuando cobra (hasta ahora nunca lo
  hacía); no se crea un pedido si el local no puede cobrar; la referencia del
  cobro de un turno la guarda el servidor (el error anotado en la Fase 0); se
  sacan los permisos que la foto le dejó a la clave pública sobre `mp_conexion`;
  y la librería `mercadopago` se reemplaza por dos llamadas directas, para poder
  probar contra un Mercado Pago de mentira.

**4b — Imágenes por local y la llave del servidor**
- **Fotos del celu:** se achican en el navegador antes de subirlas, con el
  `image-client.ts` de 369 y Código Rojo. Hasta ahora una foto de más de 1 MB
  fallaba con un error genérico, por el tope de las Server Actions.
- **El servidor las vuelve a procesar:** acepta solo JPG, PNG o WebP mirando el
  contenido real, las achica a 1600 px, las guarda en WebP y les borra los datos
  ocultos (incluida la ubicación GPS).
- **Carpeta por id del local**, tope de 25 MB por local, y al reemplazar o quitar
  una foto se borra la vieja (solo del bucket `imagenes` y de la carpeta del
  local). Se saca la opción de pegar un link.
- **La llave del servidor, revisada en sus 11 usos.** La agenda y la lista de
  clientes del barbero pasan a la sesión; la lista queda en "los de sus turnos",
  como dice el cuadro de la Fase 2. Script nuevo: `verificar-llave-servidor.mjs`.
- **La membresía de barbero se crea directamente**, y se borra el mecanismo
  temporal de la Fase 2 (`profiles_sincroniza_barbero` y su función): un
  disparador, no datos.

**Cómo se verifica:** un Mercado Pago de mentira en la PC
(`scripts/mp-falso.mjs`), dos pruebas nuevas (`probar-cobros.mjs` y
`probar-imagenes.mjs`), las de siempre ampliadas, contraprueba, lint y build. Un
pago real queda para el pase a producción.

**Para más adelante:** la app de Mercado Pago del producto necesita el nombre
(es lo que ve el dueño al conectar su cuenta); la tienda no tiene una pantalla de
pedidos en el panel; y un barbero que ya tiene cuenta no puede recibir una cuenta
de barbero (se resuelve con las invitaciones de la Fase 6).

**La tienda y los planes** (pregunta de Nico): si la tienda va en el plan del
medio o en el más caro se decide antes de la Fase 7. En el borrador va en el del
medio, junto con las señas por Mercado Pago. Lo de esta fase sirve para las dos
opciones.

### Fase 4a — Cada local cobra en su cuenta, hecha en desarrollo (26/10/2026)

**Qué cambió, en simple**

| Antes | Ahora |
|---|---|
| Una sola conexión de Mercado Pago para toda la web; conectar una cuenta borraba las demás | Una por local (la base no deja guardar dos). Cada dueño conecta la suya desde `/<local>/admin/pagos` |
| El panel decía "Conectado", sin decir con qué cuenta | Muestra la cuenta (apodo y mail), cuándo se conectó y cuándo vence. La comercial ve solo "conectado: sí o no", y no puede conectar ni desconectar |
| Se renovaba con 5 minutos de margen | Con 30 días, como Código Rojo. Si vence y no se puede renovar, el local deja de ofrecer Mercado Pago y el panel pide reconectar |
| Si no había cuenta conectada, se cobraba con un token de respaldo del archivo de variables | Solo con la cuenta del local. El token de respaldo ya no existe |
| No había aviso de Mercado Pago: si el cliente cerraba el navegador antes de volver, el pago no se registraba | El aviso (`/api/mp/webhook`) es lo que decide. La página de vuelta hace la misma verificación, para que el cliente lo vea enseguida |
| Cómo se confirma un pago | Siempre se le pregunta el pago a Mercado Pago con la cuenta del local, y tienen que coincidir cuatro cosas: aprobado, cobrado por esa cuenta, de un turno o pedido de ese local, y por el monto justo. Lo que trae la dirección de vuelta no se cree. El detalle de la falla que esto cierra se anota cuando esté cerrada en producción (el repo es público) |
| Una devolución hecha desde Mercado Pago no se reflejaba | La seña queda "devuelta"; el pedido se cancela, el stock vuelve y la salida queda en la caja (si ya se había enviado, queda anotado para revisarlo a mano) |
| Las demos cobraban si había cuenta conectada | Una demo nunca cobra (decisión 5): la opción de Mercado Pago lleva a una pantalla de muestra ("en tu local, acá se abre Mercado Pago…"), en la reserva y en la tienda |
| Un local sin Mercado Pago armaba pedidos que quedaban colgados | La reserva ofrece solo transferencia, y la tienda es un catálogo con "Consultar por WhatsApp" en cada producto (el mensaje va escrito) |

**La base:** `0011_cobros_por_local.sql`. Una conexión por local con la cuenta, la
seña "devuelta", la caja que acepta movimientos del sistema sin persona, cuánto
stock descontó cada renglón, y cuatro funciones que aplican un pago ya verificado
(confirmar o devolver una seña o un pedido). Cada función es una sola operación,
vuelve a revisar el local y el monto, se puede repetir sin efecto, y solo la usa el
servidor (se les saca el permiso a todos los demás, también a `public`).

**El código, en cuatro archivos nuevos** (comentados en cada uno)
- `src/lib/mercadopago.ts`: las llamadas a Mercado Pago, escritas directo. Se fue la
  librería `mercadopago` (no dejaba apuntar a un Mercado Pago de mentira). Las
  dependencias de producción siguen en 0 vulnerabilidades.
- `src/lib/mp-conexion.ts`: la cuenta de cada local (conectar, renovar, mostrar,
  desconectar). Reemplaza a `mp-oauth.ts`.
- `src/lib/cobros.ts`: cómo cobra cada local (online, muestra o sin Mercado Pago) y
  la verificación de un pago. Lo usan el aviso y las dos páginas de vuelta.
- `src/lib/sitio.ts`: la dirección pública del sitio. En producción, si falta, ningún
  local cobra online (mejor eso que mandar a Mercado Pago a "localhost").
- Los archivos que tocan tokens llevan `import 'server-only'`: si alguien los
  importara desde el navegador, el build falla.

**Arreglos de paso**
- La tienda nunca descontaba el stock al vender. Ahora baja cuando entra la plata, y
  nunca queda negativo: si dos compran la última unidad, los dos pagos se registran y
  el segundo queda anotado para que el dueño reponga o devuelva. Una devolución repone
  exactamente lo que se descontó.
- Las compras sin cuenta nunca llegaban a la caja: la caja exigía "quién la cargó", y
  un invitado no tiene a nadie. Ahora lo que anota el sistema va sin persona; lo que se
  carga a mano sigue exigiéndola. La fecha va en la hora del local (antes, la del
  servidor: de noche caía al día siguiente).
- La referencia del cobro de un turno se guardaba con la sesión del cliente y la base
  la rechazaba sin avisar (anotado en la Fase 0): ahora la guarda el servidor.
- El carrito se revisa entero en el servidor (cantidades de 1 a 99, un renglón por
  producto), y no se arma ningún pedido si el local no puede cobrar.
- `mp_conexion` sin los permisos que la foto le había dejado a la clave pública.
- "Cobros" aparece en el menú para todos los del panel, cada uno con lo suyo.
- "MercadoPago" → "Mercado Pago" en el botón de pagar.

**Cómo se verificó**
- La `0011` corre dos veces, y la cadena entera (0000 a 0011) también, dos veces
  seguidas. Quedó comprobado en la base: ni la clave pública ni una sesión leen los
  tokens ni pueden usar las funciones de pago; solo el servidor.
- **`scripts/mp-falso.mjs` (nuevo):** un Mercado Pago de mentira en la PC. Imita las
  cinco cosas que usa la app (autorizar, token, cuenta, crear un cobro, consultar un
  pago), tiene una "caja" para pagar que avisa a la app como el de verdad, y anota con
  qué cuenta le hablaron. La app lo acepta solo en desarrollo y apuntando a la propia PC.
- **`scripts/probar-cobros.mjs` (nuevo), 65 ✓**, con navegador, en celu y en compu: la
  dueña conecta su cuenta y el panel dice cuál; nadie de otro local ni la comercial la
  tocan; una reserva se cobra con la cuenta del local y se confirma aunque el aviso no
  llegue; ocho intentos de dar algo por pagado sin pagarlo, frenados; devolución de una
  seña y de un pedido; una compra sin cuenta (stock y caja); la última unidad comprada
  dos veces; el local sin Mercado Pago; Roble en demo con una cuenta conectada y el
  Mercado Pago de mentira sin recibir ni un cobro; la renovación con margen y la
  conexión vencida; desconectar; y el panel y la tienda-catálogo sin scroll de costado
  en todos los anchos probados (de 320 a 1440).
- **Contraprueba:** se sacó a propósito el control de "lo cobró la cuenta de este
  local" y `probar-cobros` marcó 1 falla, justo la del pago cobrado por otra cuenta. Se
  restauró (archivo idéntico, comprobado con su huella) y pasa de nuevo.
- Las de siempre, ampliadas: `verificar-locales` 75 ✓ (una sola conexión por local),
  `probar-seguridad` 50 ✓ (nadie usa las funciones de pago), `probar-aislamiento`
  127 ✓ (las siete cuentas, incluidos el dueño y el admin con su sesión: ni leen los
  tokens ni marcan pagos). `probar-reservas` 7 ✓, `probar-locales` 31 ✓ y
  `probar-horarios` 18 ✓, sin cambios.
- `npm run lint` (0 errores, las 6 advertencias viejas) y `npm run build` en verde.

**Encontrado y arreglado en las pruebas**
- El botón "Conectar" no salía hacia Mercado Pago: era un `<Link>` de Next, que navega
  por dentro de la app, y "Conectar" es una ruta de la API que manda a otro sitio. Pasó
  a ser un `<a>` común.
- En la primera contraprueba fallaron 5 controles y no 1: los intentos compartían el
  mismo turno, y cuando uno lo dejaba pagado, los siguientes no podían probar nada.
  Ahora cada intento usa su propio turno.

**Para el pase a producción (anotado)**
- La aplicación de Mercado Pago del producto se crea con el nombre definitivo; su
  dirección de vuelta es `<dirección del sitio>/api/mp/oauth/callback`. Pasos en
  `docs/ACTIVAR-MERCADOPAGO.md`.
- En Hostinger: `MP_CLIENT_ID`, `MP_CLIENT_SECRET` y `NEXT_PUBLIC_APP_URL`
  (obligatoria), y borrar `MERCADOPAGO_ACCESS_TOKEN`. `MP_WEBHOOK_SECRET` solo el día
  de un pago real de prueba.
- La `0011` va antes de publicar el código de la 4a (lo usa). Con el código viejo
  convive, salvo conectar una cuenta: entre una cosa y la otra, nadie conecta.
- Un pago real con una cuenta real, antes del primer local que cobre.

**Para la 4b:** imágenes por local y la llave del servidor, como dice el plan.

### OK de la Fase 4a, y las fases siguientes aprobadas de antemano (26/10/2026, de noche)

Nico dio el OK de la 4a y dejó aprobado seguir solo con las fases siguientes mientras
duerme: "doy el ok a todo… si tenés que seguir haciendo fases, seguí haciéndolo…
absolutamente todo aprobado; dejame solo las dudas que sí o sí necesites que yo te
responda". Siguen la 4b y la Fase 5, en desarrollo.

Lo que NO cubre ese OK, porque son reglas de base de Nico y no se deshacen fácil: tocar
`main` (los push a `main` los corre él), la base de producción (siempre con copia antes
y su OK puntual), y borrar datos o columnas (`locales.horarios` sigue para "más
adelante"). Eso se deja preparado, paso a paso, para que lo corra él.

### Fase 4b — Imágenes por local y la llave del servidor, hecha en desarrollo (26/10/2026)

**Qué cambió, en simple**

| Antes | Ahora |
|---|---|
| Una foto de más de 1 MB fallaba con un error genérico (el tope de las Server Actions): las fotos del celu no subían | El navegador la achica antes de subirla (`lib/image-client.ts`, el de 369 y Código Rojo): una foto de cámara de 8 MB sube como ~300 KB |
| El servidor guardaba lo que llegaba, mirando solo lo que decía el navegador | Mira los primeros bytes (JPG, PNG o WebP de verdad; un SVG o un HTML disfrazado no pasan), la endereza, la achica a 1600 px, la guarda en WebP y le borra los datos ocultos, incluida la ubicación GPS |
| La subida era una Server Action | Es una ruta de la API, `/api/imagenes`, como en 369: revisa el tamaño antes de leer el archivo, que el pedido salga del propio sitio, y el permiso en ESE local. Se puede probar desde afuera |
| Carpeta por el nombre de la dirección (`roble/...`) | Carpeta por el id del local, que nunca cambia |
| Sin tope: un local podía llenar el espacio que compartimos con 369 | 25 MB por local (unas 100 a 150 fotos). Pasado eso, un aviso claro |
| Al cambiar o quitar una foto, la vieja quedaba en el bucket para siempre | Se borra, solo después de que la base aceptó el cambio, y solo dentro de la carpeta de ese local (`galeria` jamás) |
| Se podía pegar el link de una foto de otro sitio | Ya no (los de Instagram vencen y la foto se rompía). El servidor tampoco lo acepta si lo mandan a mano; las fotos de afuera que ya estaban siguen andando |
| El panel del barbero usaba la llave del servidor, y su lista de clientes mostraba a TODOS los clientes del local | Usa la sesión: lo cuidan las reglas de la base. La lista muestra a los que tienen o tuvieron turno con él, como dice el cuadro de la Fase 2. Quien administra el local y no tiene agenda ve a todos |
| La cuenta de barbero se creaba poniendo `role = 'barbero'` en el perfil (que es de toda la plataforma), y un disparador temporal copiaba la membresía | Se crea la membresía de barbero directamente, en ESE local. La `0012` saca el disparador temporal |

**La base:** `0012_sin_mecanismo_temporal.sql` borra el disparador
`profiles_sincroniza_barbero` y su función. No borra datos: las membresías quedan, y
las columnas `profiles.role` y `profiles.barbero_id` también (sin uso; sacarlas es
borrar, va aparte con el OK de Nico, como `locales.horarios`).

**La llave del servidor, revisada:** quedan 13 usos en 13 funciones, cada uno con
su porqué y cómo filtra por local, en **`scripts/verificar-llave-servidor.mjs`
(nuevo)**. Un uso nuevo sin revisar lo hace fallar, igual que `verificar-locales`
con una tabla sin clasificar. También controla que la llave se lea solo en
`lib/supabase.ts` y que crear o borrar cuentas pase solo por donde se revisó.

**De paso:** `sharp` pasa a ser dependencia directa (como en 369; en Hostinger corre en
WebAssembly, y se le aplica el mismo arreglo de memoria compartida). Seis textos del
panel que seguían en tuteo pasaron a voseo, y dos que decían "de la barbería" ahora
dicen "del local" (un local puede ser de uñas). Las dependencias de producción
siguen en 0 vulnerabilidades.

**Cómo se verificó**
- La `0012` corre dos veces, y la cadena entera (0000 a 0012) también, dos veces
  seguidas.
- **`scripts/probar-imagenes.mjs` (nuevo), 29 ✓**, con navegador: una foto de cámara de
  6000×4000 y 8 MB, con GPS, subida desde el celu, llega en WebP, a 1600 px, liviana y
  sin datos ocultos, en la carpeta del local; cambiar y quitar borran la vieja; el
  servidor rechaza un SVG con código, un HTML disfrazado, un archivo vacío, una foto
  rota y uno de 9 MB; nadie sube a la carpeta de otro local, ni sin sesión, ni desde
  otro sitio; pegar un link llamando a la acción a mano, rechazado; el tope del local;
  la foto de un profesional; y el formulario sin scroll de costado de 320 a 1440.
- **`scripts/probar-panel-barbero.mjs` (nuevo), 12 ✓**: la dueña le crea la cuenta a un
  barbero desde el panel (queda su membresía en ese local y el perfil no cambia de
  rol); el barbero entra a su agenda y ve solo sus turnos; en "Clientes" ve solo a los
  suyos y la dueña a todos; en otro local no es barbero de nada.
- **Contrapruebas:** (1) se le sacó a propósito a `/api/imagenes` el control de
  permiso en el local, y `probar-imagenes` marcó 1 falla, justo "el dueño de C no
  puede subir a la carpeta de B"; restaurado (archivo idéntico, comprobado con su
  huella), pasa. (2) Se agregó un uso de la llave sin revisar y
  `verificar-llave-servidor` lo marcó; sacado, pasa.
- Todas las demás, en verde: `verificar-locales` 76 ✓, `verificar-llave-servidor` 16 ✓,
  `probar-seguridad` 50 ✓, `probar-aislamiento` 129 ✓ (la sección del mecanismo
  temporal pasó a probar que solo cuenta la membresía), `probar-reservas` 7 ✓,
  `probar-locales` 31 ✓, `probar-horarios` 18 ✓, `probar-cobros` 65 ✓.
- `npm run lint` (0 errores, las 6 advertencias viejas) y `npm run build` en verde.

**Encontrado y arreglado en las pruebas:** la prueba de "pegar un link" no lograba
meter el link en lo que manda la pantalla: Next manda los campos de la acción con un
prefijo (`_1_imagen_url`). Corregida, la prueba agarra el rechazo de verdad.

**Para más adelante (anotado):** sacar `profiles.role` y `profiles.barbero_id`, que
quedan sin uso (es borrar: con el OK de Nico). Las fotos de afuera que ya estaban
cargadas (por ejemplo, en el catálogo de ejemplo de Roble) siguen andando; si se
cambian, la nueva tiene que subirse por el panel.

### Fase 5 — La prueba completa de aislamiento, hecha en desarrollo (26/10/2026)

**El plan** (aprobado de antemano por Nico, "todo aprobado"): que la prueba deje de
depender de los casos que a alguien se le ocurrió probar, y recorra TODO lo que existe:
cada tabla, cada tipo de cuenta, cada operación. Y que lo nuevo que aparezca sin
decidir (una tabla, una función expuesta) haga fallar.

**Qué se hizo**

| Pieza | En simple |
|---|---|
| `scripts/probar-matriz.mjs` (nuevo) | La matriz completa: las 13 tablas con local × 8 tipos de cuenta (visitante, cliente, ajeno, barbero, dueño de otro local, dueña del local, comercial, admin) × 3 locales que no son suyos (activo, demo, suspendido) × 4 operaciones (ver, cambiar, crear, borrar). El cuadro de la Fase 2 está escrito como reglas, y para "ver" se compara fila por fila. Lo que se crea con permiso se borra enseguida, y lo que la respuesta dice que no se confirma en la base. Tarda unos 10 segundos |
| Tablas sin decidir | Toda tabla con local tiene que tener sus reglas en la matriz: una nueva sin decidir hace fallar |
| Funciones expuestas | Las 14 funciones que pueden usar la clave pública o una sesión, revisadas una por una (qué devuelven y por qué es seguro). Una nueva expuesta sin revisar hace fallar: fue el agujero de `mark_order_paid` en Código Rojo. Y las cuatro que marcan pagos, comprobadas fuera de esa lista |
| Storage | Sin reglas de escritura: ni el visitante, ni el dueño, ni el admin con su sesión suben, listan o borran fotos. Solo el servidor |
| `0013_permisos_minimos.sql` | La matriz encontró que la clave pública tenía, en las tablas viejas de la barbería, todos los permisos de Postgres (lo que Supabase da por defecto), incluido TRUNCATE, que no pasa por RLS. No era un agujero abierto (no se puede pedir por la API), pero ahora es una segunda cerradura: la clave pública solo lee, y nadie tiene truncate, trigger ni references. Lo que ve cada uno lo siguen decidiendo las políticas. Las tres tablas de 369 no se tocan (regla) |
| `npm run probar` (`scripts/probar-todo.mjs`, nuevo) | Todas las pruebas con un solo comando, y un resumen: las de la base siempre, las de navegador si la app está levantada. Termina con error si algo falló o si no se pudo correr todo |

**Cómo se verificó**
- La `0013` corre dos veces, y la cadena entera (0000 a 0013) también.
- `probar-matriz` 66 ✓.
- **Contraprueba:** se abrieron a propósito tres agujeros en la base de desarrollo:
  una política que deja a cualquiera con sesión ver todos los turnos, permiso de
  escritura para la clave pública en reseñas, y una función nueva expuesta. La matriz
  marcó exactamente tres fallas, cada una donde estaba el agujero (en turnos, las 16
  combinaciones de cuenta y local que no tienen que ver esas filas). Se cerraron
  (volviendo a pasar las migraciones y borrando la función) y pasa de nuevo.
- **`npm run probar`: 11 pruebas, 500 controles, todo en verde** (`verificar-locales`
  77, `verificar-llave-servidor` 16, `probar-seguridad` 50, `probar-aislamiento` 129,
  `probar-matriz` 66, `probar-reservas` 7, `probar-locales` 31, `probar-horarios` 18,
  `probar-imagenes` 29, `probar-panel-barbero` 12, `probar-cobros` 65).
- `npm run lint` (0 errores, las 6 advertencias viejas) y `npm run build` en verde.

**Encontrado y arreglado:** al correr todo junto, `probar-imagenes` falló dos veces en
"la foto vieja se borró": la base guarda la foto nueva y la vieja se borra un instante
después, y la prueba miraba el bucket antes. No era la app (el registro no tenía
ningún error de borrado): ahora la prueba espera a que la vieja desaparezca.

**Para más adelante (anotado):** las tres tablas de 369 tienen los mismos permisos
amplios por defecto. Hoy las cierra RLS sin políticas; ajustarlas sería tocar lo de
369, así que queda para cuando se revise esa web.

### El pase a producción, preparado y ensayado (26/10/2026)

Con las Fases 1 a 5 hechas, queda llevar todo junto a producción. Lo corre Nico, con
`docs/PASE-A-PRODUCCION.md` de arriba a abajo (unos 45 minutos).

**Qué se preparó**

| Pieza | En simple |
|---|---|
| `main` unido a la rama de trabajo | Trae el arreglo de turnos y Next 16.4.2 que se publicaron el 25/10. Así, publicar es solo avanzar `main`, sin commit de unión |
| `pase/fases-1-a-5` (rama nueva) | Una rama fija con exactamente lo que se ensayó. La de trabajo puede seguir con la Fase 6 sin que eso viaje en el pase |
| `docs/PASE-A-PRODUCCION.md` | El paso a paso: copia de seguridad, las migraciones en dos tandas con el código nuevo en el medio, el equipo, las revisiones entre tanda y tanda, y qué hacer si algo sale mal en cada punto |
| `supabase/rescate/volver-antes-de-0009-y-0012.sql` | Para una emergencia: deja la base como antes de la última tanda, así el código viejo vuelve a andar. No es una migración (no la corre nadie salvo a mano) y no borra datos |

**El ensayo:** el documento entero, corrido contra una copia de producción (la base
del 13/10 con sus datos) en un segundo Supabase local, con el código viejo y el nuevo
levantados a la vez. La demo anduvo en cada tanda; la base terminó igual a desarrollo;
las cuatro pruebas de base pasaron contra la copia; y el rescate funcionó (con la base
al final, el código viejo no podía guardar turnos; con el rescate, sí). El detalle,
al final del documento del pase. La copia se borró al terminar.

### Fase 6 — Dar de alta locales desde el panel: el plan (26/10/2026)

Aprobada de antemano por Nico ("todo aprobado, seguí con las fases"). Se construye en
desarrollo, en la rama de trabajo; **no viaja en `pase/fases-1-a-5`**.

**Qué se construye**

| Pieza | En simple |
|---|---|
| `/plataforma` | Solo el equipo (Nico y Delfina). Todos los locales, por estado, con lo que le falta a cada uno. Al entrar, el equipo va directo acá |
| Nueva muestra | Solo el nombre es obligatorio. La dirección web se arma sola del nombre. Si hay a mano: rubro, WhatsApp, Instagram, dirección, ciudad, nombres de los profesionales. Crea el local en muestra con una plantilla del rubro: servicios con precios de referencia, horario de lunes a sábado de 10 a 20, y los profesionales (si no hay nombres, uno "de ejemplo"). Todo en una sola operación de la base: o se crea entero, o nada |
| La ficha de cada local | El link para mostrar (copiar o mandar por WhatsApp), la lista de activación (datos, servicios, profesionales, horarios, dueño, Mercado Pago) y los botones de estado |
| "Datos del local" (panel de cada local) | Lo que hasta hoy solo se cambiaba en la base: nombre, lema, descripción, dirección, WhatsApp, Instagram, TikTok, mail, alias, seña y medios de pago. Lo ven el dueño y el equipo |
| Invitar al dueño | Nombre, apellido y mail. Si el mail no tiene cuenta, se crea y sale un link para que el dueño elija su contraseña (se copia o se manda por WhatsApp; sirve una vez y vence a la hora; mientras no haya entrado nunca, se puede sacar otro). Si ya tiene cuenta, se lo suma y entra con la contraseña de siempre: ahí no sale link, porque quien invita podría quedarse con la cuenta de otro. Una cuenta del equipo no puede ser dueña. La comercial suma o saca dueños solo en las muestras; en un local activo, solo el admin |
| Activar | Pide al menos un dueño. Borra lo de prueba (turnos, pedidos, caja y la lista de clientes de prueba), pasa el local a activo y anota quién y cuándo. Desde ahí la comercial deja de ver lo privado (regla de la Fase 2) |
| Estados | Muestra ↔ archivada: el equipo. Activo ↔ suspendido: solo el admin. Ningún estado se cambia "a mano" desde el navegador, ni siquiera el equipo: solo con estas funciones. Y un local se crea solo con la función de alta |
| La muestra se nota | Cartel "Muestra" en la web pública, no aparece en Google (`noindex`) y no salen mails. Al activar: sin cartel, Google la puede indexar, y salen los mails, firmados con el nombre del local (hasta hoy decían "Roble Barbería" para cualquier local: arreglado) |

**En la base** (`0014_alta_de_locales.sql`): seis funciones (crear, activar, cambiar de
estado, sumar y sacar dueños, y el resumen de la plataforma). Cada una revisa quién la
llama. La guardia de `locales` se ajusta: el estado y el registro de alta no se tocan
desde el navegador, y la dirección web la cambia solo el admin. No borra datos.

**Las pruebas:** `probar-plataforma` (nueva, con navegador, también en el celular) recorre
todo: crear, mostrar, invitar, el dueño entra, activar, suspender, archivar, y los
intentos por afuera de la pantalla. La matriz y la revisión de la llave del servidor
suman lo nuevo.

**Lo que no entra, y por qué:**
- Logo y colores propios de cada local: es diseño, y suma columnas nuevas. Va en una fase
  aparte. Hoy cada local ya tiene un logo dibujado con su nombre.
- El archivado automático de las muestras a los 30 días: falta decidirlo (abajo).
- Dominio propio y planes: Fase 7 en adelante.

### Fase 6 — Dar de alta locales desde el panel: hecha en desarrollo (26/10/2026)

**Qué cambió**

| Pieza | En simple |
|---|---|
| `0014_alta_de_locales.sql` | Las seis funciones de la plataforma y la guardia de `locales` ajustada (ver el plan, arriba). Corre dos veces sin cambiar nada |
| `/plataforma` (nuevo) | La lista de locales por estado, con lo que le falta a cada uno; "Nueva muestra"; y la ficha de cada local con el link para mostrar, la lista para activar, los dueños y los botones de estado. Roble, por ser la muestra del producto, no ofrece activar ni archivar |
| `src/lib/plantillas.ts` (nuevo) | Con qué arranca una muestra de cada rubro: tres servicios con precios de referencia (para revisar). Y la dirección web que se arma sola del nombre |
| Panel → "Datos del local" (nuevo) | Nombre, lema, descripción, dirección, WhatsApp, redes, seña, alias y medios de pago. Si cambia la dirección, el mapa la sigue |
| La invitación del dueño | El link sale de "recuperar contraseña" pero no se manda por mail: lo copia quien invita. Lleva a elegir la contraseña con una bienvenida, y de ahí directo al panel del local. Sirve una vez |
| Cartel de "Muestra" y `noindex` | En la web pública de toda muestra (también Roble, que lo es). Al activar, se van solos |
| Mails | Con el nombre del local (remitente, encabezado y pie) y la palabra del rubro ("Manicura"), y solo de los locales activos. Siguen sin llegar hasta tener el dominio del producto verificado en Resend |
| Al entrar | El equipo cae en `/plataforma`; en el panel de cualquier local tiene "← Plataforma" |

**Cómo se verificó**
- La `0014` corre dos veces.
- `probar-plataforma` (nueva): el recorrido entero en el celu y en la compu, más los intentos
  por afuera de la pantalla (un cliente, un dueño y la comercial llamando a las funciones a mano).
- `probar-aislamiento` cambió dos controles que eran de antes: "la comercial crea un local" y
  "la comercial cambia el estado" ahora prueban que NO puede hacerlo a mano, que sí puede con la
  función de alta, que un dueño no crea locales, y que suspender es solo del admin.
- La matriz suma las siete funciones nuevas a la lista revisada; la revisión de la llave del
  servidor, los dos usos nuevos (la cuenta del dueño).
- **Contraprueba 1 (la base):** se le sacó a `activar_local` el control de quién la llama.
  `probar-plataforma` marcó "un cliente / un dueño no puede activar" (y, como consecuencia, que
  la muestra quedó con fecha de activación). Se volvió a pasar la `0014`: la función quedó
  idéntica (misma huella) y pasa.
- **Contraprueba 2 (la app):** se hizo que la invitación diera el link también a una cuenta en
  uso. `probar-plataforma` marcó exactamente esa falla. Restaurado (archivo idéntico, misma
  huella), pasa.
- **`npm run probar`: 12 pruebas, 564 controles, todo en verde** (las 11 de antes más
  `probar-plataforma`, 57). `npm run lint` (0 errores, las 6 advertencias viejas) y
  `npm run build` en verde.

**Para Nico (cuando pueda):**
- Los precios de referencia de las plantillas (`src/lib/plantillas.ts`).
- ¿Las muestras se archivan solas a los 30 días? Hoy se archivan a mano, desde su ficha.

**Encontrado al prepararla, y arreglado:** los mails decían "Roble Barbería" para cualquier
local; no había ninguna forma de cambiar los datos de un local sin tocar la base; y el cartel de
"Muestra" y el `noindex` de las muestras, que el plan daba por hechos, no existían.

**Decisiones que tomé (cambiables):**
- Suspender y reactivar, solo el admin: es cortarle el sitio a alguien que paga.
- Una cuenta del equipo no puede ser dueña de un local, y la comercial maneja dueños solo en las
  muestras: si no, podría hacerse dueña de un local activo y ver lo privado.
- El link de invitación lo ve quien invita (así se manda por WhatsApp, con el dueño al lado). Con
  el dominio del producto se puede sumar el mail.

### Los dos pases a producción, hechos (26/10/2026)

- **Fases 1 a 5:** copia antes (`respaldos/2026-10-26_15-20-23_produccion`), las migraciones
  en tandas según `PASE-A-PRODUCCION.md`, el código publicado y la copia después
  (`respaldos/2026-10-26_21-46-58_produccion`). Comparadas: no se perdió ninguna fila; turnos
  pasó de 8 a 10 (las dos reservas de prueba de Nico, canceladas) y aparecieron las tablas
  nuevas. La estructura de producción quedó igual a la de desarrollo menos la `0014`.
- **Fase 6:** la `0014` y el código (`main` en `38afaaf`). Revisado: cartel de Muestra y
  `noindex` en Roble, `/plataforma` con la cuenta de Nico, una muestra de prueba (`prueba-pase`)
  creada con su plantilla y archivada (el link dice "Esta página ya no está disponible"), y 369
  igual (fotos, `index`, `/api/health`).
- `MERCADOPAGO_ACCESS_TOKEN` borrado del hPanel.

**Encontrado en producción, para la próxima tanda:**
- Después de archivar, la ficha sigue mostrando "¡Muestra creada!" (el aviso depende de `?nueva`
  en la dirección, no del estado). Nico tocó Archivar dos veces creyendo que no había andado.
- Una muestra sin dirección muestra "Dónde estamos" vacío y el recuadro del mapa en blanco; y
  ofrece Mercado Pago aunque no tenga uno conectado.
- Lentitud: hasta que llega la primera respuesta, 369 tarda 0,5 s, `/roble` 0,7 s y una
  muestra nueva 1,8 s. Cada página lee todo de la base en cada visita.

**Respuestas de Nico (26/10):** borrar lo que no sirve (las columnas `locales.horarios`,
`profiles.role` y `profiles.barbero_id`, después de los pases); la plantilla de barbería, con el
combo a 24.000; las muestras se archivan a mano **y** solas a los 30 días; 369 no se toca (más
adelante va a su propia base).

### Fase 7 — Los planes: propuesta v2 (29/10/2026, SIN APROBAR)

Discutida por Nico con Claude y con ChatGPT. Falta el OK de Nico a la tabla y al alcance de la
reserva sin cuenta.

**Mercado:** barberías primero (Roble es la demo). Peluquería, uñas, pestañas y estética ya
tienen plantilla, pero no son la prioridad de venta.

| | **Básico** · u$s 19 | **Pro** · u$s 35 | **Premium** · u$s 59 |
|---|:-:|:-:|:-:|
| Página del local y reserva online | ✓ | ✓ | ✓ |
| Horarios, horario cortado, feriados, licencias | ✓ | ✓ | ✓ |
| Horario propio de cada profesional | ✓ | ✓ | ✓ |
| Panel: turnos y calendario | ✓ | ✓ | ✓ |
| Exportar sus datos | ✓ (nuevo) | ✓ | ✓ |
| Profesionales activos | hasta 2 | hasta 5 | sin límite |
| Cuenta propia de cada profesional, con su agenda | — | ✓ | ✓ |
| Seña con Mercado Pago (a la cuenta del local) | — | ✓ | ✓ |
| Reseñas verificadas (de turnos reales) | — | ✓ (nuevo) | ✓ |
| Reportes: turnos, cancelaciones, ausentes | — | ✓ (nuevo) | ✓ |
| Tienda (productos, categorías) | — | — | ✓ |
| Finanzas: caja e ingresos | — | — | ✓ |

Los precios son la hipótesis del 14/10 (la competencia en Argentina va de USD 5 a 30): se
validan con los primeros locales. Recordatorios por WhatsApp: fuera de los planes hasta saber
cuánto cuesta cada mensaje; después, un agregado.

**Reglas:**
- El plan va **en la base**, como el resto de los permisos: un local Básico no puede sumar un
  tercer profesional aunque llame directo a la base. La pantalla solo muestra lo que el plan
  permite.
- Los límites cuentan lo **activo**, no lo histórico. El dueño no ocupa lugar de profesional (ya
  es así: ser dueño y ser barbero son membresías distintas).
- **Bajar de plan no borra nada:** se esconde la función, no deja crear más de lo que permite el
  plan nuevo, y el dueño elige qué profesionales siguen activos. Los datos de la tienda y las
  finanzas quedan guardados.
- **Las reseñas:** hoy las carga el dueño a mano (`adminCrearResena`), así que cualquiera puede
  inventarlas. Pasan a salir de un cliente con un turno que ya pasó; el dueño solo puede
  ocultarlas. Las cargadas a mano se marcan o se ocultan.
- La demo (Roble) se puede mostrar en cada plan con un interruptor (pedido de Nico, Fase 3b).

**Reservar sin cuenta (cambio aparte dentro de la Fase 7), propuesta:**
- El cliente reserva con nombre, WhatsApp y mail, sin contraseña. Si tiene cuenta, la usa igual.
- Queda confirmado al instante. Le llega un mail con un link propio del turno para ver o
  cancelar; el link guarda solo su huella en la base y deja de andar cuando pasa el turno.
- Contra el abuso: un turno no pisa a otro (ya existe), un máximo de turnos futuros por mail o
  WhatsApp en cada local, un tope por conexión, y la seña (en el Pro) como el filtro más fuerte.
- Como todo lo demás, entra por una función de la base que controla todo eso, nunca escribiendo
  directo en la tabla.
- ⚠️ **Depende del dominio del producto:** sin un dominio verificado en Resend los mails no
  llegan, y sin mail el cliente no tiene cómo cancelar. Primero el nombre y el `.com.ar`.

**Lo que no existe y la propuesta suma:** reportes, reseñas verificadas, exportar datos,
reservar sin cuenta. **Fuera de la Fase 7:** WhatsApp, cobro del abono (Fase 8), gastos, una
ficha por cliente, política de cancelación configurable, diseño propio por local (color y logo).

### Decisiones de Nico (29/10/2026, antes de irse a dormir)

- **Aprobada la tabla de planes v2 y la reserva sin cuenta** (la cuenta sigue existiendo, nunca
  obligatoria: sirve para ver lo anterior y repetir). El dominio del producto se compra cuando
  esté listo para vender.
- **Esta noche: la tanda 6b y la Fase 7**, en desarrollo. La Fase 7 queda **aprobada de
  antemano** (como las fases del 26/10): se arma con su plan escrito acá, y nada va a producción
  sin él.
- **Commits a su nombre en la rama de trabajo, y push de esa rama** (nunca `main`).
- **Una muestra nueva se ve en Premium; el plan se elige al activarla**, con el dueño al lado.
  Roble, en Premium, con un interruptor para mostrarla en cada plan.

### Tanda 6b — Arreglos de lo que se vio en producción, hecha en desarrollo (29/10/2026)

**Qué cambió, en simple**

| Antes | Ahora |
|---|---|
| Al archivar, la ficha seguía diciendo "¡Muestra creada!" (Nico tocó Archivar dos veces) | Avisa el cambio: "Archivada. El link ya no anda", "Revivida", "Suspendido", "Reactivado" |
| Una muestra sin dirección: "Dónde estamos" con la dirección vacía y el mapa en blanco; sin WhatsApp, un "Escribinos" que abría WhatsApp sin número; "Contacto" vacío en el pie | Lo que no está cargado no se muestra. El pie suma el WhatsApp cuando está |
| Plantilla de barbería: 12.000 / 8.000 / 18.000 | Corte 16.000, barba 11.000, combo 24.000 |
| Las muestras se archivaban solo a mano | Vencen a los 30 días y la base las archiva sola de noche (también a mano, como antes). Revivir da 30 días; el equipo puede "Sumar 30 días". Roble no vence |
| `profiles.role`, `profiles.barbero_id`, `locales.horarios`, `is_admin()`: sin uso desde las Fases 2 y 3b | Borrados (la `0015`) |
| Con sesión, cada página tardaba 1,2 a 1,8 s | 0,45 s (ver abajo) |

**La velocidad.** Medido en la compu con la misma demora que tiene la base real (200 ms por
consulta, medidos desde Buenos Aires contra producción), con un script que se carga antes que
Next y le agrega esa demora a cada pedido a Supabase:

| Página | Antes | Ahora |
|---|---|---|
| Panel: turnos, horarios, servicios | 1,41 s | 0,45 s |
| Portada de un local, con sesión | 1,43 s | 0,45 s |
| Panel: inicio | 1,82 s | 0,45 s |
| Reservar, Mis turnos | 1,19 s | 0,45 s |
| `/plataforma` y la ficha de un local | 0,97 s | 0,23 s |
| Portada sin sesión (visitantes) | 0,47 s | 0,46 s (ya estaba bien) |

La causa: cada página le preguntaba a Supabase "¿quién es este usuario?" (`auth.getUser()`, que
va por la red) **6 o 7 veces**, varias una atrás de otra (el proxy, el layout, el perfil, el
equipo...), y después pedía el perfil, los permisos y el equipo de a uno. Lo que se hizo:
- **`getClaims()` en vez de `getUser()`**, en el proxy y en el servidor: verifica la firma de la
  sesión ahí mismo, con la clave pública del proyecto (las sesiones de desarrollo y de producción
  se firman con ES256; la clave pública se baja una vez cada 10 minutos). Si llegara una sesión
  firmada a la antigua (HS256), le pregunta a Supabase como antes. Es lo que recomienda Supabase
  hoy para el servidor.
- **Una vez por pedido** (`cache` de React): `getUser`, `getProfile`, `getRolEquipo`.
- **En paralelo** lo que no depende de otra cosa: perfil, permisos y equipo a la vez; en la
  portada, la sesión junto con los servicios, el equipo, las reseñas y los horarios; las tres
  cuentas del inicio del panel junto con el permiso; los turnos del cliente sin esperar al perfil.
  Así, toda página con sesión hace dos tandas de consultas (el local, y después lo demás) y la
  plataforma una.

Lo que `getClaims()` no ve: una sesión cerrada en otro lado sigue valiendo hasta que vence su
token (una hora). Es lo mismo que ya hacía la base, que también confía en la firma; y es la
base la que decide qué puede ver y tocar cada uno.

**Encontrado al hacerla, y arreglado:**
- `scripts/equipo.mjs` (el que carga a Nico y a Delfina) todavía le ponía `role = 'admin'` al
  perfil: con la `0015` habría fallado. Ahora solo escribe la tabla `equipo`; "revisar" (que
  buscaba las cuentas viejas con ese dato) se fue con la columna.
- "Turnos hoy" del inicio del panel contaba los de **mañana** entre las 21 y las 24: usaba la
  fecha del servidor (UTC). Ahora usa la de la zona del local.
- **Corrección de algo que dije:** que una muestra ofrezca "Mercado Pago" en "Medios de pago" no
  es un error. Esa lista dice cómo se puede pagar **en el local** (por ejemplo, el QR de Mercado
  Pago), y no depende de conectar la cuenta para las señas.

**Las pruebas**
- `probar-plataforma` suma 11 controles:
  - la muestra nace con 30 días y la ficha dice cuándo vence;
  - "Sumar 30 días" la lleva a 60;
  - al archivar, la ficha dice "Archivada" y no "¡Muestra creada!";
  - revivirla da 30 días de nuevo;
  - el reloj está programado, archiva una muestra vencida y no toca ni un local activo ni a
    Roble;
  - nadie estira una muestra "a mano", y ni un cliente ni un dueño pueden extenderla;
  - una sesión con el token editado para hacerse pasar por el admin no entra ni a
    `/plataforma` ni al panel, y va al login (con la sesión de verdad, el mismo dueño va al
    inicio).
- Esa última no se puede "romper a propósito" para ver si la detecta: aunque la app aceptara la
  sesión falsa, la base rechaza un token con la firma alterada. Son dos cerraduras.
- Adaptadas a la `0015`:
  - `probar-seguridad`: la cuenta nace sin poderes, no puede sumarse al equipo, hacerse dueña ni
    cambiarse el mail;
  - `probar-aislamiento`: el perfil ya no tiene rol ni barbero, y tocarlo no cambia la membresía;
  - `probar-panel-barbero`: el barbero no queda en el equipo;
  - `verificar-locales`: la consulta "barberos con su cuenta" va por la membresía;
  - `probar-matriz`: `extender_muestra` en la lista revisada, `is_admin` afuera.
- El reloj (pg_cron) se probó de verdad: una tarea de prueba programada cada minuto corrió, y se
  borró.
- **`npm run probar`: 12 pruebas, todo en verde** (con cobros, contra el Mercado Pago de
  mentira). `npm run lint`: 0 errores, las 6 advertencias viejas. `npm run build`: en verde.
- Nuevo: `node scripts/reloj.mjs` (solo lee): qué tiene programado el reloj, cómo salieron las
  últimas corridas y qué muestras vencen.

**Para producción:** `docs/PASE-FASE-6B.md`. La `0015` va primero (convive con el código de la
Fase 6, que no lee nada de lo que borra) y después el código.

### Fase 7 — Los planes: el plan (29/10/2026, aprobado de antemano)

Lo que se construye, sobre la tabla v2 aprobada:
- **El plan vive en la base:** una tabla `planes` con qué trae cada uno (la única fuente) y
  `locales.plan`. La app no copia la tabla: la lee.
- **Los candados, en la base** (no alcanza con esconder botones), cada uno con su prueba por
  afuera de la pantalla: profesionales activos, cuentas de profesionales, conectar Mercado Pago,
  la tienda, la caja, las reseñas a la vista.
- **El panel y la web, según el plan:** el menú muestra lo que trae; una sección que no trae,
  abierta igual, dice qué plan la trae; la tienda de un local sin tienda no existe.
- **La plataforma:** el plan se elige al activar; en una muestra, el equipo la muestra en cada
  plan; en un local activo, lo cambia solo el admin.
- **Lo nuevo de la tabla:** reseñas verificadas, reportes (con la marca "no vino" para contar
  los ausentes) y exportar los datos.
- **Afuera:** reservar sin cuenta (necesita el dominio: sin mails el cliente no puede cancelar,
  queda como Fase 7b), WhatsApp, el cobro del abono (Fase 8).

### Fase 7 — Los planes, hecha en desarrollo (29/10/2026)

**Qué cambió, en simple**

| Antes | Ahora |
|---|---|
| Todos los locales tenían todo | Cada local tiene su plan, y la base pone los límites |
| Profesionales sin límite | Hasta 2 (Básico), 5 (Pro), sin límite (Premium): la base frena dar de alta o volver a mostrar uno de más |
| Cualquier local creaba cuentas de barbero y conectaba Mercado Pago | Desde el Pro. En Básico, la reserva cobra la seña por transferencia |
| La tienda y la caja, en todos | Solo Premium: sin ella, la tienda no existe (y la base no muestra sus productos ni acepta pedidos) |
| Las reseñas las cargaba el dueño a mano | Las deja el cliente desde "Mis turnos", después de su turno (una vez, al que fue). El dueño las oculta, no las edita ni las borra. A mano, solo en una muestra (activar las borra) |
| No había reportes | Reportes (Pro en adelante): turnos, cancelados, no vinieron, atendidos y lo facturado, por mes, por profesional y por servicio, de los últimos 30, 90 o 180 días |
| No había forma de marcar a quien no vino | "No vino" en Turnos del panel, en un turno que ya pasó |
| No había forma de llevarse los datos | "Tus datos" en el inicio del panel: los turnos y los clientes en CSV (todos los planes) |
| Activar no preguntaba nada | Al activar se elige el plan (tarjetas con precio y límite). La ficha tiene "Plan", para cambiarlo |

**Las piezas**
- La migración `0016_planes.sql`:
  - la tabla `planes` (19/35/59 USD, la hipótesis);
  - `locales.plan` (nace en Premium);
  - `plan_permite(local, capacidad)`;
  - `datos_del_local` con el plan (cada página lo sabe sin otra consulta);
  - los disparadores de los límites;
  - las reglas de lo público (productos, categorías, reseñas) y de la caja con el plan;
  - `dejar_resena`, `reporte_del_local`, `cambiar_plan`, y `activar_local(local, plan)`. La de
    un solo dato sigue, para el código de la 6b mientras se publica la 7;
  - `turnos.no_vino`.
- La reseña apunta a su turno con el candado doble (local + turno), como todo lo demás.
- En la app:
  - `lib/planes.ts` (lee la tabla);
  - `SoloConElPlan` y `NoIncluido` (el aviso de las secciones que el plan no trae);
  - `exigirPlan` en las acciones;
  - la página de Reportes;
  - la ruta de exportar (`/<local>/admin/exportar/turnos|clientes`);
  - "Dejar reseña" en "Mis turnos";
  - el plan en la plataforma.

**Decisiones que tomé (cambiables)**
- **Los profesionales de más no se tocan solos:** activar o bajar de plan con más profesionales
  a la vista de los que permite el plan no se puede, y el error dice cuántos sobran. Así elige
  el dueño cuáles siguen. En una muestra, "Mostrarla en el plan" no revisa eso (es para mirar).
- **Bajar de plan no borra nada:**
  - la cuenta del barbero queda, sin acceso a su agenda;
  - la conexión de Mercado Pago queda, sin usarse;
  - los productos, la caja y las reseñas quedan, sin verse.
  Si vuelve a subir, aparece todo.
- **Las reseñas verificadas se publican al instante,** con el nombre y la inicial del apellido
  ("Carla C."). El dueño puede ocultarlas.
- **"Facturado"** es el precio de los servicios de los turnos atendidos, una estimación: no es
  la caja.
- **Exportar** lo hace quien administra (el dueño y el admin), no la comercial. El CSV se
  protege contra fórmulas de Excel (un valor que empieza con `=` no se ejecuta).
- En Básico, "Cobros" (Mercado Pago) no está; **la seña por transferencia** sigue en "Datos del
  local".

**Las pruebas**
- **Nueva: `probar-planes`, 50 controles:**
  - la tabla de planes la ve cualquiera y nadie la cambia;
  - quién cambia el plan;
  - cada candado de la base en Básico, con la llave del servidor incluida;
  - el panel y la web en Básico y en Pro;
  - reseñas verificadas: las 7 reglas, y dejarla desde el celu;
  - las cuentas de los reportes, con un caso armado;
  - exportar: dueño sí, cliente 403, sin cuenta al login;
  - activar eligiendo Básico desde la plataforma, en el celu;
  - subir y bajar de plan sin perder nada.
- **Adaptadas:**
  - `verificar-locales`: `planes` es de toda la plataforma;
  - `probar-matriz`: las funciones nuevas revisadas; `planes` en la lista de lo que la clave
    pública no puede escribir; las reseñas a mano, solo en la muestra.
- **Contraprueba 1 (la base):** se sacó el disparador del límite de profesionales.
  `probar-planes` marcó "un profesional de más no entra" y "volver a mostrarlo no". Se volvió a
  pasar la `0016` y pasa.
- **Contraprueba 2 (la app):** se hizo que las secciones del panel se mostraran aunque el plan
  no las trae. `probar-planes` marcó exactamente esa. Restaurado (archivo idéntico, misma
  huella) y pasa.
- **`npm run probar`: 13 pruebas, 629 controles, todo en verde.** `npm run lint`: 0 errores
  (las 6 advertencias viejas). `npm run build`: en verde.

**Para Nico (cuando pueda)**
- Probar el panel en cada plan con una muestra: en su ficha, "Plan" → "Mostrarla en este plan".
- ¿Las reseñas verificadas se publican al instante (como ahora), o el dueño las aprueba antes?
- Anotado para después: el cliente puede "Cancelar" un turno que ya pasó (ya era así antes de
  esta fase).

**Para producción:** `docs/PASE-FASE-7.md`, después del de la 6b. La `0016` convive con el
código de la 6b: va primero, y después el código.

### La marca de cada local, hecha en desarrollo (29/10/2026, SIN APROBAR)

Nico preguntó el 29/10 si el diseño iba a ser el mismo para todos. Queda armado, para que lo vea
antes de decidir si va:
- **El color de acento** de su página y de su panel, de una **paleta curada de 6**: madera (la
  de siempre), dorado, verde, azul, rojo y violeta. Curada a propósito: sobre el fondo oscuro, un
  color libre puede quedar ilegible. Se elige en "Datos del local", en la sección nueva "Tu marca".
- **Su logo:** se sube ahí mismo, como las fotos (a la carpeta del local). Si no hay, va el nombre
  dibujado como siempre. El logo **no pierde lo transparente** (antes las fotos se pasaban a JPEG
  en el navegador: un PNG transparente habría quedado sobre fondo negro).
- **En todos los planes** (decisión mía, cambiable): es parte de la página propia.

**Cómo anda:** todo el sitio pinta sus acentos con las clases `amber-*`. Su escala pasó a un
`@theme` sin "inline" en `globals.css`, así las clases usan variables. Cada local redefine las 11
variables con su color, desde su layout. Sin color propio se ve exactamente igual que antes. La
base solo acepta los 6 de la paleta (`0017`).

**Y un arreglo:** un cliente podía "Cancelar" un turno que ya pasó (contaba como cancelado en los
reportes). Ahora no aparece el botón, y la acción tampoco lo deja.

**Las pruebas:**
- Nueva, `probar-marca` (10 controles):
  - en el celu, el dueño elige verde y sube un logo PNG transparente;
  - se guardan, el logo en la carpeta del local y con lo transparente intacto;
  - su portada y su panel quedan en verde, con su logo arriba;
  - Roble sigue en madera con su nombre dibujado;
  - un color fuera de la paleta no entra, ni "a mano".
- `probar-planes` suma "Cancelar solo en el turno que todavía no pasó".
- Contraprueba: se sacó la regla de la paleta de la base, y `probar-marca` marcó "fuera de la
  paleta". Restaurada.
- **`npm run probar`: 14 pruebas, 641 controles, todo en verde.**

**Para Nico:** mirá `_e2e_shots/marca-portada.png` y `marca-datos-celu.png` (una muestra en
verde, con un logo de prueba). Si va, el pase es `docs/PASE-MARCA.md`, después del de la Fase 7.
Si no, no se publica y listo: la rama fija de la Fase 7 no la tiene.

### Respuestas de Nico (29/10/2026, a la mañana)

- **Las reseñas verificadas se publican al instante** (como quedaron): el dueño no las aprueba antes,
  solo puede ocultarlas.
- **La marca de cada local va**, en todos los planes. Su pase: `docs/PASE-MARCA.md`, después del
  de la Fase 7 (trae también que un cliente no cancele un turno que ya pasó).
