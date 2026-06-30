'use server'

import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function desconectarMP() {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase.from('mp_conexion').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  revalidatePath('/admin/pagos')
  return { success: true }
}
