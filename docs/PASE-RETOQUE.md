# Pase a producción: Retoque (la noche del 04/11)

> **Lo corre Nico**, en Git Bash. Lo armó un chat solo, de noche, con el plan
> `_contexto-global/plan-noche-04-11.md` del universo. **El paso obligatorio es solo código** (5
> minutos). La migración `0018` es opcional y se puede correr antes, después o nunca.

## 1. Qué quedó hecho, qué no y por qué

### Hecho (todo en la rama `pase/retoque`)

| | Qué | Dónde |
|---|---|---|
| 1 | **Retoque en el código.** El nombre vive en un solo lugar; el remitente de los mails lo usa de respaldo. "Turnos" como sección del panel no se tocó | `src/lib/producto.ts` |
| 2 | **La página del producto en `/`.** Primero los problemas (el WhatsApp a cualquier hora, el que no viene, el cuaderno), la página propia del local, la demo en vivo (`/roble`), "te la dejamos andando", los 3 planes **leídos de la tabla `planes`** y las preguntas frecuentes. Metadata y la imagen para compartir, con "Retoque". Los links viejos de la demo (`/reservar`, `/tienda`...) siguen yendo a Roble | `src/app/(producto)/` |
| 3 | **Términos, privacidad y los dos botones.** `/terminos`, `/privacidad`, `/arrepentimiento` y `/baja`. Se llega desde el pie de la página, desde el login, desde el registro y desde "Activar" en la plataforma | `src/app/(producto)/`, `src/components/producto/` |
| 4 | **La `0018`:** la base no deja crear un local llamado `terminos`, `privacidad`, `arrepentimiento` o `baja` (quedaría tapado por esas páginas). Probada en local, con contraprueba | `supabase/migrations/0018_direcciones_del_producto.sql` |
| 5 | **Tres propuestas de isotipo**, sin enchufar | `docs/logo-retoque/` |
| 6 | **Una prueba nueva, `probar-producto`:** la página, los planes contra la tabla, los links viejos, lo legal, los botones sin registrarse, los nombres reservados y sin scroll de costado en los 6 anchos | `scripts/probar-producto.mjs` |
| 7 | **El kit de Delfi** (en el universo, no en este repo): kit de venta, planilla de la prueba, folleto en PNG y PDF, capturas | `freelance/delfi/retoque/` |

**Las pruebas:** `npm run probar` → **15 pruebas, 690 controles, todo en verde** (eran 14 y 647; la
nueva suma 42 y `verificar-locales` uno más por la `0018`). Ojo: en dos corridas anteriores de esa
noche, con la compu cargada, `probar-locales` cortó por tiempo en una espera (en dos lugares
distintos, en páginas que esta tanda no toca); sola pasó siempre entera, y la última corrida
completa, sin nada en paralelo, también. `npm run lint`: 0 errores (las 6
advertencias viejas). `npm run build`: en verde. Capturas en los 6 anchos (320 a 1920), en
Chromium y WebKit, sin scroll de costado.

### Lo que decidí yo (cambiable)

- **Los botones de arrepentimiento y de baja no guardan nada en la base.** Arman el pedido con un
  código (`RT-BAJ-261104-K7Q2`) y la persona lo manda por mail o WhatsApp con un botón. Así el
  código anda sin migración. **Ojo:** mientras el mail y el WhatsApp sean provisorios, el pedido no
  tiene a dónde ir (la página lo dice y deja copiar el texto). *Mejora:* que se guarde solo en la
  base y aparezca en la plataforma (una migración y una sección nueva).
- **La página usa el acento madera** (el de siempre) y las mismas tipografías: todo el producto se ve
  de la misma familia.
- **La captura del celu de la página** es una foto fija de Roble (`public/producto/roble-celu.webp`,
  50 KB). Si Roble cambia mucho, se vuelve a sacar.
- **Los mails del producto no tienen un pie "Reservado con Retoque".** No estaba en el plan; es un
  cambio chico si lo querés.
- **La imagen para compartir** (la que se ve al pegar el link en WhatsApp) usa la tipografía por
  defecto, no la Bevan: no hay forma confiable de cargarla sin internet en Hostinger.

### Lo que no se hizo, y por qué

- **Nada en producción**, como dice el plan: ni la `0018` ni el push a `main`.
- **Lo legal es un borrador** (ver la sección 3).

## 2. Lo que tenés que completar vos

Todo en `src/lib/producto.ts`, salvo donde dice otra cosa. **Un valor entre corchetes es
provisorio:** la página lo muestra resaltado para que no pase desapercibido.

1. **El WhatsApp del producto** → `whatsapp: ''`. El número con código de país, sin `+` (ej.
   `5491122334455`). El de Delfi no (ver `freelance/ventas/whatsapp-business.md` del universo). Con
   el número cargado aparecen "Pedí tu muestra" arriba y "Quiero el Pro" en cada plan.
2. **Los datos del titular** → `titular`:
   - `nombre`: nombre y apellido (o razón social);
   - `cuit`: mientras siga en trámite, podés dejar `CUIT en trámite` **sin corchetes**;
   - `domicilio`: el legal (el fiscal del monotributo);
   - `mail`: **uno del producto, no tu mail personal** (por ejemplo `hola@retoque.com.ar`, cuando
     esté el dominio);
   - `horarioAtencion`: días y horas, **lunes a viernes y al menos 8 horas** (lo pide la Disp.
     954/2025 si la atención es solo por mail o WhatsApp).
3. **El remitente de los mails** → `DIRECCION_REMITENTE` en `src/lib/resend.ts` (no sale de una
   variable de Hostinger: está en el código). Hoy dice `turnos@roblebarberia.com.ar`, que no existe.
   Cuando `retoque.com.ar` esté verificado en Resend, pasa a algo como `turnos@retoque.com.ar`.
