# andmar-content

Repositorio único donde converge todo el contenido de andmar.studio.
Cada sesión de trabajo empuja su proyecto acá, y de acá se descarga todo junto
y ya ordenado para subir a Drive.

## Cómo descargar todo armado

En GitHub: botón verde **Code → Download ZIP** sobre la rama `main`.
Baja un único zip con el árbol completo. Lo descomprimís una vez y arrastrás
la carpeta a Drive. No hay que reordenar nada.

## Estructura

La raíz del repositorio **es** la carpeta que va a Drive.

```
00-LEEME-PRIMERO.md              punto de entrada para quien reciba el Drive
01 Finos Barbers/
02 Codigo Rojo/
03 369 Detail Studio/
04 andmar studio lanzamiento/
99 Marca andmar studio/          colores, tipografías y reglas de pieza
README.md                        este archivo (borralo antes de subir a Drive)
```

Dentro de cada proyecto, siempre lo mismo:

```
00 LEEME/          LEEME.md, project.md, content-index.md, informe si lo hay
01 Publicar/       Reels/ · Posts/ · Historias/ · Destacadas/
02 Textos/         captions, un archivo por tipo de pieza
03 Fuentes/        Capturas/ · Bruto/ · Recursos/
```

Regla: lo que está en `01 Publicar` está listo para subir tal cual.
Lo que está en `03 Fuentes` es materia prima.

## Reglas para las sesiones que empujan acá

1. **Cada sesión toca únicamente su propia carpeta de proyecto.** Nunca las
   otras, nunca la raíz salvo su propia línea en la tabla de estado.
2. **Antes de empujar:** `git pull --rebase origin main`. Como las carpetas no
   se solapan, nunca hay conflicto real.
3. **Nada de datos privados.** Ni alias de cobro, ni WhatsApp, ni email del
   cliente, ni tokens, ni claves, ni en las piezas ni en los textos. Si algo
   aparece en pantalla en un video, se rehace el video.
4. **Nada inventado.** Ni funcionalidades, ni clientes, ni resultados, ni
   métricas. Si un dato no se pudo verificar, se escribe "sin verificar".
5. **Cada proyecto declara en su `00 LEEME/LEEME.md` cómo se comunica:**
   cliente activo, proyecto desarrollado, o demo funcional. Y qué se puede
   afirmar y qué no.
6. **Archivos:** ningún archivo suelto por encima de 100 MB (límite de GitHub).
   Los reels rondan los 2 a 7 MB, así que no debería ser un problema.
7. **Nombres de carpeta en ASCII**, sin acentos ni símbolos. Los acentos van
   dentro de los documentos, no en las rutas.

## Estado

| Proyecto | Cargado | Verificado pieza por pieza |
|---|---|---|
| 01 Finos Barbers | no | — |
| 02 Codigo Rojo | no | — |
| 03 369 Detail Studio | no | — |
| 04 andmar studio lanzamiento | no | — |

Cada sesión actualiza su propia fila cuando termina de empujar.
