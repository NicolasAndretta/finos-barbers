# Pase a producción: las Fases 1 a 5, todo junto

> **Lo corre Nico**, en Git Bash, parado en la carpeta del proyecto: `main` y la base de
> producción se tocan solo a mano.
> Tiempo: unos 45 minutos, en un horario tranquilo (de noche, sin gente reservando).
>
> **Ensayado el 26/10/2026** en una copia de producción (la base del 13/10, con sus
> datos), con el código viejo y el nuevo: ver "El ensayo" al final.

```bash
cd "C:/Users/Usuario/Desktop/ANDRETTA-UNIVERSO/desarrollo-web/finos-barbers"
git fetch origin
git checkout pase/fases-1-a-5
```
`pase/fases-1-a-5` es una rama fija con exactamente lo que se ensayó: las migraciones y el
código. Al terminar, se vuelve a la de trabajo con `git checkout ccr-21a597dc-01874p`.

---

## La idea, en simple

Producción hoy tiene la foto, la `0005` y, desde el 25/10, el arreglo de turnos con Next
16.4.2. Hay que llevarla a lo que está probado en desarrollo (la `0006` a la `0013` y el
código de las Fases 1 a 5) **sin que la demo deje de andar en ningún momento**. Por eso
va en tres tandas:

1. **Las migraciones que conviven con el código viejo** (0006, 0007, 0008, 0010, 0011,
   0013). La demo sigue publicada y andando igual.
2. **El código nuevo** (un `git push` a `main`: Hostinger publica solo).
3. **Las dos migraciones que necesitan el código nuevo** (0009 y 0012). Desde acá el
   código viejo ya no funcionaría (para eso está "Si algo sale mal").

Entre cada tanda se revisa que todo ande. Si algo no anda, se frena ahí.

---

## Antes de empezar

- [ ] `.env.produccion.local` en la carpeta del proyecto (sale del panel de Supabase,
      proyecto `finos-barbers`: ver `COMO-LEVANTAR-EL-UNIVERSO.md`, sección C).
- [ ] **Variables de Hostinger** (hPanel → la web de Roble → variables):
  - Tienen que estar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
    `SUPABASE_SERVICE_ROLE_KEY` y **`NEXT_PUBLIC_APP_URL`** (la dirección pública del
    sitio, sin barra al final). Esta última es obligatoria desde la Fase 4a: sin ella,
    ningún local cobra online.
  - **No** tiene que estar `MERCADOPAGO_ACCESS_TOKEN` (ya no se usa, y con muchos
    locales cobraría en la cuenta equivocada).
  - `MP_CLIENT_ID` y `MP_CLIENT_SECRET`: recién cuando exista la aplicación de Mercado
    Pago del producto (necesita el nombre). Mientras tanto, ningún local cobra online;
    Roble está en demo y no cobra igual.
- [ ] Los mails de tu cuenta (admin) y la de Delfina (comercial), con las que entran al
      sitio. Si Delfina no tiene cuenta, se registra en el sitio y se suma después.

---

## Paso 0 — Copia de seguridad

```bash
node scripts/respaldar-base.mjs --env .env.produccion.local
```
Queda en `respaldos/<fecha>_produccion/` (no se sube a git).

## Paso 1 — Las migraciones que conviven con el código viejo

```bash
node scripts/migrate.mjs --env .env.produccion.local --produccion \
  supabase/migrations/0006_locales.sql \
  supabase/migrations/0007_permisos_por_local.sql \
  supabase/migrations/0008_locales_en_la_web.sql \
  supabase/migrations/0010_horarios.sql \
  supabase/migrations/0011_cobros_por_local.sql \
  supabase/migrations/0013_permisos_minimos.sql
```
Cada archivo va en su transacción: si uno falla, ese se deshace entero y no sigue con los
demás. **Si alguno falla, frená acá** y guardá el mensaje de error.

## Paso 2 — El equipo, enseguida

Desde la `0007`, el panel de admin lo ve solo el equipo. Sin este paso, nadie lo ve:

```bash
node scripts/equipo.mjs --env .env.produccion.local --produccion agregar <tu mail> admin
node scripts/equipo.mjs --env .env.produccion.local --produccion agregar <mail de Delfina> comercial
node scripts/equipo.mjs --env .env.produccion.local revisar
```
`revisar` lista las otras cuentas que tenían panel de admin (había 5). Desde ahora no ven
datos; no se borran. Si alguna tiene que seguir, se suma con `agregar`.

## Paso 3 — La demo, con el código viejo

- [ ] La home de la demo muestra los barberos, la tienda anda, y entrás al panel con tu
      cuenta y ves los turnos.
- [ ] 369: `https://369detail.com.ar` (la galería con fotos) y
      `https://369detail.com.ar/api/health` → `{"ok":true,"db":"ok"}`.

## Paso 4 — El código nuevo

```bash
git push origin pase/fases-1-a-5:main
```
Publica la rama `pase/fases-1-a-5`: exactamente lo que se ensayó (la rama de trabajo puede
seguir avanzando con la Fase 6 sin que eso viaje acá). Es un avance directo de `main`, sin
commit de unión: `main` ya está dentro de esa rama.
Si git lo rechaza, alguien tocó `main`: frená y avisá.

