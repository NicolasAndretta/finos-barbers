import { SITE } from "@/lib/site";

type LogoProps = {
  /** Alto en px del isologo. El ancho se ajusta solo (relación 2.5:1). */
  size?: number;
  /** Color de render. blanco = sobre fondo oscuro (default). */
  variant?: "white" | "wood" | "black";
  className?: string;
  /**
   * Se mantiene por compatibilidad con los llamados existentes. El logo ahora
   * es SVG inline: viaja con el HTML y no hay imagen que precargar.
   */
  priority?: boolean;
};

/**
 * Isologo de la barbería, dibujado como SVG a partir de `SITE.nombreCorto`.
 *
 * No hay archivo de marca en `public/`: cambiar el nombre en `lib/site.ts`
 * re-marca el sitio entero. El texto usa `textLength` para ocupar siempre el
 * mismo ancho, así que no se descuadra mientras carga la tipografía.
 */
export function Logo({
  size = 40,
  variant = "white",
  className = "",
}: LogoProps) {
  const color =
    variant === "black" ? "#0a0a0a" : variant === "wood" ? "#c79c64" : "#ffffff";
  const nombre = SITE.nombreCorto.toUpperCase();

  return (
    <svg
      viewBox="0 0 250 100"
      role="img"
      aria-label={SITE.nombre}
      className={`select-none ${className}`}
      style={{ height: size, width: "auto" }}
      fill="none"
    >
      {/* Filete superior: BARBERÍA entre dos reglas */}
      <line x1="18" y1="22" x2="78" y2="22" stroke={color} strokeWidth="2" opacity="0.75" />
      <line x1="172" y1="22" x2="232" y2="22" stroke={color} strokeWidth="2" opacity="0.75" />
      <text
        x="125"
        y="27"
        textAnchor="middle"
        fill={color}
        opacity="0.75"
        fontSize="15"
        letterSpacing="3"
        textLength="80"
        lengthAdjust="spacingAndGlyphs"
        style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}
      >
        BARBERÍA
      </text>

      {/* Palabra principal */}
      <text
        x="125"
        y="70"
        textAnchor="middle"
        fill={color}
        fontSize="46"
        textLength="200"
        lengthAdjust="spacingAndGlyphs"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        {nombre}
      </text>

      {/* Filete inferior con rombo al centro */}
      <line x1="18" y1="86" x2="113" y2="86" stroke={color} strokeWidth="2" opacity="0.55" />
      <line x1="137" y1="86" x2="232" y2="86" stroke={color} strokeWidth="2" opacity="0.55" />
      <rect
        x="119.5"
        y="80.5"
        width="11"
        height="11"
        transform="rotate(45 125 86)"
        fill={color}
        opacity="0.55"
      />
    </svg>
  );
}
