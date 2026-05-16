import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getUtente() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili')
    .select('id, nome, ruolo')
    .eq('id', user.id)
    .single()

  return { user, profilo, supabase }
}

export function isTitolare(profilo) {
  return profilo?.ruolo === 'titolare'
}

export function isCompagnia(profilo) {
  return profilo?.ruolo === 'compagnia'
}

export function isCollaboratore(profilo) {
  return profilo?.ruolo === 'collaboratore'
}
