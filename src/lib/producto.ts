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
  /**
   * A dónde redirigen los links viejos de la demo (/reservar, /tienda...), y
   * el local que la página del producto muestra como demo en vivo.
   */
  localPorDefecto: 'roble',
  /**
   * La página del producto muestra el precio de cada plan. El precio todavía
   * es una hipótesis: con `false` se ven los planes y lo que trae cada uno,
   * sin el precio.
   */
  mostrarPrecios: true,
  /**
   * El WhatsApp del producto, con código de país y sin el "+" ni espacios
   * (ej.: '5491122334455'). Vacío: la página no muestra el botón de contacto
   * y el llamado principal es "Mirá la demo". Lo carga Nico.
   */
  whatsapp: '',
  /**
   * Quién presta el servicio, para los términos y la privacidad. Un valor
   * entre corchetes es PROVISORIO: la página lo muestra resaltado para que no
   * pase desapercibido. Lo completa Nico (docs/PASE-RETOQUE.md).
   */
  titular: {
    nombre: '[Nombre y apellido del titular]',
    cuit: '[CUIT: en trámite]',
    domicilio: '[Domicilio legal]',
    mail: '[Mail de contacto de Retoque]',
    /** Por mail o WhatsApp, de lunes a viernes y al menos 8 horas (Disp. 954/2025). */
    horarioAtencion: '[Días y horario de atención]',
  },
  /** Fecha de la última versión de los términos y de la privacidad. */
  legalesActualizados: '4 de noviembre de 2026',
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
