# Fase 0 — Paso a paso para Nico

> Objetivo: guardar en el repo la estructura real de la base de producción (el
> proyecto de Supabase `finos-barbers`) y armar una copia de desarrollo **en tu
> PC** para construir y probar todo sin tocarla.
>
> **Producción no es solo la demo.** En `finos-barbers` también vive la web de
> 369 (369detail.com.ar), que está en producción. Por eso nada se prueba ahí.
>
> **Nada de esto escribe en producción.** Los únicos comandos que se conectan a
> ella son los de los pasos 2.3 y 2.4, y son de **solo lectura**: Postgres
> rechaza cualquier escritura mientras dura la conexión. Las variables de
> Hostinger no se tocan.
>
> **Costo: cero.** No hace falta crear proyectos nuevos ni pagar nada.

---

## Parte 1 — Desde el celu (2 minutos, recomendado)

### 1.1 Salir de la duda del posible agujero del registro
Ahora importa más que antes: si el agujero existe, alguien podría crearse una
cuenta de admin en `finos-barbers` y, según cómo esté armada la galería de 369,
también tocar sus fotos.

En el proyecto **finos-barbers** → **SQL Editor** → **New query** → pegá esto y
tocá **Run**. Es una consulta de solo lectura: no cambia nada.

```sql
select pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosrc ilike '%raw_user_meta_data%';
```

- Si en el resultado aparece algo como `raw_user_meta_data->>'role'`, **hay
  agujero**: avisame y te propongo el arreglo (es chico).
- Si el rol aparece fijo (`'client'`), no hay agujero.

Podés pegarme el resultado en el chat: es código, no tiene secretos.

---

## Parte 2 — En la PC: copia de seguridad y foto (10 minutos)

Abrí una terminal en la carpeta del proyecto. Los comandos funcionan igual en
PowerShell que en la terminal de VS Code.

### 2.1 Traer la rama de trabajo
```bash
git fetch origin
git checkout ccr-21a597dc-01874p
git pull
npm install
```
Si `git` dice que tenés cambios sin guardar, frená y avisame antes de seguir.

### 2.2 Guardar aparte las credenciales de producción
Hoy tu `.env.local` apunta a `finos-barbers`. Lo copiamos a un archivo propio de
producción (git ya lo ignora, nunca se sube):

```bash
cp .env.local .env.produccion.local
```

Abrí `.env.produccion.local` (por ejemplo con `code .env.produccion.local`) y:
1. Agregá al final esta línea:
   ```
   SUPABASE_ENTORNO=produccion
   ```
2. Fijate que tenga `SUPABASE_DB_URL` (la que usabas para las migraciones). Si no
   la tiene: proyecto **finos-barbers** → botón **Connect** → **Session pooler** →
   copiá la URI y reemplazá `[YOUR-PASSWORD]` por la contraseña de la base.

### 2.3 Copia de seguridad (1 minuto, solo lectura)
Hoy ni la demo ni la web de 369 tienen copia de seguridad: el plan gratis no las
hace. Esto guarda en tu PC todos los datos de la base:

```bash
node scripts/respaldar-base.mjs --env .env.produccion.local
```

Tiene que terminar con `✓ Copia de seguridad lista en respaldos/...` y la
cantidad de filas de cada tabla.

- Queda en la carpeta `respaldos/`, que nunca se sube a git.
- Tiene datos personales y los tokens de Mercado Pago: no la compartas ni la
  subas a ningún lado. Si querés más seguridad, copiala a un pendrive.
- Guarda los datos y la lista de archivos, no las fotos en sí.
- Se repite antes de cada cambio en producción.

### 2.4 Sacar la foto (solo lectura)
```bash
node scripts/exportar-esquema.mjs --env .env.produccion.local
```

Tiene que terminar con algo así:
```
✓ Listo. Archivos escritos:
  supabase/migrations/0000_base.sql
  supabase/seed-desarrollo.sql
  supabase/esquema-reporte.md
  (cantidad) tablas · (cantidad) políticas · ...
  Alertas: ...
```

En `supabase/esquema-reporte.md` está el resumen en castellano de todo lo que hay
en la base, con las alertas de seguridad arriba. Ahí también van a aparecer las
tablas y el bucket de la galería de 369: es justo lo que necesito para dejarlos
marcados como intocables.

### 2.5 Subir la foto
```bash
git add supabase
git commit -m "Fase 0: foto del esquema de producción"
git push
```
👉 **Avisame "foto subida".** Con eso ya puedo revisar el esquema real.

---

## Parte 3 — En la PC: desarrollo en tu computadora (40 minutos la primera vez)

Supabase tiene una versión que corre entera en tu PC, gratis: base de datos,
logins y fotos. Funciona con un programa llamado **Docker**. Todo lo que hagas
ahí queda en tu computadora y no toca internet.

> Hacé esta parte **después** de la Parte 2: el Supabase local arma la base a
> partir de la foto.

### 3.1 ¿Tu PC puede?
Necesitás Windows 10 u 11, **8 GB de RAM o más** (con 16 GB anda cómodo) y unos
**10 GB libres** en el disco. Si no llegás, avisame antes de instalar nada:
hay un plan B.

### 3.2 Abrir Docker Desktop
**Si ya lo tenés instalado:** abrilo y esperá a que abajo a la izquierda diga
**Engine running**. Si te ofrece actualizarse, aceptá. Saltá al paso 3.3.

**Si no lo tenés** (una sola vez):
1. Entrá a **docker.com** → **Docker Desktop** → **Download for Windows**.
2. Instalalo con las opciones que vienen marcadas (usa algo llamado WSL 2). Si te
   pide actualizar WSL o reiniciar, aceptá.