Hostinger publica solo. Cuando termine:
- [ ] **Las variables siguen ahí** (hPanel). Un redeploy ya las borró una vez.
- [ ] `/` lleva a `/roble`, y `/roble` muestra los barberos y las reseñas.
- [ ] Los links viejos (`/reservar`, `/tienda`) llevan a `/roble/...`.
- [ ] `/roble/tienda` muestra los productos.
- [ ] Entrás con tu cuenta: vas a `/roble/admin/dashboard` y ves Turnos, Horarios y Cobros.
- [ ] Una reserva de prueba con tu cuenta (transferencia) se guarda, y la cancelás.
- [ ] 369, igual que en el paso 3.

**Si algo de esto no anda, no sigas al paso 5**: ver "Si algo sale mal".

## Paso 5 — Las dos migraciones que necesitan el código nuevo

```bash
node scripts/migrate.mjs --env .env.produccion.local --produccion \
  supabase/migrations/0009_sin_local_por_defecto.sql \
  supabase/migrations/0012_sin_mecanismo_temporal.sql
```

## Paso 6 — La revisión final

- [ ] Otra reserva de prueba, y cancelarla. El panel, los horarios (lunes a sábado de 10
      a 20), la tienda.
- [ ] 369, igual que en el paso 3.
- [ ] La base de producción, igual a la de desarrollo (solo lee):
      ```bash
      node scripts/exportar-esquema.mjs --salida ../foto-desarrollo
      node scripts/exportar-esquema.mjs --env .env.produccion.local --comparar ../foto-desarrollo/migrations/0000_base.sql
      ```
      El primero saca una foto de desarrollo en una carpeta aparte (no toca la foto del
      repo); el segundo compara producción contra ella. Tiene que dar todo igual.
      Después se puede borrar `../foto-desarrollo`.
- [ ] Copia de seguridad de después, para comparar filas con la de antes:
      `node scripts/respaldar-base.mjs --env .env.produccion.local`.

Listo: el producto está en producción, con Roble como local de demostración.

---

## Si algo sale mal

**Durante el paso 1:** el archivo que falló se deshace solo. Frená y avisá: la demo
sigue andando con lo que haya entrado (todo lo de ese paso convive con el código viejo).

**Después del paso 4, si el código nuevo no anda:** volver a publicar el de antes, sin
reescribir la historia de `main` (un commit nuevo que trae de vuelta el código viejo):
```bash
git fetch origin
git checkout -b volver-atras 9413522
git merge -s ours origin/main -m "Volver al codigo anterior de la demo"
git push origin volver-atras:main
git checkout ccr-21a597dc-01874p
```
La base queda como después del paso 1, que es compatible con el código viejo. No corras
el paso 5.

**Después del paso 5, si hubiera que volver al código viejo:** primero la base, después
el código:
```bash
node scripts/migrate.mjs --env .env.produccion.local --produccion supabase/rescate/volver-antes-de-0009-y-0012.sql
```
y después lo de arriba. Ese archivo vuelve a poner el "Roble por defecto" y el
disparador temporal: la base queda como antes del paso 5. No borra datos.

---

## El ensayo (26/10/2026)

Todo este documento se corrió, paso por paso, contra una **copia de producción**: un
segundo Supabase local, con la base de la copia de seguridad del 13/10 y sus datos
reales. Arriba de la copia, dos versiones de la app al mismo tiempo: el código de `main`
(`9413522`, lo que hoy está publicado) y el de `pase/fases-1-a-5`.

En cada tanda, una prueba "de humo" hecha como lo haría una persona: la home muestra los
barberos de la base, un cliente nuevo reserva un turno por transferencia, y un admin
entra al panel y ve ese turno. Crea sus cuentas y su turno, y los borra al final.

| Momento | Código viejo | Código nuevo |
|---|---|---|
| Antes de empezar | ✅ | — |
| Después de los pasos 1 y 2 | ✅ (el turno quedó en Roble solo) | ✅ |
| Después del paso 5 | ❌ no puede guardar el turno (lo esperado) | ✅ |
| Después del rescate | ✅ | ✅ |

Además, con la copia ya en el final (después del paso 5):
- `equipo.mjs revisar` listó las 5 cuentas viejas con panel de admin.
- `/` → `/roble` (307), `/reservar` y `/tienda` → `/roble/...` (308).
- Las cuatro pruebas de base, contra la copia: `verificar-locales` (77 ✓),
  `probar-seguridad` (50 ✓), `probar-aislamiento` (129 ✓) y `probar-matriz` (66 ✓).
- La revisión del paso 6: la copia quedó igual a desarrollo (las 18 partes del esquema).

**Lo que el ensayo no cubre** (por eso se revisa a mano en los pasos 4 y 6):
- Hostinger: que publique bien y que las variables sigan ahí después.
- Las filas que entraron a producción después del 13/10 (son pocas, y las migraciones
  las tratan igual que a las demás).
- El disparador `ensure_rls` de producción (ver `MULTITENANT.md`): las migraciones ya
  activan RLS a mano, así que no cambia nada.

La copia se borró al terminar: tenía datos reales de clientes.
