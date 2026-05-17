'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function readAnagraficaForm(formData) {
  const get = (k) => {
    const v = formData.get(k)
    return v && v.toString().trim() !== '' ? v.toString().trim() : null
  }
  return {
    nome_azienda: get('nome_azienda'),
    ragione_sociale: get('ragione_sociale'),
    partita_iva: get('partita_iva'),
    codice_fiscale: get('codice_fiscale'),
    indirizzo: get('indirizzo'),
    citta: get('citta'),
    cap: get('cap'),
    provincia: get('provincia'),
    telefono: get('telefono'),
    email_contatto: get('email_contatto'),
  }
}

export async function salvaAnagrafica(formData) {
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

  const dati = readAnagraficaForm(formData)
  const { error } = await supabase
    .from('impostazioni_app')
    .update({ ...dati, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) {
    redirect('/impostazioni?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/impostazioni')
  revalidatePath('/', 'layout')
  redirect('/impostazioni?info=' + encodeURIComponent('Anagrafica salvata.'))
}

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
