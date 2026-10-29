# Pase a producción: la tanda 6b (muestras que vencen, velocidad y arreglos)

> **Lo corre Nico**, en Git Bash, parado en la carpeta del proyecto: `main` y la base de
> producción se tocan solo a mano. **Va DESPUÉS de `PASE-FASE-6.md`** (ya hecho el 26/10).
> Tiempo: unos 15 minutos.

```bash
cd "C:/Users/Usuario/Desktop/ANDRETTA-UNIVERSO/desarrollo-web/finos-barbers"
git fetch origin
git checkout pase/tanda-6b
```
`pase/tanda-6b` es una rama fija con exactamente lo que se probó. Al terminar, se vuelve a
la de trabajo con `git checkout ccr-21a597dc-01874p`.

## Qué trae, en simple

- Las muestras **vencen a los 30 días** y la base las archiva sola de noche. En la ficha dice
  cuándo, y hay un botón "Sumar 30 días". Roble no vence.
- **Las páginas con sesión cargan unas 3 veces más rápido** (de 1,2-1,8 s a 0,45 s; la
  plataforma, de 1 s a 0,23 s).
- La ficha ya no deja pegado "¡Muestra creada!" al archivar.
- Una muestra sin dirección ni WhatsApp ya no muestra el mapa en blanco ni botones vacíos.
- Plantilla de barbería con el combo a 24.000.
- Se borran 3 columnas viejas que no usa nadie (`profiles.role`, `profiles.barbero_id`,
  `locales.horarios`).

## La idea

Primero la base, después el código, sin tandas: la `0015` convive con el código que está
publicado (el de la Fase 6 no lee nada de lo que la `0015` borra, y el resumen de la
plataforma suma una columna que ese código ignora).

## Paso 0 — Copia de seguridad

```bash
node scripts/respaldar-base.mjs --env .env.produccion.local
```
La `0015` **borra datos** (los valores de esas 3 columnas): esta copia es lo que permite
recuperarlos.

## Paso 1 — La migración

```bash
node scripts/migrate.mjs --env .env.produccion.local --produccion supabase/migrations/0015_muestras_que_vencen.sql
```
Si falla, se deshace sola: frená y guardá el mensaje. La demo sigue igual. Dos fallas posibles:
- **"Hay un barbero con cuenta sin su membresía"**: la migración se frena a propósito antes de
  borrar nada. Pasame el mensaje.
- **Algo de `pg_cron`** (el reloj): hay que prenderlo una vez desde el panel de Supabase
  (Database → Extensions → buscar `pg_cron` → Enable) y volver a correr el Paso 1.

Para ver el reloj (solo lee):
```bash
node scripts/reloj.mjs --env .env.produccion.local
```
Tiene que decir `✓ archivar-muestras-vencidas (0 6 * * *, en UTC)`.

## Paso 2 — El código

```bash
git push origin pase/tanda-6b:main
```
Es un avance directo de `main`. Si git lo rechaza, alguien tocó `main`: frená y avisá.

Cuando Hostinger termine de publicar:
- [ ] **Las variables siguen ahí** (hPanel: son 7, ya sin `MERCADOPAGO_ACCESS_TOKEN`).
- [ ] Entrás con tu cuenta: ¿se siente más rápido? (`/plataforma`, la ficha de Roble, el panel
      de Roble).
- [ ] En `/plataforma`, Roble **no** dice "se archiva sola".
- [ ] Creás una muestra `Prueba 6b` (sin dirección ni WhatsApp):
  - su ficha dice "Se archiva sola el …";
  - "Sumar 30 días" corre la fecha;
  - `/prueba-6b` no muestra el mapa en blanco ni "Escribinos";
  - "Archivar la muestra" dice "Archivada" y ya no "¡Muestra creada!".
- [ ] 369: `https://369detail.com.ar` y `https://369detail.com.ar/api/health`.

Lo público (las páginas sin sesión, 369) lo puede revisar Claude solo.

## Si algo sale mal

**Si el código nuevo no anda:** volver a publicar el de la Fase 6 (la base se queda con la
`0015`, que convive con él):
```bash
git fetch origin
git checkout -b volver-atras-6b origin/pase/fase-6
git merge -s ours origin/main -m "Volver al codigo de la Fase 6"
git push origin volver-atras-6b:main
git checkout ccr-21a597dc-01874p
```

**Si hiciera falta un valor de las columnas borradas:** está en la copia del Paso 0
(`respaldos/<fecha>_produccion/datos.json`, tabla `public.profiles`).

## Lo que hay que saber después

- **El reloj corre a las 3 de la mañana** (hora de Argentina). La primera muestra que puede
  vencer es la que se cree después del pase, a los 30 días. `node scripts/reloj.mjs --env
  .env.produccion.local` muestra cómo salió cada noche.
- **La sesión se verifica con la firma del token** (`getClaims`), sin preguntarle a Supabase en
  cada página: por eso es más rápido. Una sesión cerrada en otro lado sigue valiendo hasta que
  vence su token (una hora), igual que ya pasaba con la base.
