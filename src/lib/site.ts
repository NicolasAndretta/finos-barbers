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

  direccion: "Ramón L. Falcón 4955",
  ciudad: "CABA, Buenos Aires",
  email: "finos_barbers@outlook.com",

  // TODO(Leandro): número real de WhatsApp. Placeholder por ahora.
  whatsapp: "5491100000000",
  whatsappMostrar: "+54 9 11 0000-0000",

  instagram: "finos_barbers",
  instagramUrl: "https://instagram.com/finos_barbers",
  tiktok: "finos.barbers",
  tiktokUrl: "https://tiktok.com/@finos.barbers",

  // Pagos
  aliasPago: "ramon.falcon.leandro",
  senaPorcentaje: 40,
  mediosPago: ["Transferencia", "Mercado Pago", "Efectivo", "Tarjetas"],

  // TODO(Leandro): confirmar horarios reales.
  horarios: [
    { dia: "Lunes a Viernes", horas: "10:00 – 20:00" },
    { dia: "Sábados", horas: "09:00 – 18:00" },
    { dia: "Domingos", horas: "Cerrado" },
  ],

  // Mensaje pre-cargado del botón de WhatsApp
  whatsappMensaje:
    "¡Hola Fino's! Quería hacer una consulta / reservar un turno.",
} as const;

export function whatsappLink(mensaje: string = SITE.whatsappMensaje): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
