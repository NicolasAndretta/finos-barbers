# Pase a producción: el pulido del 03/11 (solo código)

> **Lo corre Nico**, en Git Bash. **No toca la base**: es solo subir el código. Va después del
> pase de la marca (ya hecho el 03/11). Tiempo: 5 minutos.

## Qué trae

- **El menú del panel, en su propia fila** abajo del encabezado: en una compu, las 13 secciones del
  plan Premium entran en una línea (antes "Finanzas" bajaba a una segunda).
- **La textura de madera toma el color del local:** las vetas, el halo del inicio y el degradé del
  título siguen el acento elegido. Con madera (Roble) se ve exactamente igual que antes.
- **Ninguna confirmación usa ya el cartel del navegador:** cancelar un turno (en "Mis turnos", en
  Turnos y en el Calendario del panel) y borrar una categoría, una ausencia o una reseña de muestra
  preguntan dentro de la página, en rojo, con "Sí, …" y "No".

## El paso

```bash
cd "C:/Users/Usuario/Desktop/ANDRETTA-UNIVERSO/desarrollo-web/finos-barbers"
git fetch origin
git push origin pase/pulido:main
```
Es un avance directo de `main`. Si git lo rechaza, alguien tocó `main`: frená y avisá.

Cuando Hostinger termine de publicar:
- [ ] Las variables siguen ahí (hPanel: 7).
- [ ] El panel de Roble, en la compu: el menú en una sola fila, abajo.
- [ ] Roble se ve igual que antes (madera).
- [ ] En el panel de Roble → Turnos, en un turno de prueba: "Cancelar" pregunta dentro de la página.

## Si algo sale mal

```bash
git fetch origin
git checkout -b volver-atras-pulido origin/pase/marca
git merge -s ours origin/main -m "Volver al codigo de la marca"
git push origin volver-atras-pulido:main
git checkout ccr-21a597dc-01874p
```
