/**
 * src/lib/contacto.ts
 *
 * Cómo se guardan los datos de contacto de un local, vengan de donde vengan
 * (el alta de una muestra o "Datos del local" en su panel): la base guarda el
 * WhatsApp solo con números y el Instagram solo con el usuario, y la web arma
 * los links (lib/local-datos.ts).
 */

/** "+54 9 11 2345-6789" → "5491123456789" */
export function normalizarWhatsapp(valor: string): string {
  return valor.replace(/\D/g, '')
}

/** null si está bien (o vacío); si no, qué decirle a quien lo cargó. */
export function errorDeWhatsapp(numeros: string): string | null {
  if (!numeros || (numeros.length >= 10 && numeros.length <= 15)) return null
  return 'El WhatsApp va con código de país y de área, solo números (ej.: 5491123456789).'
}

/** "https://instagram.com/eltano/" o "@eltano" → "eltano". Sirve igual para TikTok. */
export function normalizarUsuario(valor: string): string {
  return valor.trim()
    .replace(/^https?:\/\/(www\.)?(instagram\.com|tiktok\.com)\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
}

export function errorDeUsuario(usuario: string, red: string): string | null {
  if (!usuario || /^[A-Za-z0-9._]{1,30}$/.test(usuario)) return null
  return `El usuario de ${red} no parece válido.`
}
