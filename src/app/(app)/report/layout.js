import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUtente, isTitolare, isCompagnia } from '@/lib/auth'

export default async function ReportLayout({ children }) {
  const { profilo, supabase } = await getUtente()
  const titolare = isTitolare(profilo)
  const compagnia = isCompagnia(profilo)
  if (!titolare && !compagnia) redirect('/movimenti')

  const { data: imp } = await supabase
    .from('impostazioni_app')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold print:hidden">Report</h1>
      <nav className="flex gap-2 print:hidden flex-wrap">
        <TabLink href="/report/giornaliero">Giornaliero</TabLink>
        <TabLink href="/report/mensile">Mensile</TabLink>
        {titolare && (
          <TabLink href="/report/utile-netto">Utile netto</TabLink>
        )}
      </nav>

      <AziendaHeader imp={imp} />

      {children}
    </div>
  )
}

function AziendaHeader({ imp }) {
  if (!imp || !imp.nome_azienda) return null

  const indirizzo = [
    imp.indirizzo,
    [imp.cap, imp.citta, imp.provincia ? `(${imp.provincia})` : null]
      .filter(Boolean)
      .join(' '),
  ]
    .filter(Boolean)
    .join(' · ')

  const pivaFc = [
    imp.partita_iva ? `P.IVA ${imp.partita_iva}` : null,
    imp.codice_fiscale ? `CF ${imp.codice_fiscale}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const contatti = [imp.telefono, imp.email_contatto].filter(Boolean).join(' · ')

  return (
    <div className="rounded-2xl bg-white shadow p-5 flex items-center gap-4 print:shadow-none print:p-3 print:border print:border-slate-200">
      {imp.logo_url && (
        <img
          src={imp.logo_url}
          alt="Logo"
          className="max-h-16 max-w-[140px] object-contain shrink-0"
        />
      )}
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold text-base">{imp.nome_azienda}</p>
        {imp.ragione_sociale && (
          <p className="text-slate-600 text-xs">{imp.ragione_sociale}</p>
        )}
        {indirizzo && <p className="text-slate-500 text-xs">{indirizzo}</p>}
        {pivaFc && <p className="text-slate-500 text-xs">{pivaFc}</p>}
        {contatti && <p className="text-slate-500 text-xs">{contatti}</p>}
      </div>
    </div>
  )
}

function TabLink({ href, children }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-300 bg-white text-sm font-medium px-3 py-2 hover:bg-slate-50"
    >
      {children}
    </Link>
  )
}
