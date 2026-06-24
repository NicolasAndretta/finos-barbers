# DESIGN SYSTEM — Finos Barbers

## Identidad visual
- Estética: barbería premium, oscura, masculina, sofisticada
- Inspiración: lujo moderno, editorial, no recargado
- Paleta principal: zinc-950 (fondo), zinc-900 (cards), amber-400/500 (acento)

## Tipografía
- **Titulares / display:** Barlow Condensed (`font-display`), uppercase, con
  tracking abierto. Condensada y con carácter — el sello visual de la marca.
  Usar en H1/H2, números grandes (precios, stats, KPIs) y el wordmark FINOS.
- **Cuerpo / UI:** Barlow (`font-sans`), pesos 400–700. Legible y consistente
  en formularios, párrafos y navegación.
- Jerarquía: display extrabold para títulos, semibold para subtítulos,
  zinc-400 para textos secundarios, eyebrows en amber uppercase + tracking.

## Tokens de color
- Fondo base: bg-zinc-950
- Cards: bg-zinc-900/50 con border border-zinc-800
- Acento principal: amber-400 / amber-500
- Texto primario: text-white
- Texto secundario: text-zinc-400
- Texto terciario: text-zinc-500
- Success: emerald-400/500
- Error: red-400/500
- Bordes hover: hover:border-amber-500/40

## Efectos
- Glow de fondo: bg-amber-500/5 o /10, blur-[100px], pointer-events-none
- Cards con shadow-xl
- Transiciones: transition-all, transition-colors
- Hover en cards: hover:bg-zinc-900, hover:border-amber-500/40
- Animación de entrada: animate-fade-in (si está definida)
- Botón primario: bg-gradient-to-r from-amber-500 to-amber-600, text-black, font-black, rounded-xl
- Botón secundario: bg-zinc-900 border border-zinc-800 text-white

## Componentes reutilizables existentes
- AuthForm — formulario de login/registro con useActionState
- LogoutButton — con useFormStatus
- Spinner — SVG animado amber
- TurnoCard — tarjeta de turno del cliente
- ReservaForm — formulario multi-paso

## Principios de mejora visual
- Más separación vertical entre secciones (gap-8 o gap-10)
- Títulos con gradient amber cuando sean destacados
- Iconos SVG inline en cards de acción
- Badges de estado con colores semánticos (pendiente=amber, confirmado=emerald, cancelado=red)
- Inputs con focus:ring-amber-500/20 y border-zinc-700
- Nunca usar bordes blancos puros, siempre zinc-700/800/900
- Rounded-2xl para cards grandes, rounded-xl para botones y inputs
