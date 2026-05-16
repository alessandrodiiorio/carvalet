import Link from 'next/link'
import { getUtente, isTitolare, isCompagnia } from '@/lib/auth'

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

function formatDataOra(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function MovimentiPage() {
  const { profilo, supabase } = await getUtente()
  const compagnia = isCompagnia(profilo)

  const { data: movimenti, error } = await supabase
    .from('movimenti')
    .select(`
      id, tipo, stato, data_ora, luogo_ritiro, luogo_consegna,
      veicoli!movimenti_veicolo_id_fkey ( targa, modello, compagnie ( nome ) ),
      veicolo_consegna:veicoli!movimenti_veicolo_consegna_id_fkey ( targa, modello, compagnie ( nome ) ),
      assegnato:profili!movimenti_assegnato_a_fkey ( nome )
    `)
    .order('data_ora', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Movimenti</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/movimenti/calendario"
            aria-label="Calendario"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium px-3 py-2 hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span className="hidden sm:inline">Calendario</span>
          </Link>
          {!compagnia && (
            <Link
              href="/movimenti/nuovo"
              className="rounded-lg bg-slate-900 text-white text-sm font-medium px-3 py-2 hover:bg-slate-800"
            >
              + Nuovo
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error.message}
        </div>
      )}

      {movimenti?.length === 0 && (
        <div className="rounded-2xl bg-white shadow p-6 text-center text-sm text-slate-500">
          Nessun movimento ancora.{' '}
          {!compagnia && (
            <Link href="/movimenti/nuovo" className="underline font-medium">
              Crea il primo
            </Link>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {movimenti?.map((m) => (
          <li key={m.id}>
            <Link
              href={`/movimenti/${m.id}`}
              className="block rounded-2xl bg-white shadow p-4 hover:bg-slate-50"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm text-slate-500">{formatDataOra(m.data_ora)}</p>
                <span
                  className={
                    'text-xs font-medium px-2 py-0.5 rounded-full ' +
                    (STATO_STYLE[m.stato] ?? 'bg-slate-100 text-slate-600')
                  }
                >
                  {m.stato}
                </span>
              </div>
              <p className="font-semibold mt-1">
                {m.veicoli?.targa ?? '—'}
                {m.veicolo_consegna?.targa && (
                  <span className="text-slate-500"> → {m.veicolo_consegna.targa}</span>
                )}{' '}
                <span className="font-normal text-slate-600">
                  · {TIPO_LABEL[m.tipo] ?? m.tipo}
                </span>
              </p>
              <p className="text-sm text-slate-600 truncate">
                {m.veicoli?.modello}
                {m.veicoli?.compagnie?.nome ? ` · ${m.veicoli.compagnie.nome}` : ''}
                {m.veicolo_consegna && (
                  <span className="text-slate-500">
                    {' '}/ {m.veicolo_consegna.modello}
                  </span>
                )}
              </p>
              {m.assegnato?.nome && (
                <p className="text-xs text-slate-500 mt-1">
                  Assegnato a: {m.assegnato.nome}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
