/**
 * Datos del negocio — fuente única para todo el sitio.
 * Sacados del brief de Leandro (Lista para página) y del manual de marca.
 *
 * ⚠️ PENDIENTES de confirmar con Leandro (marcados con TODO):
 *  - WhatsApp / teléfono exacto
 *  - Horarios reales
 *  - Frase/lema final del local
 */

export const SITE = {
  nombre: "Fino's Barber's",
  nombreCorto: "Fino's",
  lema: "El oficio de la barbería, bien hecho.",
  descripcion:
    "Barbería premium en Buenos Aires. Cortes, barba y afeitado tradicional con navaja, en un ambiente pensado para que la pases bien.",

  direccion: "Av. Rivadavia 10072",
  ciudad: "CABA, Buenos Aires",
  email: "finos_barbers@outlook.com",

  // WhatsApp real de Leandro.
  // OJO: el proyecto todavía NO está cerrado. Mientras sea demo, evitá que el
  // botón mande mensajes reales a Leandro (mostrar la demo sin tocar "Enviar",
  // o apuntar temporalmente al número de Nico si se muestra en vivo).
  whatsapp: "5491133794955",
  whatsappMostrar: "+54 9 11 3379-4955",

  instagram: "finos_barbers",
  instagramUrl: "https://instagram.com/finos_barbers",
  tiktok: "finos.barbers",
  tiktokUrl: "https://tiktok.com/@finos.barbers",

  // Pagos
  aliasPago: "ramon.falcon.leandro",
  senaPorcentaje: 40,
  mediosPago: ["Transferencia", "Mercado Pago", "Efectivo", "Tarjetas"],

  horarios: [
    { dia: "Lunes a Sábado", horas: "10:00 – 20:00" },
    { dia: "Domingos", horas: "Cerrado" },
  ],

  // Mensaje pre-cargado del botón de WhatsApp
  whatsappMensaje:
    "¡Hola Fino's! Quería hacer una consulta / reservar un turno.",
} as const;

export function whatsappLink(mensaje: string = SITE.whatsappMensaje): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
