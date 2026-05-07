import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getUtente, isTitolare } from '@/lib/auth'
import { cambiaRuolo } from './actions'

export const metadata = {
  title: 'Collaboratori',
}

export default async function CollaboratoriPage({ searchParams }) {
  const { profilo, user, supabase } = await getUtente()
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const proto = h.get('x-forwarded-proto') || 'https'
  const signupUrl = `${proto}://${host}/signup`

  if (!isTitolare(profilo)) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const error = params?.error
  const info = params?.info

  const { data: collaboratori, error: loadError } = await supabase
    .from('profili')
    .select('id, nome, ruolo, created_at')
    .order('created_at', { ascending: true })

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
            <p className="font-semibold text-sm">Invita un nuovo collaboratore</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Condividi questo link: il nuovo utente si registra e tu lo trovi qui sotto come{' '}
              <span className="font-medium">collaboratore</span>.
            </p>
            <code className="mt-2 block break-all text-xs bg-slate-50 border border-slate-200 rounded-md p-2 font-mono">
              {signupUrl}
            </code>
          </div>
        </div>
      </section>

      <ul className="space-y-2">
        {collaboratori?.map((c) => {
          const isSelf = c.id === user.id
          const isUnicoTitolare = c.ruolo === 'titolare' && numTitolari <= 1
          const nuovoRuolo = c.ruolo === 'titolare' ? 'collaboratore' : 'titolare'
          const labelBottone = c.ruolo === 'titolare' ? 'Rendi collaboratore' : 'Promuovi a titolare'

          return (
            <li
              key={c.id}
              className="rounded-2xl bg-white shadow p-4 flex items-center justify-between gap-3"
            >
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
                  <span
                    className={[
                      'inline-flex items-center mt-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full',
                      c.ruolo === 'titolare'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-600',
                    ].join(' ')}
                  >
                    {c.ruolo}
                  </span>
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
