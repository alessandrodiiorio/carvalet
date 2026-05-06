import { getUtente } from '@/lib/auth'
import {
  boundsMeseIso,
  formatMeseLungo,
  formatPrezzo,
  meseItaliaYm,
} from '@/lib/dates'
import PrintButton from '@/components/PrintButton'

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
        id, tipo, stato,
        veicoli ( compagnia_id, compagnie ( nome ) )
      `)
      .gte('data_ora', da)
      .lt('data_ora', a),
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
        <PrintButton />
      </div>

      <div className="rounded-2xl bg-white shadow p-5 print:shadow-none print:p-0">
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold capitalize">
              Report {formatMeseLungo(mese)}
            </h2>
            <p className="text-sm text-slate-500">
              {movimenti?.length ?? 0} movimenti totali
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Totale fatturato</p>
            <p className="text-xl font-bold">{formatPrezzo(totaleGenerale)}</p>
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

function CompagniaBlock({ compagnia }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-semibold">{compagnia.nome}</h3>
        <p className="text-sm">
          <span className="text-slate-500">Totale: </span>
          <span className="font-semibold">{formatPrezzo(compagnia.totale)}</span>
        </p>
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
    </section>
  )
}
