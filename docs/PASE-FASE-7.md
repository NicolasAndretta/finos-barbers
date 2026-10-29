# Pase a producción: la Fase 7 (los planes)

> **Lo corre Nico**, en Git Bash, parado en la carpeta del proyecto: `main` y la base de
> producción se tocan solo a mano. **Va DESPUÉS de `PASE-FASE-6B.md`**, nunca antes ni junto: la
> `0016` usa lo que crea la `0015` (si faltara, la migración frena sola y no cambia nada).
> Tiempo: unos 15 minutos.

```bash
cd "C:/Users/Usuario/Desktop/ANDRETTA-UNIVERSO/desarrollo-web/finos-barbers"
git fetch origin
git checkout pase/fase-7
```
`pase/fase-7` es una rama fija con exactamente lo que se probó. Al terminar, se vuelve a la de
trabajo con `git checkout ccr-21a597dc-01874p`.

## Qué trae, en simple

- **Tres planes:** Básico (u$s 19), Pro (u$s 35) y Premium (u$s 59). Qué trae cada uno está en
  la tabla `planes` de la base, y la base es la que pone los límites.
- Roble y toda muestra nueva **se ven en Premium**. El plan se elige al activar un local, y en
  una muestra se puede "mostrar en" cada plan.
- **Reseñas verificadas:** las deja el cliente desde "Mis turnos", después de su turno.
- **Reportes** (Pro en adelante), **"No vino"** en Turnos, y **"Tus datos"** (bajar los turnos y
  los clientes) en el inicio del panel.

## La idea

Primero la base, después el código, sin tandas. La `0016` convive con el código de la 6b:
- Roble queda en Premium, así que se sigue viendo y cobrando igual.
- La activación de antes (sin plan) sigue andando.
- Lo que suman los datos del local y el resumen de la plataforma, ese código lo ignora.

## Paso 0 — Copia de seguridad

```bash
node scripts/respaldar-base.mjs --env .env.produccion.local
```

## Paso 1 — La migración

```bash
node scripts/migrate.mjs --env .env.produccion.local --produccion supabase/migrations/0016_planes.sql
```
Si falla, se deshace sola: frená y guardá el mensaje. La demo sigue igual.

## Paso 2 — El código

```bash
git push origin pase/fase-7:main
```
Es un avance directo de `main` (después del pase de la 6b). Si git lo rechaza, alguien tocó
`main` o falta el pase de la 6b: frená y avisá.

Cuando Hostinger termine de publicar:
- [ ] **Las variables siguen ahí** (hPanel: son 7).
- [ ] `/plataforma`: Roble dice "se ve en Premium".
- [ ] El panel de Roble (`/roble/admin/dashboard`):
  - arriba dice "Plan Premium";
  - el menú tiene Reportes;
  - abajo está "Tus datos": "Bajar los turnos" baja un archivo que abre Excel.
- [ ] `/roble/admin/reportes` muestra los números del período.
- [ ] Creás una muestra `Prueba 7`. En su ficha, en "Plan", elegís Básico y tocás "Mostrarla en
      este plan". Después:
  - en su panel, el menú ya no tiene Productos, Reseñas, Cobros ni Finanzas;
  - `/prueba-7/tienda` dice que no existe;
  - la portada no tiene "Ver tienda".

  Después la archivás.
- [ ] 369: `https://369detail.com.ar` y `https://369detail.com.ar/api/health`.

Lo público (Roble sin sesión, 369) lo puede revisar Claude solo.

## Si algo sale mal

**Si el código nuevo no anda:** volver a publicar el de la 6b (la base se queda con la `0016`,
que convive con él):
```bash
git fetch origin
git checkout -b volver-atras-7 origin/pase/tanda-6b
git merge -s ours origin/main -m "Volver al codigo de la tanda 6b"
git push origin volver-atras-7:main
git checkout ccr-21a597dc-01874p
```

## Lo que hay que saber después

- **Las reseñas viejas de Roble** (cargadas a mano) se siguen viendo: Roble es una muestra. En
  un local que se activa, se borran con lo demás de prueba; de ahí en más las dejan sus clientes.
- **Los precios** (19/35/59) son la hipótesis: se cambian con una migración, cuando se validen
  con los primeros locales.
- **Reservar sin cuenta** (aprobado) queda para cuando esté el dominio del producto: sin mails,
  el cliente no tiene cómo cancelar.
