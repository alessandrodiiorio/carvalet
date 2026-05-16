'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'

async function assertTitolare() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  const { data: profilo } = await supabase
    .from('profili')
    .select('ruolo')
    .eq('id', user.id)
    .single()
  if (profilo?.ruolo !== 'titolare') {
    redirect('/dashboard?error=' + encodeURIComponent('Non autorizzato.'))
  }
  return { supabase, user }
}

export async function creaCollaboratore(formData) {
  await assertTitolare()

  const nome = (formData.get('nome') || '').toString().trim()
  const email = (formData.get('email') || '').toString().trim().toLowerCase()
  const password = (formData.get('password') || '').toString()
  const ruolo = (formData.get('ruolo') || 'collaboratore').toString()
  const compagnia_id = (formData.get('compagnia_id') || '').toString().trim() || null

  if (!nome) {
    redirect('/collaboratori?error=' + encodeURIComponent('Nome obbligatorio.'))
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    redirect('/collaboratori?error=' + encodeURIComponent('Email non valida.'))
  }
  if (!password || password.length < 8) {
    redirect(
      '/collaboratori?error=' +
        encodeURIComponent('Password obbligatoria (min 8 caratteri).'),
    )
  }
  if (!['titolare', 'collaboratore', 'compagnia'].includes(ruolo)) {
    redirect('/collaboratori?error=' + encodeURIComponent('Ruolo non valido.'))
  }
  if (ruolo === 'compagnia' && !compagnia_id) {
    redirect(
      '/collaboratori?error=' +
        encodeURIComponent('Per ruolo "compagnia" serve selezionare la compagnia.'),
    )
  }

  let admin
  try {
    admin = getAdminClient()
  } catch (e) {
    redirect('/collaboratori?error=' + encodeURIComponent(e.message))
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome },
  })

  if (error) {
    redirect('/collaboratori?error=' + encodeURIComponent(error.message))
  }

  const nuovoId = data?.user?.id
  if (!nuovoId) {
    redirect(
      '/collaboratori?error=' + encodeURIComponent('Creazione utente fallita.'),
    )
  }

  // Trigger handle_new_user crea profilo con ruolo default 'collaboratore'.
  // Aggiorno nome, ruolo e compagnia_id se richiesto.
  const update = { nome, ruolo }
  if (ruolo === 'compagnia') update.compagnia_id = compagnia_id
  else update.compagnia_id = null

  const { error: upErr } = await admin
    .from('profili')
    .update(update)
    .eq('id', nuovoId)

  if (upErr) {
    redirect(
      '/collaboratori?error=' +
        encodeURIComponent('Utente creato ma update profilo fallito: ' + upErr.message),
    )
  }

  revalidatePath('/collaboratori')
  redirect(
    '/collaboratori?info=' +
      encodeURIComponent(`Utente "${nome}" creato come ${ruolo}.`),
  )
}

export async function cambiaRuolo(formData) {
  const id = formData.get('id')
  const ruolo = formData.get('ruolo')

  if (!id || !['titolare', 'collaboratore', 'compagnia'].includes(ruolo)) {
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
