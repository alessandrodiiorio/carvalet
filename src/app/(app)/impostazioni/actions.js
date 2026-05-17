'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function aggiornaLogo(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili')
    .select('ruolo')
    .eq('id', user.id)
    .single()
  if (profilo?.ruolo !== 'titolare') {
    redirect('/dashboard?error=' + encodeURIComponent('Non autorizzato.'))
  }

  const logo_url = (formData.get('logo_url') || '').toString().trim() || null

  const { error } = await supabase
    .from('impostazioni_app')
    .update({ logo_url, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) {
    redirect('/impostazioni?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/impostazioni')
  revalidatePath('/', 'layout') // ricarica header con nuovo logo
}
