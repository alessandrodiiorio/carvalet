import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUtente, isTitolare } from '@/lib/auth'

export default async function CompagniePage() {
  const { profilo, supabase } = await getUtente()
  if (!isTitolare(profilo)) redirect('/movimenti')

  const { data: compagnie, error } = await supabase
    .from('compagnie')
    .select('id, nome, referente, telefono, email')
    .order('nome', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Compagnie</h1>
        <div className="flex items-center gap-2">
          {isTitolare(profilo) && (
            <Link
              href="/tariffe"
              className="rounded-lg border border-slate-300 bg-white text-sm font-medium px-3 py-2 hover:bg-slate-50"
            >
              Tariffe
            </Link>
          )}
          {isTitolare(profilo) && (
            <Link
              href="/compagnie/nuova"
              className="rounded-lg bg-slate-900 text-white text-sm font-medium px-3 py-2 hover:bg-slate-800"
            >
              + Nuova
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error.message}
        </div>
      )}

      {compagnie?.length === 0 && (
        <div className="rounded-2xl bg-white shadow p-6 text-center text-sm text-slate-500">
          Nessuna compagnia ancora.{' '}
          {isTitolare(profilo) && (
            <Link href="/compagnie/nuova" className="underline font-medium">
              Aggiungine una
            </Link>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {compagnie?.map((c) => (
          <li key={c.id}>
            <Link
              href={`/compagnie/${c.id}`}
              className="block rounded-2xl bg-white shadow p-4 hover:bg-slate-50"
            >
              <p className="font-semibold">{c.nome}</p>
              {(c.referente || c.telefono || c.email) && (
                <p className="text-sm text-slate-500 truncate">
                  {[c.referente, c.telefono, c.email].filter(Boolean).join(' · ')}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
