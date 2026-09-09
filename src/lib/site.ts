/**
 * Datos del negocio — fuente única para todo el sitio.
 *
 * ⚠️ ESTO ES UNA DEMO. "Roble Barbería" es una barbería ficticia, creada para
 * mostrar el sistema sin usar la marca ni los datos de ningún negocio real.
 * Nada de lo que hay acá abajo pertenece a ningún negocio real: ni el nombre, ni
 * la dirección, ni el mail, ni las redes, ni el alias de cobro. La única
 * excepción es el WhatsApp, que es el de Nico (ver más abajo).
 *
 * Para re-marcar la demo entera alcanza con editar este archivo: el nombre sale
 * de acá, el logo se dibuja solo (`components/ui/Logo.tsx`, SVG con el texto de
 * `nombreCorto`) y no hay ninguna imagen de marca en `public/`.
 *
 * El WhatsApp es el de andmar.studio, a propósito: la barbería no existe, así
 * que el botón tiene que llegar a alguien de verdad cuando se muestra la demo
 * en vivo. Va el de la empresa y no uno personal, para que quien escriba vea
 * el perfil de WhatsApp Business.
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

  // El de andmar.studio (WhatsApp Business): la barbería es ficticia, pero el
  // botón tiene que llegar a alguien. Es el mismo que figura como oficial en
  // el repo de contenido (Andmar-content, "00 Empezar aca/Contacto.md").
  whatsapp: "5491157641147",
  whatsappMostrar: "+54 9 11 5764-1147",

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
