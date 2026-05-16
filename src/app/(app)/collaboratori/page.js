import { redirect } from 'next/navigation'
import { getUtente, isTitolare } from '@/lib/auth'
import {
  cambiaRuolo,
  creaCollaboratore,
  aggiornaCompagnieAssociate,
} from './actions'

export const metadata = {
  title: 'Collaboratori',
}

export default async function CollaboratoriPage({ searchParams }) {
  const { profilo, user, supabase } = await getUtente()

  if (!isTitolare(profilo)) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const error = params?.error
  const info = params?.info

  const [
    { data: collaboratori, error: loadError },
    { data: compagnie },
    { data: associazioni },
  ] = await Promise.all([
    supabase
      .from('profili')
      .select('id, nome, ruolo, compagnia_id, created_at, compagnie:compagnia_id ( nome )')
      .order('created_at', { ascending: true }),
    supabase.from('compagnie').select('id, nome').order('nome', { ascending: true }),
    supabase.from('profilo_compagnie').select('profilo_id, compagnia_id'),
  ])

  // Mappa profilo_id -> Set di compagnia_id (incluso legacy compagnia_id)
  const compagnieDi = {}
  for (const a of associazioni ?? []) {
    if (!compagnieDi[a.profilo_id]) compagnieDi[a.profilo_id] = new Set()
    compagnieDi[a.profilo_id].add(a.compagnia_id)
  }
  for (const c of collaboratori ?? []) {
    if (c.compagnia_id) {
      if (!compagnieDi[c.id]) compagnieDi[c.id] = new Set()
      compagnieDi[c.id].add(c.compagnia_id)
    }
  }

  const compagnieById = {}
  for (const c of compagnie ?? []) compagnieById[c.id] = c.nome

  const numTitolari = (collaboratori || []).filter((c) => c.ruolo === 'titolare').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Collaboratori</h1>
        <span className="text-xs text-slate-500">
          {collaboratori?.length ?? 0} totali
        </span>
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

      <section className="rounded-2xl bg-white shadow p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 11l-3-3-3 3" />
              <path d="M19 8v8" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Crea nuovo utente</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Compila e crea direttamente. Comunica password al collaboratore.
            </p>
          </div>
        </div>

        <form action={creaCollaboratore} className="space-y-3">
          <div>
            <label htmlFor="nuovo_nome" className="block text-xs font-medium mb-1">
              Nome *
            </label>
            <input
              id="nuovo_nome"
              name="nome"
              type="text"
              required
              autoComplete="off"
              placeholder="Mario Rossi"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label htmlFor="nuovo_email" className="block text-xs font-medium mb-1">
              Email *
            </label>
            <input
              id="nuovo_email"
              name="email"
              type="email"
              required
              autoComplete="off"
              placeholder="utente@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label htmlFor="nuovo_password" className="block text-xs font-medium mb-1">
              Password * <span className="text-slate-400 font-normal">(min 8 caratteri)</span>
            </label>
            <input
              id="nuovo_password"
              name="password"
              type="text"
              required
              minLength={8}
              autoComplete="off"
              placeholder="Password iniziale"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
            />
          </div>
          <div>
            <label htmlFor="nuovo_ruolo" className="block text-xs font-medium mb-1">
              Ruolo *
            </label>
            <select
              id="nuovo_ruolo"
              name="ruolo"
              defaultValue="collaboratore"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="collaboratore">Collaboratore</option>
              <option value="titolare">Titolare</option>
              <option value="compagnia">Compagnia (solo lettura propria)</option>
            </select>
          </div>
          <div>
            <p className="block text-xs font-medium mb-1">
              Compagnie associate <span className="text-slate-400 font-normal">(seleziona se ruolo=compagnia)</span>
            </p>
            <div className="rounded-lg border border-slate-300 p-2 max-h-48 overflow-auto space-y-1">
              {compagnie?.length === 0 && (
                <p className="text-xs text-slate-500 italic">Nessuna compagnia.</p>
              )}
              {compagnie?.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    name="compagnie_ids"
                    value={c.id}
                    className="w-4 h-4"
                  />
                  <span>{c.nome}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            Crea utente
          </button>
        </form>
      </section>

      <ul className="space-y-2">
        {collaboratori?.map((c) => {
          const isSelf = c.id === user.id
          const isUnicoTitolare = c.ruolo === 'titolare' && numTitolari <= 1
          const nuovoRuolo = c.ruolo === 'titolare' ? 'collaboratore' : 'titolare'
          const labelBottone = c.ruolo === 'titolare' ? 'Rendi collaboratore' : 'Promuovi a titolare'

          const associate = compagnieDi[c.id] ?? new Set()

          return (
            <li
              key={c.id}
              className="rounded-2xl bg-white shadow p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={[
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0',
                    c.ruolo === 'titolare'
                      ? 'bg-gradient-to-br from-indigo-500 to-fuchsia-500'
                      : 'bg-gradient-to-br from-slate-400 to-slate-500',
                  ].join(' ')}
                >
                  {(c.nome || '?').trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {c.nome}
                    {isSelf && <span className="ml-2 text-xs text-slate-400">(tu)</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span
                      className={[
                        'inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full',
                        c.ruolo === 'titolare'
                          ? 'bg-indigo-100 text-indigo-700'
                          : c.ruolo === 'compagnia'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600',
                      ].join(' ')}
                    >
                      {c.ruolo}
                    </span>
                    {c.ruolo === 'compagnia' && compagnieDi[c.id] && (
                      <span className="text-[11px] text-slate-500 truncate">
                        ·{' '}
                        {Array.from(compagnieDi[c.id])
                          .map((id) => compagnieById[id] ?? '?')
                          .join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <form action={cambiaRuolo}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="ruolo" value={nuovoRuolo} />
                <button
                  type="submit"
                  disabled={isSelf || isUnicoTitolare}
                  className="text-xs font-medium rounded-lg border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  title={
                    isSelf
                      ? 'Non puoi cambiare il tuo ruolo'
                      : isUnicoTitolare
                      ? 'Devi avere almeno un titolare'
                      : labelBottone
                  }
                >
                  {labelBottone}
                </button>
              </form>
              </div>

              {c.ruolo === 'compagnia' && (
                <details className="border-t border-slate-100 pt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-900">
                    Compagnie associate ({associate.size}) ▾
                  </summary>
                  <form
                    action={aggiornaCompagnieAssociate}
                    className="mt-2 space-y-2"
                  >
                    <input type="hidden" name="profilo_id" value={c.id} />
                    <div className="rounded-lg border border-slate-200 p-2 max-h-40 overflow-auto space-y-1">
                      {compagnie?.map((co) => (
                        <label
                          key={co.id}
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            name="compagnie_ids"
                            value={co.id}
                            defaultChecked={associate.has(co.id)}
                            className="w-4 h-4"
                          />
                          <span>{co.nome}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="text-xs font-medium rounded-lg bg-slate-900 text-white px-3 py-1.5 hover:bg-slate-800"
                    >
                      Salva associazioni
                    </button>
                  </form>
                </details>
              )}
            </li>
          )
        })}
      </ul>

      {collaboratori?.length === 0 && (
        <div className="rounded-2xl bg-white shadow p-6 text-center text-sm text-slate-500">
          Nessun collaboratore.
        </div>
      )}
    </div>
  )
}
