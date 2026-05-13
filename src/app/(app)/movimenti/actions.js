'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const TIPI = ['ritiro', 'consegna', 'ritiro_consegna']
const STATI = ['programmato', 'completato', 'annullato']

function get(formData, k) {
  const v = formData.get(k)
  return v && v.toString().trim() !== '' ? v.toString().trim() : null
}

async function risolviVeicolo(supabase, formData) {
  const modalita = formData.get('modalita_veicolo')

  if (modalita === 'esistente') {
    const veicolo_id = get(formData, 'veicolo_id')
    if (!veicolo_id) return { errore: 'Seleziona un veicolo.' }
    return { veicolo_id }
  }

  // modalita === 'nuovo'
  const compagnia_id = get(formData, 'nuovo_compagnia_id')
  const targaRaw = get(formData, 'nuova_targa')
  const modello = get(formData, 'nuovo_modello')

  if (!compagnia_id || !targaRaw || !modello) {
    return { errore: 'Per creare un nuovo veicolo servono compagnia, targa e modello.' }
  }
  const targa = targaRaw.toUpperCase().replace(/\s+/g, '')

  const { data: esistente } = await supabase
    .from('veicoli')
    .select('id, compagnia_id')
    .eq('targa', targa)
    .eq('compagnia_id', compagnia_id)
    .maybeSingle()

  if (esistente) return { veicolo_id: esistente.id }

  const { data: creato, error } = await supabase
    .from('veicoli')
    .insert({ compagnia_id, targa, modello })
    .select('id')
    .single()

  if (error) return { errore: error.message }
  return { veicolo_id: creato.id }
}

function leggiMovimentoBase(formData) {
  const tipo = get(formData, 'tipo')
  const stato = get(formData, 'stato') ?? 'programmato'
  const data_ora = get(formData, 'data_ora')
  const luogo_ritiro = get(formData, 'luogo_ritiro')
  const luogo_consegna = get(formData, 'luogo_consegna')
  const note = get(formData, 'note')
  const assegnato_a = get(formData, 'assegnato_a')
  const veicolo_consegna_id =
    tipo === 'ritiro_consegna' ? get(formData, 'veicolo_consegna_id') : null

  if (!tipo || !TIPI.includes(tipo)) return { errore: 'Tipo movimento non valido.' }
  if (!STATI.includes(stato)) return { errore: 'Stato non valido.' }
  if (!data_ora) return { errore: 'Data e ora obbligatorie.' }

  return {
    dati: {
      tipo,
      stato,
      data_ora,
      luogo_ritiro,
      luogo_consegna,
      note,
      assegnato_a,
      veicolo_consegna_id,
    },
  }
}

