/**
 * src/lib/producto.ts
 *
 * El producto: la plataforma de turnos que usan los locales (Roble es uno de
 * ellos, el de demostración). Se ve en el login, en las pestañas del navegador
 * cuando no hay un local de por medio, y más adelante en su propia página.
 *
 * ⚠️ El nombre es PROVISORIO (decidido el 22/10/2026). Cuando Nico y Delfina
 * elijan el definitivo, se cambia acá y en ningún otro lado.
 */
export const PRODUCTO = {
  nombre: 'Turnos',
  /**
   * A dónde lleva la dirección "/" sola, y a dónde redirigen los links viejos
   * de la demo (/reservar, /tienda...), mientras no haya página del producto.
   */
  localPorDefecto: 'roble',
} as const
