# Pase a producción: la Fase 6 (el alta de locales)

> **Lo corre Nico**, en Git Bash, parado en la carpeta del proyecto: `main` y la base de
> producción se tocan solo a mano. **Va DESPUÉS de `PASE-A-PRODUCCION.md`** (las Fases 1 a
> 5), nunca antes ni junto. Tiempo: unos 15 minutos.

```bash
cd "C:/Users/Usuario/Desktop/ANDRETTA-UNIVERSO/desarrollo-web/finos-barbers"
git fetch origin
git checkout pase/fase-6
```
`pase/fase-6` es una rama fija con exactamente lo que se probó. Al terminar, se vuelve a
la de trabajo con `git checkout ccr-21a597dc-01874p`.

## La idea, en simple

Es más corto que el primero, porque la `0014` convive con los dos códigos: el de las
Fases 1 a 5 no crea locales ni les cambia el estado, que es lo único que la `0014`
cierra. Así que primero la base, después el código, sin tandas.

## Antes de empezar

- [ ] El pase de las Fases 1 a 5 ya está hecho y revisado.
- [ ] Tu cuenta y la de Delfina están en el equipo (`node scripts/equipo.mjs --env .env.produccion.local listar`).

## Paso 0 — Copia de seguridad

```bash
node scripts/respaldar-base.mjs --env .env.produccion.local
```

## Paso 1 — La migración

```bash
node scripts/migrate.mjs --env .env.produccion.local --produccion supabase/migrations/0014_alta_de_locales.sql
```
Si falla, se deshace sola: frená y guardá el mensaje. La demo sigue igual.

## Paso 2 — El código

```bash
git push origin pase/fase-6:main
```
Es un avance directo de `main`. Si git lo rechaza, alguien tocó `main`: frená y avisá.

Cuando Hostinger termine de publicar:
- [ ] **Las variables siguen ahí** (hPanel).
- [ ] Entrás en `/login` con tu cuenta, sin venir de ningún local, y caés en `/plataforma`.
      Ves a Roble como muestra.
- [ ] `/roble` muestra arriba el cartel "Esto es una muestra" (Roble ES una muestra).
- [ ] Creás una muestra de prueba (`Prueba Pase`): se abre su ficha, y `/prueba-pase` muestra
      los servicios de la plantilla. Después la archivás desde su ficha.
- [ ] 369: `https://369detail.com.ar` y `https://369detail.com.ar/api/health`.

## Si algo sale mal

**Si el código nuevo no anda:** volver a publicar el del primer pase (la base se queda
con la `0014`, que convive con él):
```bash
git fetch origin
git checkout -b volver-atras-6 origin/pase/fases-1-a-5
git merge -s ours origin/main -m "Volver al codigo de las Fases 1 a 5"
git push origin volver-atras-6:main
git checkout ccr-21a597dc-01874p
```

## Lo que hay que saber después

- **Los mails** salen solo de los locales activos, con su nombre. Igual no llegan hasta que
  el dominio del producto esté verificado en Resend (falta el nombre).
- **El link de invitación** de un dueño vence a la hora (la regla de Supabase: se puede
  estirar hasta 24 h en el panel de Supabase, Authentication, en la configuración del
  proveedor Email: "Email OTP Expiration").
- La muestra de prueba archivada queda en la base (nadie la ve). Si molesta, se borra con su
  OK, como cualquier dato.
