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
  const compagnieIds = formData
    .getAll('compagnie_ids')
    .map((v) => v.toString().trim())
    .filter(Boolean)

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
  if (ruolo === 'compagnia' && compagnieIds.length === 0) {
    redirect(
      '/collaboratori?error=' +
        encodeURIComponent('Per ruolo "compagnia" seleziona almeno una compagnia.'),
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
  // Aggiorno nome, ruolo. Compagnia_id legacy null (uso junction).
  const update = { nome, ruolo, compagnia_id: null }

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

  // Junction profilo_compagnie se ruolo compagnia
  if (ruolo === 'compagnia' && compagnieIds.length > 0) {
    const rows = compagnieIds.map((cid) => ({
      profilo_id: nuovoId,
      compagnia_id: cid,
    }))
    const { error: jErr } = await admin.from('profilo_compagnie').insert(rows)
    if (jErr) {
      redirect(
        '/collaboratori?error=' +
          encodeURIComponent(
            'Utente creato ma associazione compagnie fallita: ' + jErr.message,
          ),
      )
    }
  }

  revalidatePath('/collaboratori')
  redirect(
    '/collaboratori?info=' +
      encodeURIComponent(`Utente "${nome}" creato come ${ruolo}.`),
  )
}

export async function aggiornaCompagnieAssociate(formData) {
  await assertTitolare()
  const profilo_id = formData.get('profilo_id')?.toString()
  const compagnieIds = formData
    .getAll('compagnie_ids')
    .map((v) => v.toString().trim())
    .filter(Boolean)

  if (!profilo_id) {
    redirect(
      '/collaboratori?error=' + encodeURIComponent('Profilo id mancante.'),
    )
  }

  const admin = getAdminClient()

  const { error: delErr } = await admin
    .from('profilo_compagnie')
    .delete()
    .eq('profilo_id', profilo_id)
  if (delErr) {
    redirect('/collaboratori?error=' + encodeURIComponent(delErr.message))
  }

  if (compagnieIds.length > 0) {
    const rows = compagnieIds.map((cid) => ({
      profilo_id,
      compagnia_id: cid,
    }))
    const { error: insErr } = await admin.from('profilo_compagnie').insert(rows)
    if (insErr) {
      redirect('/collaboratori?error=' + encodeURIComponent(insErr.message))
    }
  }

  revalidatePath('/collaboratori')
  redirect(
    '/collaboratori?info=' + encodeURIComponent('Compagnie associate aggiornate.'),
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
