'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function cambiaRuolo(formData) {
  const id = formData.get('id')
  const ruolo = formData.get('ruolo')

  if (!id || !['titolare', 'collaboratore'].includes(ruolo)) {
    redirect('/collaboratori?error=' + encodeURIComponent('Dati non validi.'))
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (id === user?.id && ruolo !== 'titolare') {
    redirect(
      '/collaboratori?error=' +
        encodeURIComponent('Non puoi declassare te stesso. Promuovi prima un altro titolare.'),
    )
  }

  const { error } = await supabase
    .from('profili')
    .update({ ruolo })
    .eq('id', id)

  if (error) {
    redirect('/collaboratori?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/collaboratori')
  redirect('/collaboratori?info=' + encodeURIComponent('Ruolo aggiornato.'))
}
