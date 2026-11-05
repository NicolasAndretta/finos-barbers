/**
 * src/lib/producto.ts
 *
 * El producto: Retoque, la plataforma de turnos que usan los locales (Roble es
 * uno de ellos, el de demostración). Se ve en su página (/), en el login, en
 * las pestañas del navegador cuando no hay un local de por medio, en la
 * plataforma y en los términos y la privacidad.
 *
 * El nombre es DEFINITIVO desde el 04/11/2026 (lo eligió Nico). Si alguna vez
 * cambia, se cambia acá y en ningún otro lado.
 */
export const PRODUCTO = {
  nombre: 'Retoque',
  /** La marca que hace Retoque (decidido el 05/11/2026): sale en el pie y en los términos. */
  marca: 'andmar.studio',
  /**
   * A dónde redirigen los links viejos de la demo (/reservar, /tienda...), y
   * el local que la página del producto muestra como demo en vivo.
   */
  localPorDefecto: 'roble',
  /**
   * La página del producto muestra el precio de cada plan. El precio todavía
   * es una hipótesis: con `false` se ven los planes y lo que trae cada uno,
   * sin el precio, y en su lugar la muestra gratis.
   *
   * Apagado el 05/11/2026 (Nico): el precio sale de la prueba con las primeras
   * barberías, y probablemente en pesos.
   */
  mostrarPrecios: false,
  /**
   * El WhatsApp del producto, con código de país y sin el "+" ni espacios
   * (ej.: '5491122334455'). Vacío: la página no muestra el botón de contacto
   * y el llamado principal es "Mirá la demo". Es el de andmar (05/11/2026).
   */
  whatsapp: '5491157641147',
  /**
   * Quién presta el servicio, para los términos y la privacidad. Un valor
   * entre corchetes es PROVISORIO: la página lo muestra resaltado para que no
   * pase desapercibido. Uno vacío no se muestra.
   */
  titular: {
    nombre: 'Nicolás Germán Andretta',
    cuit: '20-44789018-7',
    /**
     * Vacío a propósito (05/11/2026): va el domicilio fiscal el día que se
     * saque el monotributo, antes del primer cobro. La Res. 270/2020
     * (comercio electrónico) pide un domicilio físico para vender.
     */
    domicilio: '',
    mail: 'studioandmar@gmail.com',
    /** Por mail o WhatsApp, de lunes a viernes y al menos 8 horas (Disp. 954/2025). */
    horarioAtencion: 'De lunes a viernes, de 14 a 22, por WhatsApp y por mail',
  },
  /** Fecha de la última versión de los términos y de la privacidad. */
  legalesActualizados: '5 de noviembre de 2026',
} as const

/** Un dato del titular que todavía no se completó (va entre corchetes). */
export function esProvisorio(valor: string): boolean {
  return valor.startsWith('[')
}

/** El mensaje con el que arranca la charla por WhatsApp desde la página. */
export const MENSAJE_MUESTRA = `Hola! Quiero que me armen una muestra de ${PRODUCTO.nombre} para mi barbería.`

/** El link al WhatsApp del producto, o null mientras no haya número cargado. */
export function whatsappProducto(mensaje: string = MENSAJE_MUESTRA): string | null {
  const numero = PRODUCTO.whatsapp.replace(/\D/g, '')
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}` : null
}
