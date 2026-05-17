// Server-only: invio email via Resend.
// Richiede env: RESEND_API_KEY. Opzionale: EMAIL_FROM (default onboarding@resend.dev).

import { Resend } from 'resend'

let _resend = null

export function getResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    throw new Error(
      'RESEND_API_KEY non configurata. Aggiungila a env Vercel + .env.local.',
    )
  }
  if (!_resend) _resend = new Resend(key)
  return _resend
}

const FROM_DEFAULT =
  process.env.EMAIL_FROM || 'Car Valet <onboarding@resend.dev>'

export async function inviaEmail({ to, subject, html, from }) {
  const resend = getResendClient()
  const result = await resend.emails.send({
    from: from || FROM_DEFAULT,
    to,
    subject,
    html,
  })
  if (result?.error) throw new Error(result.error.message || 'Send fallito')
  return result?.data
}

// Helpers HTML per email report
export function htmlPagina(titolo, body, logoUrl = null, anagrafica = null) {
  const logo = logoUrl
    ? `<div style="text-align:center;margin-bottom:16px"><img src="${logoUrl}" alt="Logo" style="max-height:60px;max-width:200px"></div>`
    : ''
  const nome = anagrafica?.nome_azienda || 'Car Valet'
  const indirizzoParts = [
    anagrafica?.indirizzo,
    [anagrafica?.cap, anagrafica?.citta, anagrafica?.provincia ? `(${anagrafica.provincia})` : null]
      .filter(Boolean)
      .join(' '),
  ].filter(Boolean)
  const pivaFc = [
    anagrafica?.partita_iva ? `P.IVA ${anagrafica.partita_iva}` : null,
    anagrafica?.codice_fiscale ? `CF ${anagrafica.codice_fiscale}` : null,
  ].filter(Boolean)
  const contatti = [anagrafica?.telefono, anagrafica?.email_contatto].filter(Boolean)
  const footerLines = [
    `<strong>${nome}</strong>`,
    indirizzoParts.length > 0 ? indirizzoParts.join(' · ') : null,
    pivaFc.length > 0 ? pivaFc.join(' · ') : null,
    contatti.length > 0 ? contatti.join(' · ') : null,
  ].filter(Boolean).join('<br>')

  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><title>${titolo}</title></head>
<body style="margin:0;padding:24px;background:#f8fafc;color:#0f172a;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:720px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    ${logo}
    <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">${titolo}</h1>
    ${body}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;line-height:1.5">
      ${footerLines}
    </div>
  </div>
</body></html>`
}

export function formatPrezzo(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n))
}
