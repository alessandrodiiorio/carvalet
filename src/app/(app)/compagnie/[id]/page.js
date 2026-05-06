import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getUtente, isTitolare } from '@/lib/auth'
import DeleteButton from '@/components/DeleteButton'
import { aggiornaCompagnia, eliminaCompagnia } from '../actions'
import CompagniaForm from '../CompagniaForm'

export default async function CompagniaPage({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams

  const { profilo, supabase } = await getUtente()

  const { data: compagnia, error: errLoad } = await supabase
    .from('compagnie')
    .select('*')
    .eq('id', id)
    .single()

  if (errLoad || !compagnia) notFound()

  const titolare = isTitolare(profilo)
  const aggiornaConId = aggiornaCompagnia.bind(null, id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{compagnia.nome}</h1>
        <Link href="/compagnie" className="text-sm text-slate-600 underline">
          Indietro
        </Link>
      </div>

      {sp?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {sp.error}
        </div>
      )}
      {sp?.info && (
        <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm p-3">
          {sp.info}
        </div>
      )}

      <div className="rounded-2xl bg-white shadow p-5">
        {titolare ? (
          <CompagniaForm
            action={aggiornaConId}
            compagnia={compagnia}
            submitLabel="Salva modifiche"
          />
        ) : (
          <ReadOnlyView compagnia={compagnia} />
        )}
      </div>

      {titolare && (
        <div className="rounded-2xl bg-white shadow p-5 border border-red-100">
          <h2 className="font-semibold text-red-700 mb-2">Zona pericolo</h2>
          <p className="text-sm text-slate-600 mb-3">
            L&apos;eliminazione è permanente. Non sarà possibile se ci sono veicoli associati.
          </p>
          <form action={eliminaCompagnia}>
            <input type="hidden" name="id" value={id} />
            <DeleteButton message="Eliminare definitivamente questa compagnia?">
              Elimina compagnia
            </DeleteButton>
          </form>
        </div>
      )}
    </div>
  )
}

function ReadOnlyView({ compagnia }) {
  const rows = [
    ['Partita IVA', compagnia.partita_iva],
    ['Referente', compagnia.referente],
    ['Email', compagnia.email],
    ['Telefono', compagnia.telefono],
    ['Indirizzo', compagnia.indirizzo],
    ['Note', compagnia.note],
  ].filter(([, v]) => v)

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Nessun dettaglio aggiuntivo.</p>
  }

  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-slate-500">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
