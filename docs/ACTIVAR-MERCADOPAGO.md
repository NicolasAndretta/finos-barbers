# Activar cobros online (Mercado Pago Connect / OAuth)

> El código ya está hecho y verificado. Esto es **lo único que falta**, y lo hacés vos.
> Diseño profesional: **vos nunca tocás las credenciales del cliente**. El cliente entra
> a su panel, clickea "Conectar" y autoriza con su propia cuenta. La plata le entra
> directo a él; vos solo creás la "aplicación" una vez.

---

## Conceptos en 30 segundos
- **Tu aplicación de Mercado Pago** (de Andretta Studio): se crea **una sola vez** y sirve
  para **todos** tus clientes. De ahí salen el `Client ID` y el `Client Secret`.
- **La cuenta del cliente** (Leandro): él la conecta solo, con un clic, desde `/admin/pagos`.
  No te pasa usuario ni contraseña ni token. Eso es lo "serio/sin datos sensibles".
- **TEST vs PROD:** primero probás con credenciales de **TEST** (plata falsa). Cuando
  funciona, pasás a **producción**.

---

## Paso 1 — Crear la aplicación de Mercado Pago (una vez)
1. Entrá a **https://www.mercadopago.com.ar/developers/panel/app** con **tu** cuenta
   (la de Andretta Studio, no la de Leandro).
2. **Crear aplicación**.
   - Nombre: `Andretta Studio` (o `Finos Barbers`, da igual).
   - Tipo de solución / producto: **Pagos online** → **Checkout Pro** (o "Pagos por
     Internet"). Si pregunta "¿usás una plataforma de e-commerce?": **No**.
   - Modelo de integración: si aparece la opción **Marketplace / Mercado Pago Connect**,
     elegila. (Es la que permite cobrar en nombre de otras cuentas.)
3. Creada la app, andá a **Credenciales**. Vas a ver dos juegos: **Producción** y **Prueba**.
   - El que necesitamos para OAuth se llama **Client ID** y **Client Secret**
     (a veces figuran como *App ID* / *Secret Key*).

## Paso 2 — Configurar la Redirect URI
En la misma app, buscá **"Redirect URIs"** / **"URLs de redireccionamiento"** (suele estar
en la sección OAuth o en la config de la app) y agregá **exactamente**:

```
https://firebrick-giraffe-301726.hostingersite.com/api/mp/oauth/callback
```

> Tiene que coincidir carácter por carácter, con `https`, sin barra al final.

## Paso 3 — Cargar las credenciales (sin pegármelas a mí)
Las credenciales **nunca van por chat**. Van a variables de entorno:

**En tu compu (para probar local), en `.env.local`:**
```
MP_CLIENT_ID=<tu Client ID>
MP_CLIENT_SECRET=<tu Client Secret>
```

**En Hostinger (para producción):** panel de Hostinger → tu sitio → **Variables de
entorno** (Environment / Node.js app) → agregá las mismas dos. Y confirmá que ya estén
estas (deberían):
```
NEXT_PUBLIC_SITE_URL=https://firebrick-giraffe-301726.hostingersite.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
```

## Paso 4 — Deploy
Subí la última versión a Hostinger (el callback tiene que estar **online** para que
Mercado Pago pueda volver). Cuando lo hagas, avisame y reviso que `/admin/pagos`
responda bien.

## Paso 5 — Conectar y probar
1. Entrá como admin a **`/admin/pagos`**.
2. Clic en **"Conectar Mercado Pago"** → te manda a MP → autorizás → vuelve solo.
3. Tiene que quedar en **"Conectado"**.
4. Hacé una reserva de prueba eligiendo **Mercado Pago** como medio de la seña, o una
   compra en la tienda, y verificá que el pago se procese.

---

## Para probar pagos SIN gastar plata (recomendado primero)
Mercado Pago te da **usuarios de prueba** y **tarjetas de test**:
- Panel de developers → tu app → **Cuentas de prueba**: creás un "vendedor" y un
  "comprador" de mentira.
- Conectás `/admin/pagos` con el **vendedor de prueba** y pagás con una **tarjeta de
  prueba** (ej. Mastercard `5031 7557 3453 0604`, venc. `11/30`, CVV `123`, nombre
  `APRO` para aprobar). Lista completa en la doc de MP ("Tarjetas de prueba").
- Cuando todo cierra, conectás la cuenta **real** de Leandro y listo.

---

## Sobre la comisión y la demora de Mercado Pago (lo que preguntaste)
- La comisión y el plazo de acreditación los define MP por la cuenta del **cliente**
  (no se pueden "anular" desde el código). Lo que sí se puede:
  - El cliente, desde **su** cuenta MP, elegir **"dinero disponible al instante"**
    (cobra una comisión un poco mayor) vs. esperar los días.
  - A futuro, ofrecer **transferencia/alias** como medio (ya está en la web): cero
    comisión de MP, el cliente recibe directo. La seña por transferencia ya funciona.

---

## Resumen de lo que hace cada quién
| Quién | Qué |
|-------|-----|
| **Vos (una vez)** | Crear la app de MP, poner la Redirect URI, cargar `MP_CLIENT_ID`/`MP_CLIENT_SECRET` en env, deploy. |
| **El cliente (Leandro)** | Entrar a `/admin/pagos`, clic en "Conectar", autorizar. Nada más. |
| **El sistema** | Guarda el token cifrado, lo refresca solo y cobra en nombre del cliente. |