4. **El nombre de la app de Mercado Pago** → en tu panel de desarrolladores de Mercado Pago (Tus
   integraciones → la app): el nombre que ven los dueños cuando conectan su cuenta. Que diga Retoque.
5. **Los mails de Supabase** (confirmar la cuenta, recuperar la clave) → en Supabase →
   Authentication → Emails: si dicen otro nombre, que digan Retoque.
6. **¿Se muestran los precios?** → `mostrarPrecios: true`. Con `false`, los planes se ven sin el
   precio.

## 3. Lo legal: un borrador para revisar con un contador o un abogado

Lo escribí después de verificar, el 04/11, qué está vigente. **No es asesoramiento legal.**

- **La Res. 424/2020 (botón de arrepentimiento) ya no está vigente:** la reemplazó la
  **Disposición 954/2025** de la Subsecretaría de Defensa del Consumidor, que también derogó la Res.
  316/2018 (botón de baja). Pide los dos botones visibles desde el primer acceso, sin registrarse, y
  confirmar cada pedido con un código dentro de las 24 horas. La **Disp. 3/2026** aclara que se
  puede pedir verificar la identidad, si es razonable.
- **El link "Defensa de las y los consumidores. Para reclamos ingrese aquí" ya no hace falta:** la
  Res. 274/2021 que lo pedía la derogó la **Disp. 890/2025**.
- **La Ley 25.326 sigue vigente** (hay proyectos para reemplazarla, ninguno aprobado). La AAIP es el
  órgano de control.

Lo que tienen que mirar ellos:
1. **¿Le aplica la Ley 24.240 a un local que contrata Retoque para su negocio?** Puse los dos botones
   por las dudas. Ojo: la Disp. 954/2025 excluye del arrepentimiento lo que se compra para
   "prestación a terceros".
2. **La transferencia de datos fuera del país** (Supabase, Hostinger y Resend): la AAIP no considera
   adecuados a Estados Unidos ni a Brasil. El borrador se apoya en el consentimiento; las otras vías
   son las cláusulas modelo de la AAIP (Disp. 60/2016 y Res. 198/2023).
3. **La inscripción de las bases de datos** en el registro de la AAIP.
4. **Los 90 días** que se guardan los datos de un local después de la baja (lo inventé yo).
5. **Si alcanza con que el botón arme el mensaje**, o hay que guardarlo en la base.
6. **En qué región está tu proyecto de Supabase** (en el panel): la privacidad dice "fuera de la
   Argentina", sin nombrar el país.

## 4. El paso

```bash
cd "C:/Users/Usuario/Desktop/ANDRETTA-UNIVERSO/desarrollo-web/finos-barbers"
git fetch origin
git push origin pase/retoque:main
```
Es un avance directo de `main` (que está en `902bec8`). Si git lo rechaza, alguien tocó `main`:
frená y avisá.

**Opcional, la `0018`** (reserva los 4 nombres; no cambia ningún dato y convive con el código viejo
y el nuevo):
```bash
node scripts/respaldar-base.mjs --env .env.produccion.local
node scripts/migrate.mjs --env .env.produccion.local --produccion supabase/migrations/0018_direcciones_del_producto.sql
```
Si algún local ya se llamara así, la migración se frena sola y no cambia nada.

## 5. Para revisar en vivo

Cuando Hostinger termine de publicar (https://firebrick-giraffe-301726.hostingersite.com):
- [ ] Las variables siguen ahí (hPanel: 7).
- [ ] **`/`, en el celu:** la página de Retoque. Arriba, "Mirá la demo" (sin WhatsApp cargado).
- [ ] **Los planes:** Básico, Pro y Premium, con u$s 19, 35 y 59 y "hasta 2 / hasta 5 / sin límite".
- [ ] **El celu de la portada** lleva a `/roble`. **`/roble`** se ve igual que siempre.
- [ ] **`/reservar`** sigue llevando a la reserva de Roble.
- [ ] **El pie:** "Botón de arrepentimiento", "Botón de baja", términos y privacidad.
- [ ] **`/terminos`:** los datos del titular, resaltados (hasta que los completes).
- [ ] **`/baja`:** completás el formulario y te da un código. Sin mail ni WhatsApp cargados, dice que
      todavía no hay a dónde mandarlo.
- [ ] **`/login` y `/register`:** abajo, los links a términos y privacidad.
- [ ] **Plataforma → una muestra → "Activar el local":** la línea de los términos (después
      "Todavía no").
- [ ] **Pegá el link en un chat de WhatsApp:** tiene que salir la imagen de Retoque.
- [ ] **En tu iPhone, si podés:** en el WebKit de Windows la Montserrat se ve finita en todo el sitio
      (también en Roble, así que no es de esta tanda). En un iPhone de verdad hay que mirarlo.
- [ ] 369: `https://369detail.com.ar` y `https://369detail.com.ar/api/health`.

## 6. Si algo sale mal

Volver al código de antes (`902bec8`, el pulido), sin forzar nada:
```bash
git fetch origin
git checkout -b volver origin/volver-atras-retoque
git merge -s ours origin/main -m "Volver al codigo del pulido"
git push origin volver:main
git checkout ccr-21a597dc-01874p
```
La `0018`, si la corriste, se queda: convive con el código de antes.

## 7. Una cosa suelta en tu compu

Esa noche quedó una carpeta **`C:\c`** con 12 capturas viejas de la página (un error mío con una
ruta). No tiene nada más: se puede borrar entera.