3. Abrí **Docker Desktop**. No hace falta crear cuenta: podés saltear el registro.
4. Esperá a que abajo a la izquierda diga **Engine running**.

Si Windows dice que falta activar la **virtualización**, avisame: es una opción
de la configuración de la PC (la BIOS) y te guío.

### 3.3 Preparar el Supabase local (una sola vez)
En la carpeta del proyecto:
```bash
npx supabase init
```
Si pregunta por VS Code o por Deno, respondé que no (`N`). Crea el archivo
`supabase/config.toml`.

### 3.4 Levantarlo
```bash
npx supabase start
```
La primera vez descarga varias cosas: puede tardar entre 10 y 20 minutos. Al
terminar muestra una lista de direcciones y claves, y ya armó las tablas a
partir de la foto. Si después necesitás ver esa lista otra vez:
`npx supabase status`.

### 3.5 Apuntar `.env.local` a tu Supabase local
Tu `.env.local` todavía tiene las credenciales de producción (ya están a salvo
en `.env.produccion.local`). Abrilo y cambiá estos valores:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la *anon key* (o *Publishable key*) de la lista del paso 3.4 |
| `SUPABASE_SERVICE_ROLE_KEY` | la *service_role key* (o *Secret key*) de esa lista |
| `SUPABASE_DB_URL` | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| `NEXT_PUBLIC_APP_URL` | `http://127.0.0.1:3000` |
| `NEXT_PUBLIC_SITE_URL` | `http://127.0.0.1:3000` (si quedara la dirección de la demo, el link de "recuperar contraseña" saldría apuntando a la demo publicada) |

Agregá estas tres líneas:
```
SUPABASE_ENTORNO=desarrollo
DEV_ADMIN_EMAIL=un-mail-de-prueba@example.com
DEV_ADMIN_PASSWORD=una-clave-de-prueba
```

Y dos cuidados:
- Borrá el valor de `RESEND_API_KEY` (dejá `RESEND_API_KEY=`): así desarrollo
  no manda mails de verdad.
- Si tenés `MERCADOPAGO_ACCESS_TOKEN`, borrá la línea: desde la Fase 4 la app
  no lo usa (cada local cobra con su propia cuenta conectada).

### 3.6 Cargar los datos de ejemplo y tu usuario admin
```bash
node scripts/preparar-desarrollo.mjs
```
Tiene que mostrar ✓ en las migraciones, en los datos de ejemplo y en el usuario
admin.

### 3.7 Comprobar que quedó igual a la foto
```bash
node scripts/exportar-esquema.mjs --comparar supabase/migrations/0000_base.sql
```
Tiene que dar ✓ en las 18 secciones y terminar con
`✓ La base coincide con la foto.` Si la sección **1. Extensiones** sale con ⚠️,
no pasa nada.

### 3.8 Probar la app contra tu copia
```bash
npm run dev
```
Abrí **http://127.0.0.1:3000** (con números, no "localhost": así coincide con el
Supabase local) y fijate que:
- [ ] La home muestra los mismos servicios, barberos y reseñas que la demo.
- [ ] `/tienda` muestra los mismos productos.
- [ ] Entrás con `DEV_ADMIN_EMAIL` y llegás al panel de admin.
- [ ] Creás una cuenta de cliente nueva en `/register`, reservás un turno
      eligiendo **transferencia** (no cobra nada: muestra el alias) y lo ves en
      el panel de admin.

Dos extras útiles:
- **http://127.0.0.1:54323** es el panel de Supabase de tu copia local (como el
  de la web, pero de tu PC).
- **http://127.0.0.1:54324** muestra los mails que mandaría Supabase (por
  ejemplo, recuperar contraseña) sin que salgan de verdad.

### 3.9 Subir la configuración y apagar
```bash
git add supabase
git commit -m "Fase 0: configuración del Supabase local"
git push
npx supabase stop
```
`stop` apaga el Supabase local; los datos quedan para la próxima vez
(`npx supabase start` lo vuelve a levantar en segundos).

### 3.10 Avisame
Decime **"Fase 0 OK"** o pegame lo que haya salido distinto.

---

## Si algo falla

Ningún script deja la base a medias: cada archivo se aplica entero o no se aplica.
Copiame el mensaje tal cual y lo vemos.

| Mensaje | Qué significa | Qué hacer |
|---|---|---|
| `password authentication failed` | La contraseña dentro de `SUPABASE_DB_URL` está mal | Revisá que hayas reemplazado `[YOUR-PASSWORD]` (sin los corchetes) |
| `getaddrinfo ENOTFOUND db.xxxx.supabase.co` | Copiaste la conexión *directa*, que en muchas redes no anda | Usá la del **Session pooler** |
| `Ya existe supabase/migrations/0000_base.sql` | La foto ya está sacada | No hace falta repetir el 2.4 |
| `⚠️ No pude leer ...` en la copia de seguridad | Faltó permiso para leer esa tabla; el resto se guardó | Pegámelo y lo vemos |
| `Cannot connect to the Docker daemon` | Docker Desktop no está abierto | Abrilo y esperá a que diga *Engine running* |
| `supabase start` falla en `0001_core.sql` | Falta la foto | Hacé primero la Parte 2 |
| `port is already allocated` | Otro programa usa ese puerto | `npx supabase stop` y probá de nuevo; si sigue, avisame |
| `no está marcado como desarrollo` | Falta `SUPABASE_ENTORNO=desarrollo` en `.env.local` | Agregala (paso 3.5) |
| `¡Frená! ... MISMO proyecto` | `.env.local` todavía tiene las credenciales de producción | Revisá el paso 3.5 |
| Cualquier error que mencione `0000_base.sql` | Algo del esquema no se pudo recrear en la copia | Pegámelo. Es tu copia local: no se rompe nada |
