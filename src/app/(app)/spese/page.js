import { redirect } from 'next/navigation'
import { getUtente, isTitolare, isCompagnia } from '@/lib/auth'
import {
  formatPrezzo,
  oggiItaliaYmd,
  meseItaliaYm,
  formatMeseLungo,
} from '@/lib/dates'
import DeleteButton from '@/components/DeleteButton'
import SpesaForm from './SpesaForm'
import { creaSpesa, eliminaSpesa } from './actions'

function boundsMese(ym) {
  const [y, m] = ym.split('-').map(Number)
  const primo = `${ym}-01`
  const ultimo = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  return { primo, ultimo }
}

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
  const mese = params?.mese && /^\d{4}-\d{2}$/.test(params.mese)
    ? params.mese
    : meseItaliaYm()
  const { primo, ultimo } = boundsMese(mese)

  const [
    { data: spese, error: loadError },
    { data: profili },
  ] = await Promise.all([
    supabase
      .from('spese')
      .select(`
        id, data, importo, motivazione, dipendente_id, created_at, creato_da,
        creato:profili!spese_creato_da_fkey ( nome ),
        dipendente:profili!spese_dipendente_id_fkey ( nome )
      `)
      .gte('data', primo)
      .lte('data', ultimo)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('profili')
      .select('id, nome, ruolo')
      .in('ruolo', ['titolare', 'collaboratore'])
      .order('nome'),
  ])

  const totale = (spese ?? []).reduce((s, x) => s + Number(x.importo), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold">Spese</h1>
        <div className="text-right">
          <p className="text-[10px] uppercase text-slate-500 font-semibold">
            Totale mese
          </p>
          <p className="font-bold">{formatPrezzo(totale)}</p>
        </div>
      </div>

      <form className="rounded-2xl bg-white shadow p-3 flex items-center gap-2">
        <label htmlFor="mese" className="text-xs font-medium text-slate-600">
          Mese
        </label>
        <input
          id="mese"
          name="mese"
          type="month"
          defaultValue={mese}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-900 text-white text-sm font-medium px-3 py-2 hover:bg-slate-800"
        >
          Mostra
        </button>
      </form>

      <p className="text-xs text-slate-500 capitalize">
        {formatMeseLungo(mese)}
      </p>

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

      <SpesaForm
        azione={creaSpesa}
        profili={profili ?? []}
        dataOggi={oggiItaliaYmd()}
      />

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
                <p className="font-medium mt-0.5 truncate">
                  {s.motivazione}
                  {s.dipendente?.nome && (
                    <span className="text-slate-500"> · {s.dipendente.nome}</span>
                  )}
                </p>
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
