"use client";

import { useLocalOpcional } from "@/components/local/LocalProvider";
import { PRODUCTO } from "@/lib/producto";

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
 * Isologo del local de la página, dibujado como SVG con su nombre corto y su
 * rubro (BARBERÍA, UÑAS...). Fuera de un local (el login, por ejemplo) dibuja
 * el nombre del producto.
 *
 * No hay archivo de marca en `public/`: el nombre sale de la base, así que
 * cada local tiene su logo sin hacer nada. El texto usa `textLength` para
 * ocupar siempre el mismo ancho, así que no se descuadra mientras carga la
 * tipografía. Si el local subió su logo (0017), se muestra esa imagen, del
 * mismo alto.
 */
export function Logo({
  size = 40,
  variant = "white",
  className = "",
}: LogoProps) {
  // "wood" sigue el acento del local (0017): madera, salvo que elija otro. Va
  // como currentColor (los atributos de SVG no aceptan var() en todos lados).
  const color =
    variant === "black" ? "#0a0a0a" : variant === "wood" ? "currentColor" : "#ffffff";
  const local = useLocalOpcional();
  const nombre = (local?.nombreCorto ?? PRODUCTO.nombre).toUpperCase();
  const etiqueta = (local?.palabras.negocio ?? "Reservas").toUpperCase();
  const nombreCompleto = local?.nombre ?? PRODUCTO.nombre;

  if (local?.logoUrl) {
    return (
      // Una imagen subida al Storage del local: no pasa por next/image (no
      // hace falta achicarla, ya se achica al subirla).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={local.logoUrl}
        alt={nombreCompleto}
        className={`select-none object-contain ${className}`}
        style={{ height: size, width: "auto", maxWidth: size * 3.2 }}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 250 100"
      role="img"
      aria-label={nombreCompleto}
      className={`select-none ${className}`}
      style={{ height: size, width: "auto", ...(variant === "wood" ? { color: "var(--color-amber-400)" } : {}) }}
      fill="none"
    >
      {/* Filete superior: el rubro (BARBERÍA, UÑAS...) entre dos reglas */}
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
        // Las palabras cortas (UÑAS) no se estiran: ocupan lo que les toca.
        textLength={Math.min(80, etiqueta.length * 10.5)}
        lengthAdjust="spacingAndGlyphs"
        style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}
      >
        {etiqueta}
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
