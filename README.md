# Finos Barbers

Sistema de gestión integral para barbería desarrollado como proyecto portfolio full-stack. Cubre el ciclo completo de operaciones: reservas online, agenda visual, tienda con pagos reales y panel financiero con gráficos.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase)

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Lenguaje | TypeScript estricto |
| Estilos | Tailwind CSS v4 |
| Base de datos | Supabase (PostgreSQL + PostgREST) |
| Autenticación | Supabase Auth (JWT + RLS) |
| Emails | Resend |
| Pagos | MercadoPago SDK v3 |
| Gráficos | Recharts |
| Deploy | Hostinger |

---

## Funcionalidades

### Sistema de turnos
- Reserva online en 3 pasos: servicio → barbero → fecha/hora
- Disponibilidad en tiempo real (sin solapamientos)
- Cancelación desde el panel del cliente
- Confirmación automática por email (Resend)

### Panel de administración
- Gestión completa de servicios (CRUD con toggle activo/inactivo)
- Agenda de turnos con filtros por estado y fecha
- Confirmación y cancelación de turnos con email automático al cliente
- Creación manual de reservas (para turnos por WhatsApp / telefónico)

### Calendario semanal
- Vista semanal visual por barbero
- Navegación entre semanas
- Indicadores de estado por color (pendiente / confirmado)

### PWA (Progressive Web App)
- Instalable en Android e iOS desde el navegador
- Service Worker con caché de assets estáticos
- Manifest con íconos y colores del tema
- Banner de instalación inteligente (no muestra si ya está instalada)

### E-commerce
- Catálogo de productos con filtros por categoría y buscador
- Carrito persistente en localStorage (sobrevive recarga)
- Drawer lateral con controles de cantidad
- Stock en tiempo real con indicadores de "últimas unidades"

### Checkout con MercadoPago
- Integración con la API de preferencias de MP
- Elección entre retiro en local o envío a domicilio
- Páginas de éxito y error con feedback claro
- Registro automático del ingreso en el panel financiero al confirmar pago

### Panel financiero
- KPI cards: ingresos, egresos, balance mensual y acumulado
- Navegación por mes
- Registro manual de ingresos y egresos (con categorías)
- Auto-registro al confirmar turnos y pedidos pagados
- Badges de origen (Turno / Tienda / Manual)
- Dashboard con gráficos (Recharts):
  - Bar chart: ingresos vs egresos últimos 6 meses
  - Donut charts: egresos por categoría y origen de ingresos del mes

---

## Instalación local

### Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Resend](https://resend.com)
- Cuenta de desarrollador en [MercadoPago](https://www.mercadopago.com.ar/developers)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/NicolasAndretta/finos-barbers.git
cd finos-barbers

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.local.example .env.local
# Editá .env.local con tus credenciales reales

# 4. Iniciar en modo desarrollo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Variables de entorno

Copiá `.env.local.example` a `.env.local` y completá cada valor:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon (pública) de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role (solo server-side) |
| `RESEND_API_KEY` | API key de Resend para emails |
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de MercadoPago (TEST- para dev) |
| `NEXT_PUBLIC_APP_URL` | URL base de la app (sin trailing slash) |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/          # Login y registro
│   ├── (client)/        # Área del cliente autenticado
│   │   ├── dashboard/
│   │   ├── reservar/
│   │   ├── turnos/
│   │   ├── tienda/
│   │   └── checkout/
│   ├── (admin)/         # Panel de administración
│   │   └── admin/
│   │       ├── dashboard/
│   │       ├── servicios/
│   │       ├── turnos/
│   │       ├── calendario/
│   │       ├── productos/
│   │       └── finanzas/
│   └── actions/         # Server Actions (auth, reservas, tienda, finanzas)
├── components/
│   ├── ui/              # Componentes genéricos (Spinner, AuthForm, LogoutButton)
│   ├── client/          # ReservaForm, TurnoCard
│   ├── admin/           # CalendarioSemanal, AdminNuevoTurnoModal, FinanzasCharts
│   ├── tienda/          # ProductoCard, TiendaCatalogo, CartButton, CartDrawer
│   └── checkout/        # CheckoutForm, SuccessContent
├── lib/
│   ├── supabase.ts      # Cliente Supabase (SSR)
│   ├── auth.ts          # Guards requireAdmin / requireUser / requireClient
│   ├── resend.ts        # Templates de emails
│   └── cart-context.tsx # CartProvider con persistencia localStorage
└── types/
    └── index.ts         # Tipos TypeScript globales
```

---

## Base de datos (Supabase)

Tablas principales:

| Tabla | Descripción |
|---|---|
| `profiles` | Usuarios con rol `client` o `admin` |
| `servicios` | Servicios disponibles con precio y duración |
| `barberos` | Barberos activos |
| `turnos` | Reservas con control de solapamiento |
| `productos` | Catálogo del e-commerce |
| `pedidos` | Órdenes de compra con estado MP |
| `items_pedido` | Líneas de cada pedido |
| `transacciones` | Registro financiero (origen: manual / turno / pedido) |

Las políticas RLS garantizan que cada cliente solo acceda a sus propios datos, y que las operaciones de admin requieran `role = 'admin'` en la tabla `profiles`.

---

## Autor

**Nicolas Andretta** — [GitHub](https://github.com/NicolasAndretta)