export async function creaMovimento(formData) {
  const base = leggiMovimentoBase(formData)
  if (base.errore) {
    redirect('/movimenti/nuovo?error=' + encodeURIComponent(base.errore))
  }

  const supabase = await createClient()

  const veicolo = await risolviVeicolo(supabase, formData)
  if (veicolo.errore) {
    redirect('/movimenti/nuovo?error=' + encodeURIComponent(veicolo.errore))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('movimenti')
    .insert({
      ...base.dati,
      veicolo_id: veicolo.veicolo_id,
      creato_da: user?.id ?? null,
    })
    .select('id')
    .single()

  if (error) {
    redirect('/movimenti/nuovo?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/movimenti')
  revalidatePath('/dashboard')
  redirect(`/movimenti/${data.id}`)
}

export async function aggiornaMovimento(id, formData) {
  const base = leggiMovimentoBase(formData)
  if (base.errore) {
    redirect(`/movimenti/${id}?error=` + encodeURIComponent(base.errore))
  }

  const veicolo_id = get(formData, 'veicolo_id')
  if (!veicolo_id) {
    redirect(`/movimenti/${id}?error=` + encodeURIComponent('Seleziona un veicolo.'))
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('movimenti')
    .update({ ...base.dati, veicolo_id })
    .eq('id', id)

  if (error) {
    redirect(`/movimenti/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/movimenti')
  revalidatePath(`/movimenti/${id}`)
  revalidatePath('/dashboard')
  redirect(`/movimenti/${id}?info=` + encodeURIComponent('Modifiche salvate.'))
}

export async function aggiornaStatoMovimento(formData) {
  const id = get(formData, 'id')
  const stato = get(formData, 'stato')

  if (!id || !stato || !STATI.includes(stato)) {
    redirect(`/movimenti/${id ?? ''}?error=` + encodeURIComponent('Stato non valido.'))
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('movimenti')
    .update({ stato })
    .eq('id', id)

  if (error) {
    redirect(`/movimenti/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/movimenti')
  revalidatePath(`/movimenti/${id}`)
  revalidatePath('/dashboard')
  redirect(`/movimenti/${id}?info=` + encodeURIComponent('Stato aggiornato.'))
}

export async function iniziaTracking(formData) {
  const id = get(formData, 'id')
  if (!id) {
    redirect('/movimenti?error=' + encodeURIComponent('ID mancante.'))
  }

  const luogo_ritiro = get(formData, 'luogo_ritiro')
  const ora = new Date().toISOString()

  const update = {
    inizio_at: ora,
    ritiro_effettivo_at: ora,
    fine_at: null,
    consegna_effettivo_at: null,
    traccia: null,
    distanza_km: null,
  }
  if (luogo_ritiro) update.luogo_ritiro = luogo_ritiro

  const supabase = await createClient()
  const { error } = await supabase.from('movimenti').update(update).eq('id', id)

  if (error) {
    redirect(`/movimenti/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath(`/movimenti/${id}`)
  revalidatePath('/movimenti')
  redirect(`/movimenti/${id}?info=` + encodeURIComponent('Tracking avviato.'))
}

export async function terminaTracking(formData) {
  const id = get(formData, 'id')
  const tracciaRaw = formData.get('traccia')
  const distanzaRaw = formData.get('distanza_km')
  const luogo_consegna = get(formData, 'luogo_consegna')

  if (!id) {
    redirect('/movimenti?error=' + encodeURIComponent('ID mancante.'))
  }

  let traccia = null
  try {
    traccia = tracciaRaw ? JSON.parse(tracciaRaw.toString()) : null
  } catch {
    traccia = null
  }

  const distanza_km = distanzaRaw ? Number(distanzaRaw) : null
  const ora = new Date().toISOString()

  const update = {
    fine_at: ora,
    consegna_effettivo_at: ora,
    traccia,
    distanza_km: Number.isFinite(distanza_km) ? distanza_km : null,
    stato: 'completato',
  }
  if (luogo_consegna) update.luogo_consegna = luogo_consegna

  const supabase = await createClient()
  const { error } = await supabase.from('movimenti').update(update).eq('id', id)

  if (error) {
    redirect(`/movimenti/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath(`/movimenti/${id}`)
  revalidatePath('/movimenti')
  revalidatePath('/dashboard')
  redirect(`/movimenti/${id}?info=` + encodeURIComponent('Trasfer completato.'))
}

export async function annullaTracking(formData) {
  const id = get(formData, 'id')
  if (!id) {
    redirect('/movimenti?error=' + encodeURIComponent('ID mancante.'))
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('movimenti')
    .update({
      inizio_at: null,
      fine_at: null,
      ritiro_effettivo_at: null,
      consegna_effettivo_at: null,
      traccia: null,
      distanza_km: null,
    })
    .eq('id', id)

  if (error) {
    redirect(`/movimenti/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath(`/movimenti/${id}`)
  redirect(`/movimenti/${id}?info=` + encodeURIComponent('Tracking annullato.'))
}

export async function eliminaMovimento(formData) {
  const id = formData.get('id')
  const supabase = await createClient()
  const { error } = await supabase.from('movimenti').delete().eq('id', id)

  if (error) {
    redirect(`/movimenti/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/movimenti')
  revalidatePath('/dashboard')
  redirect('/movimenti')
}
