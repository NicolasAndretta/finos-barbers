/**
 * Datos del negocio — fuente única para todo el sitio.
 *
 * ⚠️ ESTO ES UNA DEMO. "Roble Barbería" es una barbería ficticia, creada para
 * mostrar el sistema sin usar la marca ni los datos de ningún negocio real.
 * Nada de lo que hay acá abajo pertenece a nadie: ni el nombre, ni la dirección,
 * ni los contactos, ni el alias de cobro.
 *
 * Para re-marcar la demo entera alcanza con editar este archivo: el nombre sale
 * de acá, el logo se dibuja solo (`components/ui/Logo.tsx`, SVG con el texto de
 * `nombreCorto`) y no hay ninguna imagen de marca en `public/`.
 *
 * 🔴 LO ÚNICO QUE FALTA COMPLETAR: `whatsapp`. Hoy tiene un número inventado, así
 * que el botón de WhatsApp abre un chat vacío. Poné ahí el número de Nico para
 * que en una demo en vivo el mensaje llegue a algún lado.
 */

export const SITE = {
  nombre: "Roble Barbería",
  nombreCorto: "Roble",
  lema: "El oficio de la barbería, bien hecho.",
  descripcion:
    "Barbería premium en Buenos Aires. Cortes, barba y afeitado tradicional con navaja, en un ambiente pensado para que la pases bien.",

  // Calle inventada a propósito: no apunta a ningún local que exista.
  direccion: "Av. del Roble 1420",
  ciudad: "CABA, Buenos Aires",
  /** Lo que se le pide al mapa. La calle de arriba no existe, así que el
   *  embed apunta al barrio: se ve un mapa normal y no un pin en la nada. */
  mapaQuery: "Palermo, CABA, Buenos Aires",
  email: "hola@roblebarberia.com.ar",

  // 🔴 Número inventado. Reemplazar por el de Nico antes de mostrar la demo en vivo.
  whatsapp: "5491100000000",
  whatsappMostrar: "+54 9 11 0000-0000",

  instagram: "roble.barberia",
  instagramUrl: "https://instagram.com/roble.barberia",
  tiktok: "roble.barberia",
  tiktokUrl: "https://tiktok.com/@roble.barberia",

  // Pagos
  aliasPago: "roble.barberia.mp",
  senaPorcentaje: 40,
  mediosPago: ["Transferencia", "Mercado Pago", "Efectivo", "Tarjetas"],

  horarios: [
    { dia: "Lunes a Sábado", horas: "10:00 – 20:00" },
    { dia: "Domingos", horas: "Cerrado" },
  ],

  // Mensaje pre-cargado del botón de WhatsApp
  whatsappMensaje:
    "¡Hola Roble! Quería hacer una consulta / reservar un turno.",
} as const;

export function whatsappLink(mensaje: string = SITE.whatsappMensaje): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
