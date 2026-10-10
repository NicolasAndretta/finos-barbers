# Fase 0 — Paso a paso para Nico

> Objetivo: que la estructura real de la base (tablas, reglas, funciones) quede
> guardada en el repo, y tener un proyecto de Supabase **de desarrollo** para
> probar todo sin tocar la demo.
>
> **Nada de esto toca la demo.** El único comando que se conecta a producción es
> el del paso 2.3, y es de **solo lectura**: Postgres rechaza cualquier escritura
> mientras dura esa conexión. Las variables de Hostinger no se tocan.

**Tiempo:** ~10 minutos desde el celu + ~20 minutos en la PC.

---

## Parte 1 — Desde el celu (cuando tengas un rato)

### 1.1 Crear el proyecto de desarrollo
1. Entrá a **supabase.com** → **New project**.
2. Organización: la misma de la demo.
3. Nombre: `roble-desarrollo`.
4. **Database password:** tocá *Generate a password* y guardala en tu gestor de
   contraseñas. La vas a necesitar en la PC.
   (Si la inventás vos, usá solo letras y números: los símbolos rompen la URL de conexión.)
5. Región: la misma que la demo (seguramente *South America (São Paulo)*).
6. Plan **Free** → **Create new project**. Tarda 1 o 2 minutos.

> Si Supabase te dice que llegaste al límite de proyectos gratis, avisame y vemos
> alternativas antes de pagar nada.

### 1.2 Configurar el login del proyecto nuevo
En el proyecto **roble-desarrollo**:
1. **Authentication → URL Configuration**
   - *Site URL:* `http://localhost:3000`
   - *Redirect URLs* → **Add URL:** `http://localhost:3000/**`
2. **Authentication → Sign In / Providers → Email** → apagá **Confirm email**.
   Así las cuentas de prueba entran sin esperar un mail. Esto es **solo** en
   desarrollo; en la demo no se toca.

### 1.3 (Opcional, 2 minutos) Salir de la duda del posible agujero
En el proyecto de **la demo** (producción) → **SQL Editor** → **New query** →
pegá esto y tocá **Run**. Es una consulta de solo lectura: no cambia nada.

```sql
select pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosrc ilike '%raw_user_meta_data%';
```

- Si en el resultado aparece algo como `raw_user_meta_data->>'role'`, **hay
  agujero**: cualquiera podría registrarse como admin. Avisame.
- Si el rol aparece fijo (`'client'`), no hay agujero.

Podés pegarme el resultado en el chat: es código, no tiene secretos.

---

## Parte 2 — En la PC

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

### 2.2 Separar las credenciales de producción
Hoy tu `.env.local` apunta a la demo. Lo copiamos a un archivo propio de
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
   la tiene: proyecto de la demo → botón **Connect** → **Session pooler** →
   copiá la URI y reemplazá `[YOUR-PASSWORD]` por la contraseña de la base de la demo.

### 2.3 Sacar la foto de producción (solo lectura)
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

Si querés, abrí `supabase/esquema-reporte.md`: es el resumen en castellano de lo
que hay en la base, con las alertas de seguridad arriba de todo.

### 2.4 Subir la foto
```bash
git add supabase
git commit -m "Fase 0: foto del esquema de producción"
git push
```
👉 **Avisame "foto subida".** Con eso ya puedo revisar el esquema real mientras
vos seguís con lo que sigue.

### 2.5 Apuntar `.env.local` al proyecto de desarrollo
Abrí `.env.local` y cambiá estos valores por los de **roble-desarrollo**:

| Variable | Dónde está en Supabase (proyecto de desarrollo) |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → Data API → *Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API Keys → *Publishable key* (o *anon public* en "Legacy") |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → *Secret key* (o *service_role* en "Legacy") |
| `SUPABASE_DB_URL` | Botón **Connect** → **Session pooler** → URI con tu contraseña |

Y agregá estas tres líneas:
```
SUPABASE_ENTORNO=desarrollo
DEV_ADMIN_EMAIL=un-mail-de-prueba@example.com
DEV_ADMIN_PASSWORD=una-clave-de-prueba
```

Dos cuidados:
- Si `MERCADOPAGO_ACCESS_TOKEN` empieza con `APP_USR-` (es de producción),
  cambialo por uno que empiece con `TEST-` o borrá la línea: en desarrollo no
  queremos cobrar de verdad.
- `NEXT_PUBLIC_APP_URL` tiene que quedar en `http://localhost:3000`.

### 2.6 Armar la copia de desarrollo
```bash
node scripts/preparar-desarrollo.mjs
```
Tiene que mostrar:
```
✓ 0000_base.sql
✓ 0001_core.sql
✓ 0002_turno_pagos.sql
✓ 0003_mp_oauth.sql
✓ 0004_rol_barbero.sql
✓ Datos de ejemplo cargados
✓ Usuario admin listo: ...
```

### 2.7 Comprobar que quedó igual a producción
```bash
node scripts/exportar-esquema.mjs --comparar supabase/migrations/0000_base.sql
```
Tiene que dar ✓ en las 18 secciones y terminar con
`✓ La base coincide con la foto.`

Si la sección **1. Extensiones** sale con ⚠️, no pasa nada: un proyecto nuevo
puede traer alguna extensión de fábrica que la demo no tiene.

### 2.8 Probar la app contra desarrollo
```bash
npm run dev
```
Abrí **http://localhost:3000** y fijate que:
- [ ] La home muestra los mismos servicios, barberos y reseñas que la demo.
- [ ] `/tienda` muestra los mismos productos.
- [ ] Entrás con `DEV_ADMIN_EMAIL` y llegás al panel de admin.
- [ ] Creás una cuenta de cliente nueva en `/register`, reservás un turno
      pagando en **efectivo** y lo ves en el panel de admin.

(Mercado Pago no va a andar en desarrollo salvo que cargues credenciales TEST: es normal.)

### 2.9 Avisame
Decime **"Fase 0 OK"** o pegame lo que haya salido distinto. Con eso cierro la
Fase 0 y te presento la Fase 1.

---

## Si algo falla

Ningún script deja la base a medias: cada archivo se aplica entero o no se aplica.
Copiame el mensaje tal cual y lo vemos.

| Mensaje | Qué significa | Qué hacer |
|---|---|---|
| `password authentication failed` | La contraseña dentro de `SUPABASE_DB_URL` está mal | Revisá que hayas reemplazado `[YOUR-PASSWORD]` (sin los corchetes) |
| `getaddrinfo ENOTFOUND db.xxxx.supabase.co` | Copiaste la conexión *directa*, que en muchas redes no anda | Usá la del **Session pooler** |
| `no está marcado como desarrollo` | Falta `SUPABASE_ENTORNO=desarrollo` en `.env.local` | Agregala (paso 2.5) |
| `¡Frená! ... MISMO proyecto` | `.env.local` todavía tiene credenciales de la demo | Revisá el paso 2.5 |
| `Ya existe supabase/migrations/0000_base.sql` | La foto ya está sacada | No hace falta repetir el 2.3 |
| `Falló 0000_base.sql` | Algo del esquema no se pudo recrear | Pegámelo: se deshizo todo, no quedó nada roto |
