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

async function risolviVeicolo(supabase, formData, slot = 1) {
  const prefisso = slot === 2 ? 'nuovo_consegna_' : 'nuovo_'
  const fieldId = slot === 2 ? 'veicolo_consegna_id' : 'veicolo_id'
  const fieldModalita = slot === 2 ? 'modalita_veicolo_2' : 'modalita_veicolo'
  const fieldTarga = slot === 2 ? 'nuova_consegna_targa' : 'nuova_targa'
  const fieldCompagnia = `${prefisso}compagnia_id`
  const fieldModello = `${prefisso}modello`

  const modalita = formData.get(fieldModalita)

  if (modalita === 'esistente') {
    const veicolo_id = get(formData, fieldId)
    if (!veicolo_id) return { errore: 'Seleziona un veicolo.' }
    return { veicolo_id }
  }

  const compagnia_id = get(formData, fieldCompagnia)
  const targaRaw = get(formData, fieldTarga)
  const modello = get(formData, fieldModello)
  const foto_targa_url = get(formData, `${fieldTarga}_foto`)

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

  if (esistente) {
    if (foto_targa_url) {
      await supabase
        .from('veicoli')
        .update({ foto_targa_url })
        .eq('id', esistente.id)
    }
    return { veicolo_id: esistente.id }
  }

  const { data: creato, error } = await supabase
    .from('veicoli')
    .insert({ compagnia_id, targa, modello, foto_targa_url })
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

  if (!tipo || !TIPI.includes(tipo)) return { errore: 'Tipo movimento non valido.' }
  if (!STATI.includes(stato)) return { errore: 'Stato non valido.' }
  if (!data_ora) return { errore: 'Data e ora obbligatorie.' }

  return {
    dati: { tipo, stato, data_ora, luogo_ritiro, luogo_consegna, note, assegnato_a },
  }
}

function ha2Veicoli(formData) {
  if (formData.get('tipo') !== 'ritiro_consegna') return false
  const modalita2 = formData.get('modalita_veicolo_2')
  if (modalita2 === 'nuovo') return true
  const id = (formData.get('veicolo_consegna_id') || '').toString().trim()
  return id.length > 0
}

export async function creaMovimento(formData) {
  const base = leggiMovimentoBase(formData)
  if (base.errore) {
    redirect('/movimenti/nuovo?error=' + encodeURIComponent(base.errore))
  }

  const supabase = await createClient()

  const veicolo = await risolviVeicolo(supabase, formData, 1)
  if (veicolo.errore) {
    redirect('/movimenti/nuovo?error=' + encodeURIComponent(veicolo.errore))
  }

  let veicolo_consegna_id = null
  if (ha2Veicoli(formData)) {
    const v2 = await risolviVeicolo(supabase, formData, 2)
    if (v2.errore) {
      redirect('/movimenti/nuovo?error=' + encodeURIComponent(v2.errore))
    }
    veicolo_consegna_id = v2.veicolo_id
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('movimenti')
    .insert({
      ...base.dati,
      veicolo_id: veicolo.veicolo_id,
      veicolo_consegna_id,
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

  const veicolo_consegna_id =
    base.dati.tipo === 'ritiro_consegna'
      ? get(formData, 'veicolo_consegna_id')
      : null

  const supabase = await createClient()
  const { error } = await supabase
    .from('movimenti')
    .update({ ...base.dati, veicolo_id, veicolo_consegna_id })
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
