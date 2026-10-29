# Pase a producción: la marca de cada local (color y logo)

> **Aprobada por Nico el 29/10.** **Lo corre Nico**, en Git
> Bash, parado en la carpeta del proyecto. **Va DESPUÉS de `PASE-FASE-7.md`**: la `0017` usa lo
> que crea la `0016` (si faltara, la migración frena sola y no cambia nada). Tiempo: unos 10
> minutos.

```bash
cd "C:/Users/Usuario/Desktop/ANDRETTA-UNIVERSO/desarrollo-web/finos-barbers"
git fetch origin
git checkout pase/marca
```
Al terminar: `git checkout ccr-21a597dc-01874p`.

## Qué trae

- **"Tu marca"** en "Datos del local": cada local elige su color (madera, dorado, verde, azul,
  rojo o violeta) y sube su logo. Sin elegir nada, todo se ve igual que hoy.
- Un cliente ya no puede cancelar un turno que ya pasó.

La `0017` convive con el código de la Fase 7 (suma dos datos que ese código ignora): primero la
base, después el código.

## Paso 0 — Copia de seguridad

```bash
node scripts/respaldar-base.mjs --env .env.produccion.local
```

## Paso 1 — La migración

```bash
node scripts/migrate.mjs --env .env.produccion.local --produccion supabase/migrations/0017_marca_del_local.sql
```

## Paso 2 — El código

```bash
git push origin pase/marca:main
```

Cuando Hostinger termine de publicar:
- [ ] Las variables siguen ahí (hPanel: son 7).
- [ ] `/roble` se ve igual que antes (madera, con su nombre dibujado).
- [ ] En una muestra de prueba: "Datos del local" → "Tu marca" → elegís Azul, subís un logo y
      guardás. Después:
  - su página se ve en azul y con el logo;
  - Roble sigue en madera.

  Después la archivás.
- [ ] 369: `https://369detail.com.ar` y `https://369detail.com.ar/api/health`.

## Si algo sale mal

Volver a publicar el código de la Fase 7 (la base se queda con la `0017`, que convive con él):
```bash
git fetch origin
git checkout -b volver-atras-marca origin/pase/fase-7
git merge -s ours origin/main -m "Volver al codigo de la Fase 7"
git push origin volver-atras-marca:main
git checkout ccr-21a597dc-01874p
```
