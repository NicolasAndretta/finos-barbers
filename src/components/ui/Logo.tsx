import Image from "next/image";

type LogoProps = {
  /** Alto en px del isologo. El ancho se ajusta solo. */
  size?: number;
  /** Color de render. blanco = sobre fondo oscuro (default). */
  variant?: "white" | "wood" | "black";
  className?: string;
  priority?: boolean;
};

/**
 * Isologo de Fino's Barber's. Usamos versiones transparentes generadas a
 * partir del asset original (logo-white.png / logo-black.png). Respeta el
 * manual de marca (no se deforma; se mantiene proporción).
 */
export function Logo({
  size = 40,
  variant = "white",
  className = "",
  priority = false,
}: LogoProps) {
  const src =
    variant === "black" ? "/images/logo-black.png" : "/images/logo-white.png";
  const tint = variant === "wood" ? "logo-wood" : "";

  return (
    <Image
      src={src}
      alt="Fino's Barber's"
      width={Math.round(size * 2.5)}
      height={size}
      priority={priority}
      className={`${tint} select-none ${className}`}
      style={{ height: size, width: "auto" }}
    />
  );
}
