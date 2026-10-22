/**
 * src/lib/icono.tsx
 *
 * El dibujo del ícono de la app (pestaña del navegador, pantalla de inicio del
 * celu): las iniciales del local grandes y su rubro abajo, como el "RB
 * BARBERÍA" que tenía Roble escrito a mano. Ahora sale de los datos de cada
 * local (app/[local]/icon.tsx) o del producto, fuera de un local (app/icon.tsx).
 *
 * Es el árbol que recibe `ImageResponse` (de next/og): se llama como función,
 * no como componente.
 */

/** "Roble Barbería" → "RB"; "Turnos" → "T". */
export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0]!.toUpperCase())
    .join('')
}

export function dibujoIcono({ dim, iniciales, etiqueta }: { dim: number; iniciales: string; etiqueta: string }) {
  const grande = dim > 200
  return (
    <div
      style={{
        width: dim,
        height: dim,
        background: '#09090b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Math.round(dim * 0.04),
      }}
    >
      <span
        style={{
          color: '#f59e0b',
          fontSize: Math.round(dim * 0.36),
          fontWeight: 900,
          fontFamily: 'Arial Black, Arial, sans-serif',
          lineHeight: 1,
          letterSpacing: grande ? '-4px' : '-2px',
        }}
      >
        {iniciales}
      </span>
      <span
        style={{
          color: grande ? '#71717a' : '#a1a1aa',
          fontSize: Math.round(dim * (grande ? 0.12 : 0.13)),
          fontFamily: 'Arial, sans-serif',
          letterSpacing: grande ? '6px' : '3px',
          textTransform: 'uppercase',
        }}
      >
        {etiqueta}
      </span>
    </div>
  )
}
