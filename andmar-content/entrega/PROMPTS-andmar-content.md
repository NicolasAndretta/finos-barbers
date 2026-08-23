# Prompts para las otras 3 sesiones

Antes de usarlos: creá el repo `andmar-content` (privado) en tu cuenta,
subile el contenido de `ANDMAR-CONTENT.zip` y habilitalo para Claude en
claude.ai → Configuración → Conectores → GitHub, para que las cuatro sesiones
puedan escribir ahí.

Después abrí cada sesión y pegá el bloque que le corresponde. Los tres son
idénticos salvo la carpeta destino.


---

## Para la sesión "Código Rojo ecommerce content"

```
Necesito que el material de contenido de esta sesión quede empujado a un
repositorio central, para poder descargarlo todo junto y ya ordenado.

REPOSITORIO DESTINO: NicolasAndretta/andmar-content (rama main)
TU CARPETA: 02 Codigo Rojo

Solo tocás esa carpeta. Nunca las de los otros proyectos.

## 1. Conseguí acceso al repositorio

Usá la herramienta add_repo con owner NicolasAndretta y repo andmar-content,
access "push". Después cloná donde te sea cómodo. Si add_repo falla por
permisos, pará y decímelo con el error textual: no busques rodeos.

## 2. Armá tu carpeta con esta estructura exacta

02 Codigo Rojo/
  00 LEEME/
    LEEME.md            qué es el proyecto · cómo se comunica · qué se puede
                        afirmar y qué no · cantidad y tipo de piezas
    content-index.md    índice pieza por pieza: archivo, objetivo, CTA, estado
    (si tenés un informe de cierre, va acá también)
  01 Publicar/
    Reels/              solo lo que está listo para subir tal cual
    Posts/
    Historias/
    Destacadas/
  02 Textos/            captions, un archivo por tipo de pieza
  03 Fuentes/
    Capturas/
    Bruto/
    Recursos/

Nombres de carpeta en ASCII, sin acentos ni símbolos raros. Los acentos van
dentro de los documentos.

Si tu proyecto no tiene alguna de esas categorías, dejá la carpeta vacía con un
.gitkeep adentro. No inventes piezas para llenarla.

## 3. Antes de empujar, revisá

- Que no haya quedado ningún dato privado del cliente en ninguna pieza ni en
  ningún texto: alias de cobro, WhatsApp, email, tokens, claves, cookies. Si
  algo aparece en pantalla en un video, se rehace el video, no se recorta.
- Que ninguna pieza afirme funcionalidades, clientes, resultados o métricas que
  no puedas verificar. Si un dato no lo pudiste verificar, escribí
  "sin verificar" en vez de estimarlo.
- Que en LEEME.md esté declarado explícitamente cómo se comunica el proyecto:
  cliente activo, proyecto desarrollado, o demo funcional.
- Que ningún archivo suelto pase de 100 MB (límite de GitHub).

## 4. Empujá

git pull --rebase origin main
git add "02 Codigo Rojo"
git commit -m "02 Codigo Rojo: contenido para el Drive"
git push origin main

Las carpetas de los cuatro proyectos no se solapan, así que si el push rebota
es solo porque otra sesión empujó primero: repetí el pull --rebase y el push.

## 5. Actualizá tu fila en la tabla de estado del README.md de la raíz

Solo tu fila. No toques las otras.

## 6. Contame al terminar

- Cuántas piezas subiste, por tipo.
- Qué piezas NO publicarías y por qué.
- Qué quedó sin verificar.

Si algo del material no existe más porque el contenedor se reinició, decímelo
en vez de dar por hecho que está: regeneralo si podés, y si no podés, decime
qué falta.
```

---

## Para la sesión "369 Detail contenido social"

