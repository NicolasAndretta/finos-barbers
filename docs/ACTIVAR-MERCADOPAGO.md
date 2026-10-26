# Activar cobros online (Mercado Pago Connect, un local a la vez)

> Desde la Fase 4a (26/10/2026) **cada local cobra en su propia cuenta de Mercado
> Pago**. El dueño entra al panel de su local, toca "Conectar" y autoriza con su
> cuenta. Nadie de la plataforma ve su contraseña ni maneja su token a mano, y la
> plata le cae directo a él.
>
> El código está hecho y probado en la PC contra un Mercado Pago de mentira
> (`scripts/probar-cobros.mjs`). Lo que falta para cobrar de verdad está abajo.

---

## Conceptos en 30 segundos
- **La aplicación de Mercado Pago de la plataforma:** se crea **una sola vez** y
  sirve para **todos** los locales. De ahí salen el `Client ID` y el `Client Secret`.
  Su nombre es lo que ve el dueño cuando autoriza ("X quiere acceder a tu cuenta"),
  así que **se crea cuando el producto tenga nombre**. No sirve la de Código Rojo:
  le diría "Codigo-rojo-web" a un barbero.
- **La cuenta de cada local:** la conecta el dueño desde `/<local>/admin/pagos`. El
  panel muestra **con qué cuenta** quedó conectado y cuándo vence.
- **Un local en demo nunca cobra**, aunque tenga una cuenta conectada: la reserva y la
  tienda muestran cómo sería el pago, sin cobrar. Cobra recién cuando está **activo**.
- **Un local activo sin cuenta conectada** no cobra online: la seña se paga por
  transferencia y la tienda queda como catálogo, con "Consultar por WhatsApp".

---

## Paso 1 — Crear la aplicación de Mercado Pago (una vez, con el nombre del producto)
1. Entrá a **https://www.mercadopago.com.ar/developers/panel/app** con la cuenta de
   la plataforma (no la de un local).
2. **Crear aplicación**, con el nombre del producto.
   - Producto: **Pagos online** → **Checkout Pro**. Si pregunta por una plataforma de
     e-commerce: **No**.
   - Si aparece **Marketplace / Mercado Pago Connect**, elegilo: es lo que permite
     cobrar en nombre de otras cuentas.
3. En **Credenciales** están el **Client ID** y el **Client Secret** (a veces figuran
   como *App ID* / *Secret Key*).

## Paso 2 — Registrar la dirección de vuelta (una para todos los locales)
En la aplicación, en **Redirect URIs** / **URLs de redireccionamiento**, agregá
**exactamente** la dirección pública del sitio + `/api/mp/oauth/callback`. Con la
dirección provisoria de hoy:

```
https://firebrick-giraffe-301726.hostingersite.com/api/mp/oauth/callback
```

Tiene que coincidir carácter por carácter (con `https`, sin barra al final). Si el
sitio cambia de dirección, se registra la nueva.

El aviso de pago (webhook) **no se configura en el panel**: cada cobro le dice a
Mercado Pago a dónde avisar (`/api/mp/webhook?local=<id del local>`).

## Paso 3 — Las variables de Hostinger (sin pegármelas a mí)
Las credenciales **nunca van por el chat**. En Hostinger → el sitio → **Variables de
entorno**:

```
MP_CLIENT_ID=<Client ID de la aplicación>
MP_CLIENT_SECRET=<Client Secret>
NEXT_PUBLIC_APP_URL=https://firebrick-giraffe-301726.hostingersite.com
```

- `NEXT_PUBLIC_APP_URL` (o `NEXT_PUBLIC_SITE_URL`) es **obligatoria**: con ella se
  arman la vuelta de Mercado Pago y su aviso. Sin ella, ningún local cobra online
  (a propósito: en Código Rojo, sin esa variable, los pagos se perdían en silencio).
- **Borrá `MERCADOPAGO_ACCESS_TOKEN`** si está: desde la Fase 4a no se usa. Antes era
  un "token de respaldo", y con muchos locales cobraría en la cuenta equivocada.
- **`MP_WEBHOOK_SECRET`** (la clave para verificar la firma de los avisos) es
  opcional. Se carga **el mismo día que se hace un pago real de prueba**, nunca suelta:
  con una clave equivocada se rechazarían todos los avisos. Ver
  `src/app/api/mp/webhook/route.ts`.
- Después de tocar variables, Hostinger vuelve a publicar: revisá que **todas** sigan
  ahí (un redeploy ya las borró una vez).

## Paso 4 — La base y el código
Va con el resto del producto, en el pase a producción después de la Fase 5 (con copia
de seguridad antes). La migración `0011_cobros_por_local.sql` va **antes** de
publicar el código de la Fase 4a: el código nuevo usa sus funciones. El código viejo
convive con la `0011`, salvo conectar una cuenta (no dice de qué local es): entre una
cosa y la otra, nadie conecta Mercado Pago.

## Paso 5 — Conectar y probar
1. Con un local **activo** de prueba, entrá a **`/<local>/admin/pagos`** como su dueño
   (o como admin).
2. **"Conectar Mercado Pago"** → autorizás en Mercado Pago → vuelve solo.
3. Tiene que decir **"● Conectado"** y **la cuenta correcta**.
4. Una reserva eligiendo **Mercado Pago** para la seña, o una compra en la tienda: el
   pago se tiene que ver confirmado (seña pagada / pedido pagado, el stock baja y la
   venta entra a la caja).

### Para probar sin gastar plata
Mercado Pago da **usuarios de prueba** y **tarjetas de prueba**:
- Panel de developers → la aplicación → **Cuentas de prueba**: un "vendedor" y un
  "comprador" de mentira.
- Conectás el local de prueba con el **vendedor de prueba** y pagás con una **tarjeta
  de prueba** (por ejemplo Mastercard `5031 7557 3453 0604`, vence `11/30`, CVV
  `123`, titular `APRO` para aprobar). Lista completa en la documentación de Mercado
  Pago ("Tarjetas de prueba").
- Ojo: un token que empieza con `APP_USR-` puede ser de un usuario de prueba **o** de
  una cuenta real. El panel muestra con qué cuenta se conectó: miralo siempre.

### En la PC, sin internet
`scripts/mp-falso.mjs` es un Mercado Pago de mentira y `scripts/probar-cobros.mjs`
prueba todo el recorrido con un navegador. Cómo levantar la app para eso está arriba
de `probar-cobros.mjs`. La app solo acepta el Mercado Pago de mentira en desarrollo y
apuntando a la propia PC.

---

## Sobre la comisión y la demora de Mercado Pago
- La comisión y el plazo de acreditación los define Mercado Pago por la cuenta de cada
  **local** (no se pueden "anular" desde el código). Lo que sí se puede:
  - El dueño, desde **su** cuenta, elegir **"dinero disponible al instante"** (comisión
    un poco mayor) o esperar los días.
  - Cobrar la seña por **transferencia** (alias del local): sin comisión. Ya funciona.

---

## Quién hace qué
| Quién | Qué |
|-------|-----|
| **Nico (una vez)** | Crear la aplicación con el nombre del producto, registrar la dirección de vuelta, cargar las variables en Hostinger. |
| **El dueño de cada local** | Entrar a `/<local>/admin/pagos`, tocar "Conectar", autorizar con su cuenta y revisar que diga la suya. |
| **El sistema** | Guarda el token de cada local (solo lo lee el servidor; no se cifra, mismo criterio que Código Rojo), lo renueva solo con 30 días de margen, cobra en nombre del local y confirma cada pago preguntándole a Mercado Pago con la cuenta del local. |
