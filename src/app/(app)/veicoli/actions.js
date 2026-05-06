'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function readForm(formData) {
  const get = (k) => {
    const v = formData.get(k)
    return v && v.toString().trim() !== '' ? v.toString().trim() : null
  }
  const targa = get('targa')
  return {
    compagnia_id: get('compagnia_id'),
    targa: targa ? targa.toUpperCase().replace(/\s+/g, '') : null,
    modello: get('modello'),
    note: get('note'),
  }
}

function valida(dati) {
  if (!dati.compagnia_id) return 'La compagnia è obbligatoria.'
  if (!dati.targa) return 'La targa è obbligatoria.'
  if (!dati.modello) return 'Il modello è obbligatorio.'
  return null
}

export async function creaVeicolo(formData) {
  const dati = readForm(formData)
  const errore = valida(dati)
  if (errore) {
    redirect('/veicoli/nuovo?error=' + encodeURIComponent(errore))
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('veicoli')
    .insert(dati)
    .select('id')
    .single()

  if (error) {
    redirect('/veicoli/nuovo?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/veicoli')
  redirect(`/veicoli/${data.id}`)
}

export async function aggiornaVeicolo(id, formData) {
  const dati = readForm(formData)
  const errore = valida(dati)
  if (errore) {
    redirect(`/veicoli/${id}?error=` + encodeURIComponent(errore))
  }

  const supabase = await createClient()
  const { error } = await supabase.from('veicoli').update(dati).eq('id', id)

  if (error) {
    redirect(`/veicoli/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/veicoli')
  revalidatePath(`/veicoli/${id}`)
  redirect(`/veicoli/${id}?info=` + encodeURIComponent('Modifiche salvate.'))
}

export async function eliminaVeicolo(formData) {
  const id = formData.get('id')
  const supabase = await createClient()
  const { error } = await supabase.from('veicoli').delete().eq('id', id)

  if (error) {
    redirect(`/veicoli/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/veicoli')
  redirect('/veicoli')
}
