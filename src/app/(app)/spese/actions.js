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
    data: get('data'),
    importo: get('importo'),
    motivazione: get('motivazione'),
  }
}

function valida({ data, importo, motivazione }) {
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return 'Data non valida.'
  const n = Number(importo?.replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return 'Importo deve essere maggiore di 0.'
  if (!motivazione) return 'Motivazione obbligatoria.'
  return null
}

export async function creaSpesa(formData) {
  const dati = readForm(formData)
  const errore = valida(dati)
  if (errore) {
    redirect('/spese?error=' + encodeURIComponent(errore))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('spese').insert({
    data: dati.data,
    importo: Number(dati.importo.replace(',', '.')),
    motivazione: dati.motivazione,
    creato_da: user?.id ?? null,
  })

  if (error) {
    redirect('/spese?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/spese')
  revalidatePath('/report/utile-netto')
  redirect('/spese?info=' + encodeURIComponent('Spesa registrata.'))
}

export async function eliminaSpesa(formData) {
  const id = formData.get('id')
  if (!id) {
    redirect('/spese?error=' + encodeURIComponent('ID mancante.'))
  }

  const supabase = await createClient()
  const { error } = await supabase.from('spese').delete().eq('id', id)

  if (error) {
    redirect('/spese?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/spese')
  revalidatePath('/report/utile-netto')
  redirect('/spese?info=' + encodeURIComponent('Spesa eliminata.'))
}
