import { redirect } from 'next/navigation'
import { getUtente, isTitolare, isCompagnia } from '@/lib/auth'
import { formatPrezzo, oggiItaliaYmd } from '@/lib/dates'
import DeleteButton from '@/components/DeleteButton'
import { creaSpesa, eliminaSpesa } from './actions'

export const metadata = {
  title: 'Spese',
}

function formatDataIt(ymd) {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function SpesePage({ searchParams }) {
  const { profilo, user, supabase } = await getUtente()
  if (isCompagnia(profilo)) redirect('/movimenti')
  const titolare = isTitolare(profilo)
  const params = await searchParams
  const error = params?.error
  const info = params?.info

  const { data: spese, error: loadError } = await supabase
    .from('spese')
    .select(`
      id, data, importo, motivazione, created_at, creato_da,
      creato:profili ( nome )
    `)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  const totale = (spese ?? []).reduce((s, x) => s + Number(x.importo), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Spese</h1>
        <div className="text-right">
          <p className="text-[10px] uppercase text-slate-500 font-semibold">
            Totale
          </p>
          <p className="font-bold">{formatPrezzo(totale)}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3">
          {info}
        </div>
      )}
      {loadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {loadError.message}
        </div>
      )}

      <form
        action={creaSpesa}
        className="rounded-2xl bg-white shadow p-4 space-y-3"
      >
        <p className="font-semibold text-sm">Nuova spesa</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="data" className="block text-xs font-medium mb-1">
              Data *
            </label>
            <input
              id="data"
              name="data"
              type="date"
              defaultValue={oggiItaliaYmd()}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label htmlFor="importo" className="block text-xs font-medium mb-1">
              Importo (€) *
            </label>
            <input
              id="importo"
              name="importo"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0,00"
              inputMode="decimal"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>
        <div>
          <label htmlFor="motivazione" className="block text-xs font-medium mb-1">
            Motivazione *
          </label>
          <input
            id="motivazione"
            name="motivazione"
            type="text"
            required
            placeholder="Es. Carburante, autostrada, pranzo..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-slate-900 text-white font-semibold py-2.5 hover:bg-slate-800 transition-colors"
        >
          Registra spesa
        </button>
      </form>

      {spese?.length === 0 && (
        <div className="rounded-2xl bg-white shadow p-6 text-center text-sm text-slate-500">
          Nessuna spesa registrata.
        </div>
      )}

      <ul className="space-y-2">
        {spese?.map((s) => {
          const proprio = s.creato?.nome ?? '—'
          return (
            <li
              key={s.id}
              className="rounded-2xl bg-white shadow p-3 flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-mono text-slate-500">
                    {formatDataIt(s.data)}
                  </p>
                  <p className="font-bold text-red-700">
                    -{formatPrezzo(Number(s.importo))}
                  </p>
                </div>
                <p className="font-medium mt-0.5 truncate">{s.motivazione}</p>
                {titolare && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {proprio}
                  </p>
                )}
              </div>
              <form action={eliminaSpesa}>
                <input type="hidden" name="id" value={s.id} />
                <DeleteButton message="Eliminare questa spesa?">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                </DeleteButton>
              </form>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