```
Necesito que el material de contenido de esta sesión quede empujado a un
repositorio central, para poder descargarlo todo junto y ya ordenado.

REPOSITORIO DESTINO: NicolasAndretta/andmar-content (rama main)
TU CARPETA: 03 369 Detail Studio

Solo tocás esa carpeta. Nunca las de los otros proyectos.

## 1. Conseguí acceso al repositorio

Usá la herramienta add_repo con owner NicolasAndretta y repo andmar-content,
access "push". Después cloná donde te sea cómodo. Si add_repo falla por
permisos, pará y decímelo con el error textual: no busques rodeos.

## 2. Armá tu carpeta con esta estructura exacta

03 369 Detail Studio/
  00 LEEME/
    LEEME.md            qué es el proyecto · cómo se comunica · qué se puede
                        afirmar y qué no · cantidad y tipo de piezas
    content-index.md    índice pieza por pieza: archivo, objetivo, CTA, estado
    (si tenés un informe de cierre, va acá también)
  01 Publicar/
    Reels/              solo lo que está listo para subir tal cual
    Posts/
    Historias/
    Destacadas/
  02 Textos/            captions, un archivo por tipo de pieza
  03 Fuentes/
    Capturas/
    Bruto/
    Recursos/

Nombres de carpeta en ASCII, sin acentos ni símbolos raros. Los acentos van
dentro de los documentos.

Si tu proyecto no tiene alguna de esas categorías, dejá la carpeta vacía con un
.gitkeep adentro. No inventes piezas para llenarla.

## 3. Antes de empujar, revisá

- Que no haya quedado ningún dato privado del cliente en ninguna pieza ni en
  ningún texto: alias de cobro, WhatsApp, email, tokens, claves, cookies. Si
  algo aparece en pantalla en un video, se rehace el video, no se recorta.
- Que ninguna pieza afirme funcionalidades, clientes, resultados o métricas que
  no puedas verificar. Si un dato no lo pudiste verificar, escribí
  "sin verificar" en vez de estimarlo.
- Que en LEEME.md esté declarado explícitamente cómo se comunica el proyecto:
  cliente activo, proyecto desarrollado, o demo funcional.
- Que ningún archivo suelto pase de 100 MB (límite de GitHub).

## 4. Empujá

git pull --rebase origin main
git add "03 369 Detail Studio"
git commit -m "03 369 Detail Studio: contenido para el Drive"
git push origin main

Las carpetas de los cuatro proyectos no se solapan, así que si el push rebota
es solo porque otra sesión empujó primero: repetí el pull --rebase y el push.

## 5. Actualizá tu fila en la tabla de estado del README.md de la raíz

Solo tu fila. No toques las otras.

## 6. Contame al terminar

- Cuántas piezas subiste, por tipo.
- Qué piezas NO publicarías y por qué.
- Qué quedó sin verificar.

Si algo del material no existe más porque el contenedor se reinició, decímelo
en vez de dar por hecho que está: regeneralo si podés, y si no podés, decime
qué falta.
```

---

## Para la sesión "Contenido de lanzamiento andmar.studio"

```
Necesito que el material de contenido de esta sesión quede empujado a un
repositorio central, para poder descargarlo todo junto y ya ordenado.

REPOSITORIO DESTINO: NicolasAndretta/andmar-content (rama main)
TU CARPETA: 04 andmar studio lanzamiento

Solo tocás esa carpeta. Nunca las de los otros proyectos.

## 1. Conseguí acceso al repositorio

Usá la herramienta add_repo con owner NicolasAndretta y repo andmar-content,
access "push". Después cloná donde te sea cómodo. Si add_repo falla por
permisos, pará y decímelo con el error textual: no busques rodeos.

## 2. Armá tu carpeta con esta estructura exacta

04 andmar studio lanzamiento/
  00 LEEME/
    LEEME.md            qué es el proyecto · cómo se comunica · qué se puede
                        afirmar y qué no · cantidad y tipo de piezas
    content-index.md    índice pieza por pieza: archivo, objetivo, CTA, estado
    (si tenés un informe de cierre, va acá también)
  01 Publicar/
    Reels/              solo lo que está listo para subir tal cual
    Posts/
    Historias/
    Destacadas/
  02 Textos/            captions, un archivo por tipo de pieza
  03 Fuentes/
    Capturas/
    Bruto/
    Recursos/

Nombres de carpeta en ASCII, sin acentos ni símbolos raros. Los acentos van
dentro de los documentos.

Si tu proyecto no tiene alguna de esas categorías, dejá la carpeta vacía con un
.gitkeep adentro. No inventes piezas para llenarla.

## 3. Antes de empujar, revisá

- Que no haya quedado ningún dato privado del cliente en ninguna pieza ni en
  ningún texto: alias de cobro, WhatsApp, email, tokens, claves, cookies. Si
  algo aparece en pantalla en un video, se rehace el video, no se recorta.
- Que ninguna pieza afirme funcionalidades, clientes, resultados o métricas que
  no puedas verificar. Si un dato no lo pudiste verificar, escribí
  "sin verificar" en vez de estimarlo.
- Que en LEEME.md esté declarado explícitamente cómo se comunica el proyecto:
  cliente activo, proyecto desarrollado, o demo funcional.
- Que ningún archivo suelto pase de 100 MB (límite de GitHub).

## 4. Empujá

git pull --rebase origin main
git add "04 andmar studio lanzamiento"
git commit -m "04 andmar studio lanzamiento: contenido para el Drive"
git push origin main

Las carpetas de los cuatro proyectos no se solapan, así que si el push rebota
es solo porque otra sesión empujó primero: repetí el pull --rebase y el push.

## 5. Actualizá tu fila en la tabla de estado del README.md de la raíz

Solo tu fila. No toques las otras.

## 6. Contame al terminar

- Cuántas piezas subiste, por tipo.
- Qué piezas NO publicarías y por qué.
- Qué quedó sin verificar.

Si algo del material no existe más porque el contenedor se reinició, decímelo
en vez de dar por hecho que está: regeneralo si podés, y si no podés, decime
qué falta.
```
