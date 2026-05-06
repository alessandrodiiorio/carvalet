'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function readForm(formData) {
  const get = (k) => {
    const v = formData.get(k)
    return v && v.toString().trim() !== '' ? v.toString().trim() : null
  }
  return {
    nome: get('nome'),
    partita_iva: get('partita_iva'),
    referente: get('referente'),
    email: get('email'),
    telefono: get('telefono'),
    indirizzo: get('indirizzo'),
    note: get('note'),
  }
}

export async function creaCompagnia(formData) {
  const dati = readForm(formData)
  if (!dati.nome) {
    redirect('/compagnie/nuova?error=' + encodeURIComponent('Il nome è obbligatorio.'))
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('compagnie')
    .insert(dati)
    .select('id')
    .single()

  if (error) {
    redirect('/compagnie/nuova?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/compagnie')
  redirect(`/compagnie/${data.id}`)
}

export async function aggiornaCompagnia(id, formData) {
  const dati = readForm(formData)
  if (!dati.nome) {
    redirect(`/compagnie/${id}?error=` + encodeURIComponent('Il nome è obbligatorio.'))
  }

  const supabase = await createClient()
  const { error } = await supabase.from('compagnie').update(dati).eq('id', id)

  if (error) {
    redirect(`/compagnie/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/compagnie')
  revalidatePath(`/compagnie/${id}`)
  redirect(`/compagnie/${id}?info=` + encodeURIComponent('Modifiche salvate.'))
}

export async function eliminaCompagnia(formData) {
  const id = formData.get('id')
  const supabase = await createClient()
  const { error } = await supabase.from('compagnie').delete().eq('id', id)

  if (error) {
    redirect(`/compagnie/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/compagnie')
  redirect('/compagnie')
}
