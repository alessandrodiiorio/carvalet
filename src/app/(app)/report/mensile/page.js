import { getUtente } from '@/lib/auth'
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
import { inviaReportMensile } from '../actions'

const TIPI = [
  { value: 'ritiro', label: 'Ritiro' },
  { value: 'consegna', label: 'Consegna' },
  { value: 'ritiro_consegna', label: 'Ritiro + Consegna' },
]

export default async function ReportMensilePage({ searchParams }) {
  const sp = await searchParams
  const mese = sp?.mese || meseItaliaYm()

  const { supabase } = await getUtente()
  const { da, a } = boundsMeseIso(mese)

  const [{ data: movimenti, error }, { data: tariffe }] = await Promise.all([
    supabase
      .from('movimenti')
      .select(`
        id, tipo, stato, data_ora, luogo_ritiro, luogo_consegna,
        veicoli!movimenti_veicolo_id_fkey ( targa, modello, compagnia_id, compagnie ( nome ) ),
        veicolo_consegna:veicoli!movimenti_veicolo_consegna_id_fkey ( targa, modello )
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

  const compagnie = {}
  for (const m of movimenti ?? []) {
    const cid = m.veicoli?.compagnia_id
    const cnome = m.veicoli?.compagnie?.nome
    if (!cid) continue

    if (!compagnie[cid]) {
      compagnie[cid] = {
        id: cid,
        nome: cnome ?? '—',
        tipi: TIPI.reduce((acc, t) => {
          acc[t.value] = {
            conteggio: 0,
            completati: 0,
            prezzo: tariffeIdx[`${cid}:${t.value}`] ?? null,
            fatturato: 0,
          }
          return acc
        }, {}),
        totale: 0,
        totaleMovimenti: 0,
        totaleCompletati: 0,
        dettagli: [],
      }
    }

    const c = compagnie[cid]
    const slot = c.tipi[m.tipo]
    if (slot) {
      slot.conteggio++
      c.totaleMovimenti++
      if (m.stato === 'completato') {
        slot.completati++
        c.totaleCompletati++
        if (slot.prezzo != null) {
          slot.fatturato += slot.prezzo
          c.totale += slot.prezzo
        }
      }
      c.dettagli.push({
        id: m.id,
        data_ora: m.data_ora,
        tipo: m.tipo,
        stato: m.stato,
        targa: m.veicoli?.targa,
        modello: m.veicoli?.modello,
        targa2: m.veicolo_consegna?.targa,
        modello2: m.veicolo_consegna?.modello,
        luogo_ritiro: m.luogo_ritiro,
        luogo_consegna: m.luogo_consegna,
        prezzo: slot.prezzo,
      })
    }
  }

  const compagnieArr = Object.values(compagnie).sort((a, b) =>
    a.nome.localeCompare(b.nome)
  )
  const totaleGenerale = compagnieArr.reduce((s, c) => s + c.totale, 0)

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
          <form action={inviaReportMensile}>
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
        <header className="mb-4 flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold capitalize">
              Report {formatMeseLungo(mese)}
            </h2>
            <p className="text-sm text-slate-500">
              {movimenti?.length ?? 0} movimenti totali
            </p>
          </div>
          <div className="text-right text-xs space-y-0.5">
            <div className="flex justify-end gap-3">
              <span className="text-slate-500">Imponibile</span>
              <span className="font-medium tabular-nums">{formatPrezzo(totaleGenerale)}</span>
            </div>
            <div className="flex justify-end gap-3">
              <span className="text-slate-500">IVA {(IVA_RATE * 100).toFixed(0)}%</span>
              <span className="font-medium tabular-nums">{formatPrezzo(calcolaIva(totaleGenerale))}</span>
            </div>
            <div className="flex justify-end gap-3 pt-1 border-t border-slate-200">
              <span className="font-semibold">Totale</span>
              <span className="text-lg font-bold tabular-nums">{formatPrezzo(totaleLordo(totaleGenerale))}</span>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
            {error.message}
          </div>
        )}

        {compagnieArr.length === 0 && (
          <p className="text-sm text-slate-500 italic">
            Nessun movimento in questo mese.
          </p>
        )}

        <div className="space-y-6">
          {compagnieArr.map((c) => (
            <CompagniaBlock key={c.id} compagnia={c} />
          ))}
        </div>
      </div>
    </div>
  )
}

const TIPO_LABEL_SHORT = {
  ritiro: 'R',
  consegna: 'C',
  ritiro_consegna: 'R+C',
}

const STATO_STYLE = {
  programmato: 'bg-amber-100 text-amber-800',
  completato: 'bg-green-100 text-green-800',
  annullato: 'bg-slate-100 text-slate-600',
}

function formatGiornoOra(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CompagniaBlock({ compagnia }) {
  const iva = calcolaIva(compagnia.totale)
  const lordo = totaleLordo(compagnia.totale)
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="font-semibold">{compagnia.nome}</h3>
        <div className="text-right text-xs">
          <span className="text-slate-500">Imponibile {formatPrezzo(compagnia.totale)}</span>
          <span className="text-slate-400 mx-1">·</span>
          <span className="text-slate-500">IVA {formatPrezzo(iva)}</span>
          <span className="text-slate-400 mx-1">·</span>
          <span className="font-semibold text-slate-900">Totale {formatPrezzo(lordo)}</span>
        </div>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="text-left py-1 font-normal">Tipo</th>
            <th className="text-right py-1 font-normal">Tot.</th>
            <th className="text-right py-1 font-normal">Compl.</th>
            <th className="text-right py-1 font-normal">Tariffa</th>
            <th className="text-right py-1 font-normal">Fatturato</th>
          </tr>
        </thead>
        <tbody>
          {TIPI.map((t) => {
            const slot = compagnia.tipi[t.value]
            return (
              <tr key={t.value} className="border-b border-slate-100">
                <td className="py-1.5">{t.label}</td>
                <td className="text-right py-1.5">{slot.conteggio}</td>
                <td className="text-right py-1.5">{slot.completati}</td>
                <td className="text-right py-1.5 text-slate-500">
                  {slot.prezzo != null ? formatPrezzo(slot.prezzo) : '—'}
                </td>
                <td className="text-right py-1.5 font-medium">
                  {slot.prezzo != null ? formatPrezzo(slot.fatturato) : '—'}
                </td>
              </tr>
            )
          })}
          <tr className="font-semibold">
            <td className="py-1.5">Totale</td>
            <td className="text-right py-1.5">{compagnia.totaleMovimenti}</td>
            <td className="text-right py-1.5">{compagnia.totaleCompletati}</td>
            <td></td>
            <td className="text-right py-1.5">{formatPrezzo(compagnia.totale)}</td>
          </tr>
        </tbody>
      </table>

      {compagnia.dettagli.length > 0 && (
        <details className="group" open>
          <summary className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-900 print:hidden select-none">
            Dettagli movimenti ({compagnia.dettagli.length}) ▾
          </summary>
          <div className="hidden print:block text-xs font-semibold text-slate-600 mt-2">
            Dettagli movimenti
          </div>
          <table className="w-full text-xs border-collapse mt-2">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="text-left py-1 font-normal">Data/ora</th>
                <th className="text-left py-1 font-normal">Veicolo</th>
                <th className="text-left py-1 font-normal">Tipo</th>
                <th className="text-left py-1 font-normal">Stato</th>
                <th className="text-right py-1 font-normal">Importo</th>
              </tr>
            </thead>
            <tbody>
              {compagnia.dettagli.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 align-top">
                  <td className="py-1.5 whitespace-nowrap font-mono text-[11px]">
                    {formatGiornoOra(d.data_ora)}
                  </td>
                  <td className="py-1.5">
                    <p className="font-semibold tracking-wide">
                      {d.targa || '—'}
                      {d.targa2 && (
                        <span className="text-slate-500"> → {d.targa2}</span>
                      )}
                    </p>
                    {(d.modello || d.modello2) && (
                      <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                        {d.modello}
                        {d.modello2 ? ` / ${d.modello2}` : ''}
                      </p>
                    )}
                  </td>
                  <td className="py-1.5">{TIPO_LABEL_SHORT[d.tipo] ?? d.tipo}</td>
                  <td className="py-1.5">
                    <span
                      className={
                        'inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ' +
                        (STATO_STYLE[d.stato] ?? 'bg-slate-100 text-slate-600')
                      }
                    >
                      {d.stato}
                    </span>
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap">
                    {d.prezzo != null
                      ? d.stato === 'completato'
                        ? (
                          <span className="font-semibold text-green-700">
                            {formatPrezzo(d.prezzo)}
                          </span>
                        )
                        : (
                          <span className="text-slate-400">
                            {formatPrezzo(d.prezzo)}
                          </span>
                        )
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  )
}
