import { getUtente, isTitolare } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  boundsMeseIso,
  formatMeseLungo,
  formatPrezzo,
  meseItaliaYm,
  IVA_RATE,
  calcolaIva,
  totaleLordo,
} from '@/lib/dates'
import PrintButton from '@/components/PrintButton'
import { inviaReportUtileNetto } from '../actions'

export const metadata = {
  title: 'Utile netto',
}

const TIPI = ['ritiro', 'consegna', 'ritiro_consegna']

function dataMese(ym) {
  const [y, m] = ym.split('-').map(Number)
  return {
    primoGiorno: `${ym}-01`,
    ultimoGiorno: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10),
  }
}

export default async function ReportUtileNettoPage({ searchParams }) {
  const { profilo, supabase } = await getUtente()
  if (!isTitolare(profilo)) redirect('/movimenti')

  const sp = await searchParams
  const mese = sp?.mese || meseItaliaYm()
  const { da, a } = boundsMeseIso(mese)
  const { primoGiorno, ultimoGiorno } = dataMese(mese)

  const [
    { data: movimenti, error: errMov },
    { data: tariffe },
    { data: spese, error: errSpese },
  ] = await Promise.all([
    supabase
      .from('movimenti')
      .select(`
        id, tipo, stato,
        veicoli!movimenti_veicolo_id_fkey ( compagnia_id, compagnie ( nome ) )
      `)
      .gte('data_ora', da)
      .lt('data_ora', a),
    supabase.from('tariffe').select('compagnia_id, tipo, prezzo'),
    supabase
      .from('spese')
      .select(`
        id, data, importo, motivazione,
        creato:profili ( nome )
      `)
      .gte('data', primoGiorno)
      .lte('data', ultimoGiorno)
      .order('data', { ascending: false }),
  ])

  const tariffeIdx = {}
  for (const t of tariffe ?? []) {
    tariffeIdx[`${t.compagnia_id}:${t.tipo}`] = Number(t.prezzo)
  }

  let fatturato = 0
  let nCompletati = 0
  for (const m of movimenti ?? []) {
    if (m.stato !== 'completato') continue
    const cid = m.veicoli?.compagnia_id
    if (!cid) continue
    const p = tariffeIdx[`${cid}:${m.tipo}`]
    if (Number.isFinite(p)) {
      fatturato += p
      nCompletati++
    }
  }

  const totaleSpese = (spese ?? []).reduce((s, x) => s + Number(x.importo), 0)
  const ivaFatturato = calcolaIva(fatturato)
  const fatturatoLordo = totaleLordo(fatturato)
  const utileNetto = fatturatoLordo - totaleSpese
  const utileImponibile = fatturato - totaleSpese
  const margine =
    fatturatoLordo > 0 ? (utileNetto / fatturatoLordo) * 100 : 0

  // Raggruppa spese per giorno per dettaglio
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <form className="flex items-center gap-2">
          <label htmlFor="mese" className="text-sm font-medium">Mese</label>
          <input
            id="mese"
            name="mese"
            type="month"
            defaultValue={mese}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-100 border border-slate-300 text-sm font-medium px-3 py-2 hover:bg-slate-200"
          >
            Mostra
          </button>
        </form>
        <div className="flex items-center gap-2">
          <form action={inviaReportUtileNetto}>
            <input type="hidden" name="mese" value={mese} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-2 hover:bg-indigo-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Invia email
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      {sp?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3 print:hidden">
          {sp.error}
        </div>
      )}
      {sp?.info && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 print:hidden">
          {sp.info}
        </div>
      )}

      <div className="rounded-2xl bg-white shadow p-5 print:shadow-none print:p-0">
        <header className="mb-4">
          <h2 className="text-lg font-bold capitalize">
            Utile netto · {formatMeseLungo(mese)}
          </h2>
        </header>

        {errMov && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3 mb-3">
            {errMov.message}
          </div>
        )}
        {errSpese && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3 mb-3">
            {errSpese.message}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card
            label="Imponibile"
            value={formatPrezzo(fatturato)}
            sublabel={`${nCompletati} compl.`}
            variant="green"
          />
          <Card
            label={`IVA ${(IVA_RATE * 100).toFixed(0)}%`}
            value={formatPrezzo(ivaFatturato)}
            sublabel="su fatturato"
            variant="amber"
          />
          <Card
            label="Spese"
            value={`-${formatPrezzo(totaleSpese)}`}
            sublabel={`${spese?.length ?? 0} voci`}
            variant="red"
          />
          <Card
            label="Utile (lordo)"
            value={formatPrezzo(utileNetto)}
            sublabel={`${margine.toFixed(1)}% margine`}
            variant={utileNetto >= 0 ? 'indigo' : 'red'}
          />
        </div>

        <section className="space-y-3">
          <h3 className="font-semibold text-sm">Spese del mese</h3>
          {spese?.length === 0 && (
            <p className="text-sm text-slate-500 italic">
              Nessuna spesa registrata in questo mese.
            </p>
          )}
          {spese && spese.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="text-left py-1 font-normal">Data</th>
                  <th className="text-left py-1 font-normal">Motivazione</th>
                  <th className="text-left py-1 font-normal">Da</th>
                  <th className="text-right py-1 font-normal">Importo</th>
                </tr>
              </thead>
              <tbody>
                {spese.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-1.5 font-mono text-[11px] whitespace-nowrap">
                      {formatDataBreve(s.data)}
                    </td>
                    <td className="py-1.5">{s.motivazione}</td>
                    <td className="py-1.5 text-xs text-slate-500">
                      {s.creato?.nome ?? '—'}
                    </td>
                    <td className="py-1.5 text-right font-semibold text-red-700 whitespace-nowrap">
                      -{formatPrezzo(Number(s.importo))}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-1.5">Totale</td>
                  <td></td>
                  <td></td>
                  <td className="text-right py-1.5 text-red-700">
                    -{formatPrezzo(totaleSpese)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-6 pt-4 border-t border-slate-200 space-y-2">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Imponibile fatturato</span>
              <span className="tabular-nums">{formatPrezzo(fatturato)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">+ IVA {(IVA_RATE * 100).toFixed(0)}%</span>
              <span className="tabular-nums">{formatPrezzo(ivaFatturato)}</span>
            </div>
            <div className="flex justify-between font-medium pt-1 border-t border-slate-100">
              <span>= Fatturato lordo</span>
              <span className="tabular-nums">{formatPrezzo(fatturatoLordo)}</span>
            </div>
            <div className="flex justify-between text-red-700">
              <span>− Spese</span>
              <span className="tabular-nums">-{formatPrezzo(totaleSpese)}</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between pt-3 border-t-2 border-slate-300">
            <p className="font-semibold">Utile (lordo)</p>
            <p
              className={
                'text-2xl font-bold tabular-nums ' +
                (utileNetto >= 0 ? 'text-indigo-700' : 'text-red-700')
              }
            >
              {formatPrezzo(utileNetto)}
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Utile sul solo imponibile (al netto IVA da versare):{' '}
            <span className="font-medium">{formatPrezzo(utileImponibile)}</span>
          </p>
        </section>
      </div>
    </div>
  )
}

function Card({ label, value, sublabel, variant }) {
  const styles = {
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
  }
  return (
    <div className={`rounded-xl border p-3 ${styles[variant] ?? ''}`}>
      <p className="text-[10px] uppercase font-semibold opacity-70">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
      {sublabel && <p className="text-[10px] opacity-70 mt-0.5">{sublabel}</p>}
    </div>
  )
}

function formatDataBreve(ymd) {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  })
}
