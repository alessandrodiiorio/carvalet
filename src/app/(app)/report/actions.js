'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { inviaEmail, htmlPagina, formatPrezzo } from '@/lib/email'
import {
  boundsGiornoIso,
  boundsMeseIso,
  formatDataLunga,
  formatMeseLungo,
  formatOraIta,
  IVA_RATE,
  calcolaIva,
  totaleLordo,
  oggiItaliaYmd,
  meseItaliaYm,
} from '@/lib/dates'

const TIPO_LABEL = {
  ritiro: 'Ritiro',
  consegna: 'Consegna',
  ritiro_consegna: 'Ritiro + Consegna',
}

async function assertTitolareEmail() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase
    .from('profili')
    .select('ruolo')
    .eq('id', user.id)
    .single()
  if (profilo?.ruolo !== 'titolare') {
    redirect('/movimenti?error=' + encodeURIComponent('Non autorizzato.'))
  }
  if (!user.email) {
    redirect('/report/giornaliero?error=' + encodeURIComponent('Email non disponibile.'))
  }
  const { data: imp } = await supabase
    .from('impostazioni_app')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  return {
    supabase,
    email: user.email,
    logoUrl: imp?.logo_url ?? null,
    anagrafica: imp ?? null,
  }
}

function tabella(headers, rows) {
  const th = headers
    .map(
      (h) =>
        `<th style="text-align:left;padding:6px 8px;background:#f1f5f9;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">${h}</th>`,
    )
    .join('')
  const tr = rows
    .map(
      (r) =>
        `<tr>${r
          .map(
            (c) =>
              `<td style="padding:6px 8px;font-size:13px;border-bottom:1px solid #f1f5f9">${c}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse;margin:8px 0"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`
}

function riepilogoTotali(imponibile, label = 'Totale') {
  const iva = calcolaIva(imponibile)
  const lordo = totaleLordo(imponibile)
  return `
    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      <tr><td style="padding:4px 8px;color:#64748b">Imponibile</td><td style="padding:4px 8px;text-align:right">${formatPrezzo(imponibile)}</td></tr>
      <tr><td style="padding:4px 8px;color:#64748b">IVA ${(IVA_RATE * 100).toFixed(0)}%</td><td style="padding:4px 8px;text-align:right">${formatPrezzo(iva)}</td></tr>
      <tr style="border-top:2px solid #0f172a"><td style="padding:6px 8px;font-weight:bold">${label}</td><td style="padding:6px 8px;text-align:right;font-weight:bold;font-size:16px">${formatPrezzo(lordo)}</td></tr>
    </table>
  `
}

export async function inviaReportGiornaliero(formData) {
  const data =
    (formData.get('data') || '').toString().trim() || oggiItaliaYmd()

  const { supabase, email, logoUrl, anagrafica } = await assertTitolareEmail()
  const { da, a } = boundsGiornoIso(data)

  const [{ data: movimenti }, { data: tariffe }] = await Promise.all([
    supabase
      .from('movimenti')
      .select(`
        id, tipo, stato, data_ora, luogo_ritiro, luogo_consegna,
        veicoli!movimenti_veicolo_id_fkey ( targa, modello, compagnia_id, compagnie ( nome ) ),
        assegnato:profili!movimenti_assegnato_a_fkey ( nome )
      `)
      .gte('data_ora', da)
      .lt('data_ora', a)
      .order('data_ora', { ascending: true }),
    supabase.from('tariffe').select('compagnia_id, tipo, prezzo'),
  ])

  const tariffeIdx = {}
  for (const t of tariffe ?? []) {
    tariffeIdx[`${t.compagnia_id}:${t.tipo}`] = Number(t.prezzo)
  }
  const tariffaDi = (m) => {
    const cid = m.veicoli?.compagnia_id
    if (!cid) return null
    const p = tariffeIdx[`${cid}:${m.tipo}`]
    return Number.isFinite(p) ? p : null
  }

  let imponibile = 0
  const rows = (movimenti ?? []).map((m) => {
    const p = tariffaDi(m)
    if (p != null && m.stato === 'completato') imponibile += p
    return [
      formatOraIta(m.data_ora),
      `<strong>${m.veicoli?.targa ?? '—'}</strong><br><span style="color:#64748b;font-size:11px">${m.veicoli?.compagnie?.nome ?? ''}</span>`,
      TIPO_LABEL[m.tipo] ?? m.tipo,
      m.stato,
      p != null ? formatPrezzo(p) : '—',
    ]
  })

  const tabHtml =
    rows.length > 0
      ? tabella(['Ora', 'Veicolo', 'Tipo', 'Stato', 'Tariffa'], rows)
      : '<p style="color:#94a3b8;font-style:italic">Nessun movimento.</p>'

  const html = htmlPagina(
    `Report giornaliero · ${formatDataLunga(data)}`,
    `<p style="color:#64748b">${movimenti?.length ?? 0} movimenti</p>${tabHtml}${riepilogoTotali(imponibile, 'Totale fatturato')}`,
    logoUrl,
    anagrafica,
  )

  try {
    await inviaEmail({
      to: email,
      subject: `Report giornaliero ${data}`,
      html,
    })
  } catch (e) {
    redirect(
      '/report/giornaliero?error=' +
        encodeURIComponent('Invio fallito: ' + (e?.message ?? e)),
    )
  }

  redirect(
    `/report/giornaliero?data=${data}&info=` +
      encodeURIComponent(`Report inviato a ${email}.`),
  )
}

export async function inviaReportMensile(formData) {
  const mese =
    (formData.get('mese') || '').toString().trim() || meseItaliaYm()

  const { supabase, email, logoUrl, anagrafica } = await assertTitolareEmail()
  const { da, a } = boundsMeseIso(mese)

  const [{ data: movimenti }, { data: tariffe }] = await Promise.all([
    supabase
      .from('movimenti')
      .select(`
        id, tipo, stato,
        veicoli!movimenti_veicolo_id_fkey ( compagnia_id, compagnie ( nome ) )
      `)
      .gte('data_ora', da)
      .lt('data_ora', a),
    supabase.from('tariffe').select('compagnia_id, tipo, prezzo'),
  ])

  const tariffeIdx = {}
  for (const t of tariffe ?? []) {
    tariffeIdx[`${t.compagnia_id}:${t.tipo}`] = Number(t.prezzo)
  }

  const perCompagnia = {}
  let totaleGenerale = 0
  for (const m of movimenti ?? []) {
    if (m.stato !== 'completato') continue
    const cid = m.veicoli?.compagnia_id
    const nome = m.veicoli?.compagnie?.nome ?? '—'
    if (!cid) continue
    const p = tariffeIdx[`${cid}:${m.tipo}`]
    if (!Number.isFinite(p)) continue
    if (!perCompagnia[cid]) perCompagnia[cid] = { nome, totale: 0, count: 0 }
    perCompagnia[cid].totale += p
    perCompagnia[cid].count++
    totaleGenerale += p
  }

  const compagnieArr = Object.values(perCompagnia).sort((a, b) =>
    a.nome.localeCompare(b.nome),
  )
  const rows = compagnieArr.map((c) => [
    c.nome,
    c.count,
    formatPrezzo(c.totale),
    formatPrezzo(calcolaIva(c.totale)),
    `<strong>${formatPrezzo(totaleLordo(c.totale))}</strong>`,
  ])

  const tabHtml =
    rows.length > 0
      ? tabella(['Compagnia', 'Compl.', 'Imponibile', 'IVA', 'Totale'], rows)
      : '<p style="color:#94a3b8;font-style:italic">Nessun movimento completato.</p>'

  const html = htmlPagina(
    `Report mensile · ${formatMeseLungo(mese)}`,
    `${tabHtml}${riepilogoTotali(totaleGenerale, 'Totale generale')}`,
    logoUrl,
    anagrafica,
  )

  try {
    await inviaEmail({ to: email, subject: `Report mensile ${mese}`, html })
  } catch (e) {
    redirect(
      `/report/mensile?mese=${mese}&error=` +
        encodeURIComponent('Invio fallito: ' + (e?.message ?? e)),
    )
  }

  redirect(
    `/report/mensile?mese=${mese}&info=` +
      encodeURIComponent(`Report inviato a ${email}.`),
  )
}

export async function inviaReportUtileNetto(formData) {
  const mese =
    (formData.get('mese') || '').toString().trim() || meseItaliaYm()

  const { supabase, email, logoUrl, anagrafica } = await assertTitolareEmail()
  const { da, a } = boundsMeseIso(mese)
  const [y, m] = mese.split('-').map(Number)
  const primoGiorno = `${mese}-01`
  const ultimoGiorno = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)

  const [{ data: movimenti }, { data: tariffe }, { data: spese }] =
    await Promise.all([
      supabase
        .from('movimenti')
        .select(`
          id, tipo, stato,
          veicoli!movimenti_veicolo_id_fkey ( compagnia_id )
        `)
        .gte('data_ora', da)
        .lt('data_ora', a),
      supabase.from('tariffe').select('compagnia_id, tipo, prezzo'),
      supabase
        .from('spese')
        .select(`id, data, importo, motivazione, creato:profili ( nome )`)
        .gte('data', primoGiorno)
        .lte('data', ultimoGiorno)
        .order('data', { ascending: true }),
    ])

  const tariffeIdx = {}
  for (const t of tariffe ?? []) {
    tariffeIdx[`${t.compagnia_id}:${t.tipo}`] = Number(t.prezzo)
  }

  let imponibile = 0
  for (const mv of movimenti ?? []) {
    if (mv.stato !== 'completato') continue
    const cid = mv.veicoli?.compagnia_id
    if (!cid) continue
    const p = tariffeIdx[`${cid}:${mv.tipo}`]
    if (Number.isFinite(p)) imponibile += p
  }

  const totaleSpese = (spese ?? []).reduce(
    (s, x) => s + Number(x.importo),
    0,
  )
  const iva = calcolaIva(imponibile)
  const lordo = totaleLordo(imponibile)
  const utile = lordo - totaleSpese

  const speseRows = (spese ?? []).map((s) => [
    s.data,
    s.motivazione,
    s.creato?.nome ?? '—',
    `<span style="color:#b91c1c">-${formatPrezzo(Number(s.importo))}</span>`,
  ])
  const speseHtml =
    speseRows.length > 0
      ? tabella(['Data', 'Motivazione', 'Da', 'Importo'], speseRows)
      : '<p style="color:#94a3b8;font-style:italic">Nessuna spesa nel mese.</p>'

  const body = `
    <table style="width:100%;border-collapse:collapse;margin:8px 0">
      <tr><td style="padding:4px 8px;color:#64748b">Imponibile fatturato</td><td style="padding:4px 8px;text-align:right">${formatPrezzo(imponibile)}</td></tr>
      <tr><td style="padding:4px 8px;color:#64748b">+ IVA ${(IVA_RATE * 100).toFixed(0)}%</td><td style="padding:4px 8px;text-align:right">${formatPrezzo(iva)}</td></tr>
      <tr style="border-top:1px solid #e2e8f0"><td style="padding:4px 8px;font-weight:600">= Fatturato lordo</td><td style="padding:4px 8px;text-align:right;font-weight:600">${formatPrezzo(lordo)}</td></tr>
      <tr><td style="padding:4px 8px;color:#b91c1c">− Spese</td><td style="padding:4px 8px;text-align:right;color:#b91c1c">-${formatPrezzo(totaleSpese)}</td></tr>
      <tr style="border-top:2px solid #0f172a"><td style="padding:6px 8px;font-weight:bold">Utile (lordo)</td><td style="padding:6px 8px;text-align:right;font-weight:bold;font-size:18px;color:${utile >= 0 ? '#3730a3' : '#b91c1c'}">${formatPrezzo(utile)}</td></tr>
    </table>
    <h3 style="margin-top:24px;font-size:14px">Dettaglio spese</h3>
    ${speseHtml}
  `

  const html = htmlPagina(
    `Utile netto · ${formatMeseLungo(mese)}`,
    body,
    logoUrl,
    anagrafica,
  )

  try {
    await inviaEmail({
      to: email,
      subject: `Report utile netto ${mese}`,
      html,
    })
  } catch (e) {
    redirect(
      `/report/utile-netto?mese=${mese}&error=` +
        encodeURIComponent('Invio fallito: ' + (e?.message ?? e)),
    )
  }

  redirect(
    `/report/utile-netto?mese=${mese}&info=` +
      encodeURIComponent(`Report inviato a ${email}.`),
  )
}
