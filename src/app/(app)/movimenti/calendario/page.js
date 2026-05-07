import Link from 'next/link'
import { getUtente, isTitolare } from '@/lib/auth'
import {
  boundsMeseIso,
  boundsGiornoIso,
  formatMeseLungo,
  formatDataLunga,
  formatOraIta,
  meseItaliaYm,
  oggiItaliaYmd,
} from '@/lib/dates'

export const metadata = {
  title: 'Calendario movimenti',
}

const TIPO_LABEL = {
  ritiro: 'Ritiro',
  consegna: 'Consegna',
  ritiro_consegna: 'Ritiro + Consegna',
}

const STATO_DOT = {
  programmato: 'bg-amber-500',
  completato: 'bg-green-500',
  annullato: 'bg-slate-400',
}

const STATO_BADGE = {
  programmato: 'bg-amber-100 text-amber-800',
  completato: 'bg-green-100 text-green-800',
  annullato: 'bg-slate-100 text-slate-600',
}

const GIORNI_HEADER = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function shiftMese(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function startWeekdayMon(ym) {
  const [y, m] = ym.split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  return (day + 6) % 7
}

function ymdInMese(ym, day) {
  return `${ym}-${String(day).padStart(2, '0')}`
}

function ymdFromIso(iso) {
  const d = new Date(iso)
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return f.format(d)
}

export default async function CalendarioPage({ searchParams }) {
  const sp = (await searchParams) ?? {}
  const oggi = oggiItaliaYmd()
  const mese = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : meseItaliaYm()
  const giornoSelezionato =
    sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) && sp.d.startsWith(mese) ? sp.d : null

  const { profilo, supabase } = await getUtente()
  const titolare = isTitolare(profilo)

  const { da, a } = boundsMeseIso(mese)
  const { data: movimenti, error } = await supabase
    .from('movimenti')
    .select(`
      id, tipo, stato, data_ora,
      veicoli ( targa, modello, compagnie ( nome ) ),
      assegnato:profili!movimenti_assegnato_a_fkey ( nome )
    `)
    .gte('data_ora', da)
    .lt('data_ora', a)
    .order('data_ora', { ascending: true })

  const perGiorno = {}
  for (const m of movimenti ?? []) {
    const ymd = ymdFromIso(m.data_ora)
    ;(perGiorno[ymd] ||= []).push(m)
  }

  const giorni = daysInMonth(mese)
  const offset = startWeekdayMon(mese)
  const cellulle = []
  for (let i = 0; i < offset; i++) cellulle.push(null)
  for (let d = 1; d <= giorni; d++) cellulle.push(d)
  while (cellulle.length % 7 !== 0) cellulle.push(null)

  const movDelGiorno = giornoSelezionato ? perGiorno[giornoSelezionato] ?? [] : null
  const meseAttuale = meseItaliaYm()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Calendario</h1>
        <Link
          href="/movimenti"
          className="text-sm font-medium text-slate-600 underline"
        >
          Lista
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error.message}
        </div>
      )}

      <div className="rounded-2xl bg-white shadow p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/movimenti/calendario?m=${shiftMese(mese, -1)}`}
            aria-label="Mese precedente"
            className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="flex flex-col items-center">
            <p className="font-semibold capitalize">{formatMeseLungo(mese)}</p>
            {mese !== meseAttuale && (
              <Link
                href={`/movimenti/calendario?m=${meseAttuale}`}
                className="text-[11px] text-indigo-600 underline"
              >
                Torna a oggi
              </Link>
            )}
          </div>
          <Link
            href={`/movimenti/calendario?m=${shiftMese(mese, 1)}`}
            aria-label="Mese successivo"
            className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {GIORNI_HEADER.map((g, i) => (
            <div key={i} className="text-[10px] font-semibold text-slate-400 py-1">
              {g}
            </div>
          ))}
          {cellulle.map((d, i) => {
            if (d === null) return <div key={i} />
            const ymd = ymdInMese(mese, d)
            const items = perGiorno[ymd] ?? []
            const isOggi = ymd === oggi
            const isSel = ymd === giornoSelezionato
            const stati = new Set(items.map((m) => m.stato))

            return (
              <Link
                key={i}
                href={`/movimenti/calendario?m=${mese}&d=${ymd}`}
                className={[
                  'aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-colors relative',
                  isSel
                    ? 'bg-indigo-600 text-white shadow'
                    : isOggi
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300'
                    : items.length > 0
                    ? 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    : 'text-slate-700 hover:bg-slate-50',
                ].join(' ')}
              >
                <span className="leading-none">{d}</span>
                {items.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {['programmato', 'completato', 'annullato']
                      .filter((s) => stati.has(s))
                      .slice(0, 3)
                      .map((s) => (
                        <span
                          key={s}
                          className={[
                            'w-1.5 h-1.5 rounded-full',
                            isSel ? 'bg-white' : STATO_DOT[s],
                          ].join(' ')}
                        />
                      ))}
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Programmato
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Completato
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> Annullato
          </span>
        </div>
      </div>

      {giornoSelezionato && (
        <div className="rounded-2xl bg-white shadow p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold capitalize">{formatDataLunga(giornoSelezionato)}</p>
            {titolare && (
              <Link
                href="/movimenti/nuovo"
                className="rounded-lg bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 hover:bg-slate-800"
              >
                + Nuovo
              </Link>
            )}
          </div>

          {movDelGiorno.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">
              Nessun movimento in questo giorno.
            </p>
          )}

          <ul className="space-y-2">
            {movDelGiorno.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/movimenti/${m.id}`}
                  className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50 active:bg-slate-100"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      {formatOraIta(m.data_ora)}
                    </p>
                    <span
                      className={[
                        'text-[10px] font-medium px-2 py-0.5 rounded-full',
                        STATO_BADGE[m.stato] ?? 'bg-slate-100 text-slate-600',
                      ].join(' ')}
                    >
                      {m.stato}
                    </span>
                  </div>
                  <p className="font-semibold text-sm mt-0.5">
                    {m.veicoli?.targa ?? '—'}{' '}
                    <span className="font-normal text-slate-600">
                      · {TIPO_LABEL[m.tipo] ?? m.tipo}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {m.veicoli?.modello}
                    {m.veicoli?.compagnie?.nome ? ` · ${m.veicoli.compagnie.nome}` : ''}
                    {m.assegnato?.nome ? ` · ${m.assegnato.nome}` : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
