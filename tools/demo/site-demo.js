/**
 * tools/demo/site-demo.js — modo demo.
 *
 * Copia de `src/lib/site.ts` con los datos privados del comercio reemplazados
 * por marcadores, para que las grabaciones y capturas no expongan el teléfono
 * personal ni el alias bancario del cliente.
 */
const SITE = {
  nombre: "Fino's Barber's",
  nombreCorto: "Fino's",
  lema: "El oficio de la barbería, bien hecho.",
  descripcion:
    "Barbería premium en Buenos Aires. Cortes, barba y afeitado tradicional con navaja, en un ambiente pensado para que la pases bien.",

  direccion: "Av. Rivadavia 10072",
  ciudad: "CABA, Buenos Aires",
  email: "contacto@finosbarbers.demo",

  // Datos de contacto reemplazados para las grabaciones.
  whatsapp: "5490000000000",
  whatsappMostrar: "+54 9 11 0000-0000",

  instagram: "finos_barbers",
  instagramUrl: "https://instagram.com/finos_barbers",
  tiktok: "finos.barbers",
  tiktokUrl: "https://tiktok.com/@finos.barbers",

  // Alias de cobro reemplazado por un placeholder de demo.
  aliasPago: "alias.de.demo",
  senaPorcentaje: 40,
  mediosPago: ["Transferencia", "Mercado Pago", "Efectivo", "Tarjetas"],

  horarios: [
    { dia: "Lunes a Sábado", horas: "10:00 – 20:00" },
    { dia: "Domingos", horas: "Cerrado" },
  ],

  whatsappMensaje:
    "¡Hola Fino's! Quería hacer una consulta / reservar un turno.",
}

function whatsappLink(mensaje) {
  const m = mensaje === undefined ? SITE.whatsappMensaje : mensaje
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(m)}`
}

module.exports = { SITE, whatsappLink }
