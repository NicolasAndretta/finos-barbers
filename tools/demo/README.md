# tools/demo — modo demo para grabar el proyecto

Estas herramientas sirven para **grabar y fotografiar Fino's Barbers sin usar
credenciales reales**, y para armar con eso el material de andmar.studio.

> **Nada de esto afecta a producción.** Todo el modo demo se activa únicamente
> con `DEMO_MODE=1`; sin esa variable, `next.config.js` no cambia absolutamente
> nada de la aplicación.

## Qué reemplaza el modo demo

| Módulo real | Reemplazo | Por qué |
|---|---|---|
| `@supabase/ssr` | `supabase-mock.js` (y `supabase-mock-edge.js` para el proxy) | Correr la app sin base de datos, con datos de ejemplo (`seed.json`). |
| `resend` | `resend-mock.js` | No enviar correos de verdad. |
| `mercadopago` | `mercadopago-mock.js` | No tocar la pasarela de pago. |
| `@/lib/site` | `site-demo.js` | **Reemplazar el alias de cobro y el WhatsApp reales del comercio** para que no aparezcan en ninguna grabación. |

El estado de la demo vive en `.demo-db.json` (gitignoreado). Se recrea desde
`seed.json` la primera vez, así que se puede borrar para volver al estado inicial.

## Cuentas de la demo

| Cuenta | Rol |
|---|---|
| `admin@finosbarbers.demo` | Administrador |
| `cliente@finosbarbers.demo` | Cliente |
| `facundo@finosbarbers.demo` | Barbero |

Contraseña: `demo1234`. **No son credenciales reales**: sólo existen en el
archivo local de la demo.

## Estructura

```
tools/demo/
├── env.demo              Variables ficticias para .env.local
├── seed.json             Datos de ejemplo (barberos, servicios, turnos, etc.)
├── store.js              Almacén JSON del modo demo
├── supabase-mock.js      Cliente de Supabase simulado
├── supabase-mock-edge.js Variante para el proxy (sólo sesión)
├── resend-mock.js        Envío de emails simulado
├── mercadopago-mock.js   Pasarela de pago simulada
├── site-demo.js          Datos del negocio sin información privada
├── capture/              Grabación de video y capturas (Playwright)
├── brand/                Identidad y plantillas gráficas de andmar.studio
├── edicion/              Montaje de los reels (FFmpeg)
├── contenido/            Textos de las piezas y generación de la documentación
└── control/              Control final de calidad
```

## Uso

```bash
cp tools/demo/env.demo .env.local
npm run demo:dev        # levanta la app en modo demo

npm run demo:grabar     # grabaciones (verticales + escritorio)
npm run demo:capturas   # capturas de pantalla
npm run demo:piezas     # posts, historias, destacadas y recursos
npm run demo:reels      # reels finales
npm run demo:docs       # captions y content-index
npm run demo:control    # control de calidad
```

Requisitos: Node 18+, `ffmpeg` y `ffprobe` en el PATH, y los navegadores de
Playwright instalados (`npx playwright install chromium`).
