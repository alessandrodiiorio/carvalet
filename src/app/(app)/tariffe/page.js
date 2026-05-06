import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUtente, isTitolare } from '@/lib/auth'
import { salvaTariffe } from './actions'

const TIPI = [
  { value: 'ritiro', label: 'Ritiro' },
  { value: 'consegna', label: 'Consegna' },
  { value: 'ritiro_consegna', label: 'Ritiro + Consegna' },
]

export default async function TariffePage({ searchParams }) {
  const { profilo, supabase } = await getUtente()
  if (!isTitolare(profilo)) redirect('/dashboard')

  const sp = await searchParams

  const [{ data: compagnie }, { data: tariffe }] = await Promise.all([
    supabase.from('compagnie').select('id, nome').order('nome', { ascending: true }),
    supabase.from('tariffe').select('compagnia_id, tipo, prezzo'),
  ])

  const mappa = {}
  for (const t of tariffe ?? []) {
    if (!mappa[t.compagnia_id]) mappa[t.compagnia_id] = {}
    mappa[t.compagnia_id][t.tipo] = t.prezzo
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tariffario</h1>
        <Link href="/compagnie" className="text-sm text-slate-600 underline">
          Compagnie
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

      <p className="text-sm text-slate-600">
        Imposta il prezzo per tipo di movimento. Lascia vuoto per non applicare alcuna tariffa.
      </p>

      {compagnie?.length === 0 && (
        <div className="rounded-2xl bg-white shadow p-6 text-center text-sm text-slate-500">
          Nessuna compagnia.{' '}
          <Link href="/compagnie/nuova" className="underline font-medium">
            Aggiungine una
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {compagnie?.map((c) => (
          <CompagniaTariffa key={c.id} compagnia={c} prezzi={mappa[c.id] ?? {}} />
        ))}
      </div>
    </div>
  )
}

function CompagniaTariffa({ compagnia, prezzi }) {
  return (
    <form
      action={salvaTariffe}
      className="rounded-2xl bg-white shadow p-4 space-y-3"
    >
      <input type="hidden" name="compagnia_id" value={compagnia.id} />
      <h2 className="font-semibold">{compagnia.nome}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TIPI.map((t) => (
          <div key={t.value}>
            <label
              htmlFor={`prezzo_${t.value}_${compagnia.id}`}
              className="block text-xs text-slate-500 mb-1"
            >
              {t.label}
            </label>
            <div className="relative">
              <input
                id={`prezzo_${t.value}_${compagnia.id}`}
                name={`prezzo_${t.value}`}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={prezzi[t.value] ?? ''}
                placeholder="—"
                className="w-full rounded-lg border border-slate-300 pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                €
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800"
        >
          Salva
        </button>
      </div>
    </form>
  )
}
