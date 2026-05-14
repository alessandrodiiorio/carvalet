import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getUtente, isTitolare } from '@/lib/auth'
import DeleteButton from '@/components/DeleteButton'
import { aggiornaVeicolo, eliminaVeicolo } from '../actions'
import VeicoloForm from '../VeicoloForm'

export default async function VeicoloPage({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams

  const { profilo, supabase } = await getUtente()

  const [{ data: veicolo, error: errLoad }, { data: compagnie }] = await Promise.all([
    supabase
      .from('veicoli')
      .select('*, compagnie ( id, nome )')
      .eq('id', id)
      .single(),
    supabase.from('compagnie').select('id, nome').order('nome', { ascending: true }),
  ])

  if (errLoad || !veicolo) notFound()

  const titolare = isTitolare(profilo)
  const aggiornaConId = aggiornaVeicolo.bind(null, id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-wide">{veicolo.targa}</h1>
        <Link href="/veicoli" className="text-sm text-slate-600 underline">
          Indietro
        </Link>
      </div>

      <p className="text-sm text-slate-500">
        {veicolo.modello} · {veicolo.compagnie?.nome ?? '—'}
      </p>

      {veicolo.foto_targa_url && (
        <a
          href={veicolo.foto_targa_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl overflow-hidden bg-white shadow"
        >
          <img
            src={veicolo.foto_targa_url}
            alt={`Foto targa ${veicolo.targa}`}
            className="w-full max-h-64 object-contain bg-slate-100"
          />
        </a>
      )}

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
          <VeicoloForm
            action={aggiornaConId}
            veicolo={veicolo}
            compagnie={compagnie ?? []}
            submitLabel="Salva modifiche"
          />
        ) : (
          <ReadOnlyView veicolo={veicolo} />
        )}
      </div>

      {titolare && (
        <div className="rounded-2xl bg-white shadow p-5 border border-red-100">
          <h2 className="font-semibold text-red-700 mb-2">Zona pericolo</h2>
          <p className="text-sm text-slate-600 mb-3">
            L&apos;eliminazione è permanente. Non sarà possibile se ci sono movimenti associati.
          </p>
          <form action={eliminaVeicolo}>
            <input type="hidden" name="id" value={id} />
            <DeleteButton message="Eliminare definitivamente questo veicolo?">
              Elimina veicolo
            </DeleteButton>
          </form>
        </div>
      )}
    </div>
  )
}

function ReadOnlyView({ veicolo }) {
  const rows = [
    ['Targa', veicolo.targa],
    ['Modello', veicolo.modello],
    ['Compagnia', veicolo.compagnie?.nome],
    ['Note', veicolo.note],
  ].filter(([, v]) => v)

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
