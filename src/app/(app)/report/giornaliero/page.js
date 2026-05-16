import { getUtente } from '@/lib/auth'
import {
  boundsGiornoIso,
  formatDataLunga,
  formatOraIta,
  formatPrezzo,
  oggiItaliaYmd,
  IVA_RATE,
  calcolaIva,
  totaleLordo,
} from '@/lib/dates'
import PrintButton from '@/components/PrintButton'

const TIPO_LABEL = {
  ritiro: 'Ritiro',
  consegna: 'Consegna',
  ritiro_consegna: 'Ritiro + Consegna',
}

const STATO_STYLE = {
  programmato: 'bg-amber-100 text-amber-800',
  completato: 'bg-green-100 text-green-800',
  annullato: 'bg-slate-100 text-slate-600',
}

export default async function ReportGiornalieroPage({ searchParams }) {
  const sp = await searchParams
  const data = sp?.data || oggiItaliaYmd()

  const { supabase } = await getUtente()
  const { da, a } = boundsGiornoIso(data)

  const [{ data: movimenti, error }, { data: tariffe }] = await Promise.all([
    supabase
      .from('movimenti')
      .select(`
        id, tipo, stato, data_ora, luogo_ritiro, luogo_consegna, note,
        veicoli!movimenti_veicolo_id_fkey ( targa, modello, compagnia_id, compagnie ( nome ) ),
        veicolo_consegna:veicoli!movimenti_veicolo_consegna_id_fkey ( targa, modello ),
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

  const totaleFatturato = (movimenti ?? []).reduce((s, m) => {
    if (m.stato !== 'completato') return s
    const p = tariffaDi(m)
    return p != null ? s + p : s
  }, 0)
  const completatiConTariffa = (movimenti ?? []).filter(
    (m) => m.stato === 'completato' && tariffaDi(m) != null,
  ).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <form className="flex items-center gap-2">
          <label htmlFor="data" className="text-sm font-medium">Data</label>
          <input
            id="data"
            name="data"
            type="date"
            defaultValue={data}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-100 border border-slate-300 text-sm font-medium px-3 py-2 hover:bg-slate-200"
          >
            Mostra
          </button>
        </form>
        <PrintButton />
      </div>

      <div className="rounded-2xl bg-white shadow p-5 print:shadow-none print:p-0">
        <header className="mb-4 flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold capitalize">
              {formatDataLunga(data)}
            </h2>
            <p className="text-sm text-slate-500">
              {movimenti?.length ?? 0} movimenti · {completatiConTariffa} fatturati
            </p>
          </div>
          <div className="text-right text-xs space-y-0.5">
            <div className="flex justify-end gap-3">
              <span className="text-slate-500">Imponibile</span>
              <span className="font-medium tabular-nums">{formatPrezzo(totaleFatturato)}</span>
            </div>
            <div className="flex justify-end gap-3">
              <span className="text-slate-500">IVA {(IVA_RATE * 100).toFixed(0)}%</span>
              <span className="font-medium tabular-nums">{formatPrezzo(calcolaIva(totaleFatturato))}</span>
            </div>
            <div className="flex justify-end gap-3 pt-1 border-t border-slate-200">
              <span className="font-semibold">Totale</span>
              <span className="text-lg font-bold tabular-nums">{formatPrezzo(totaleLordo(totaleFatturato))}</span>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
            {error.message}
          </div>
        )}

        {movimenti?.length === 0 && (
          <p className="text-sm text-slate-500 italic">
            Nessun movimento programmato in questa giornata.
          </p>
        )}

        <ul className="divide-y divide-slate-200">
          {movimenti?.map((m) => {
            const prezzo = tariffaDi(m)
            return (
              <li key={m.id} className="py-3 flex gap-3">
                <div className="w-14 shrink-0 text-sm font-mono">
                  {formatOraIta(m.data_ora)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold tracking-wide truncate">
                      {m.veicoli?.targa ?? '—'}
                      {m.veicolo_consegna?.targa && (
                        <span className="text-slate-500"> → {m.veicolo_consegna.targa}</span>
                      )}
                      <span className="font-normal text-slate-600">
                        {' '}· {TIPO_LABEL[m.tipo]}
                      </span>
                    </p>
                    <span
                      className={
                        'text-xs font-medium px-2 py-0.5 rounded-full ' +
                        (STATO_STYLE[m.stato] ?? 'bg-slate-100 text-slate-600')
                      }
                    >
                      {m.stato}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 truncate">
                    {m.veicoli?.modello}
                    {m.veicoli?.compagnie?.nome ? ` · ${m.veicoli.compagnie.nome}` : ''}
                  </p>
                  {(m.luogo_ritiro || m.luogo_consegna) && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {m.luogo_ritiro && <>Ritiro: {m.luogo_ritiro}</>}
                      {m.luogo_ritiro && m.luogo_consegna && ' → '}
                      {m.luogo_consegna && <>Consegna: {m.luogo_consegna}</>}
                    </p>
                  )}
                  {m.assegnato?.nome && (
                    <p className="text-xs text-slate-500">
                      Assegnato a: {m.assegnato.nome}
                    </p>
                  )}
                  {m.note && (
                    <p className="text-xs text-slate-500 mt-0.5 italic">
                      {m.note}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Tariffa:</span>
                    <span className="font-medium">
                      {prezzo != null ? formatPrezzo(prezzo) : '—'}
                    </span>
                    {prezzo != null && m.stato === 'completato' && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 px-2 py-0.5 font-semibold">
                        +{formatPrezzo(prezzo)}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
