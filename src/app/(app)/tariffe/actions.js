'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const TIPI = ['ritiro', 'consegna', 'ritiro_consegna']

function parsePrezzo(v) {
  if (v == null) return null
  const s = String(v).trim()
  if (s === '') return null
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

export async function salvaTariffe(formData) {
  const compagnia_id = formData.get('compagnia_id')?.toString()
  if (!compagnia_id) {
    redirect('/tariffe?error=' + encodeURIComponent('Compagnia non specificata.'))
  }

  const supabase = await createClient()

  const upserts = []
  const deletes = []

  for (const tipo of TIPI) {
    const raw = formData.get(`prezzo_${tipo}`)
    const prezzo = parsePrezzo(raw)
    if (prezzo === null) {
      deletes.push(tipo)
    } else {
      upserts.push({ compagnia_id, tipo, prezzo })
    }
  }

  if (upserts.length > 0) {
    const { error } = await supabase
      .from('tariffe')
      .upsert(upserts, { onConflict: 'compagnia_id,tipo' })
    if (error) {
      redirect('/tariffe?error=' + encodeURIComponent(error.message))
    }
  }

  if (deletes.length > 0) {
    const { error } = await supabase
      .from('tariffe')
      .delete()
      .eq('compagnia_id', compagnia_id)
      .in('tipo', deletes)
    if (error) {
      redirect('/tariffe?error=' + encodeURIComponent(error.message))
    }
  }

  revalidatePath('/tariffe')
  redirect('/tariffe?info=' + encodeURIComponent('Tariffe salvate.'))
}
