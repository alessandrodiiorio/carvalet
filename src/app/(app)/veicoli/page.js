import Link from 'next/link'
import { getUtente, isTitolare } from '@/lib/auth'

export default async function VeicoliPage() {
  const { profilo, supabase } = await getUtente()

  const { data: veicoli, error } = await supabase
    .from('veicoli')
    .select('id, targa, modello, compagnie ( nome )')
    .order('targa', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Veicoli</h1>
        {isTitolare(profilo) && (
          <Link
            href="/veicoli/nuovo"
            className="rounded-lg bg-slate-900 text-white text-sm font-medium px-3 py-2 hover:bg-slate-800"
          >
            + Nuovo
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error.message}
        </div>
      )}

      {veicoli?.length === 0 && (
        <div className="rounded-2xl bg-white shadow p-6 text-center text-sm text-slate-500">
          Nessun veicolo ancora.{' '}
          {isTitolare(profilo) && (
            <Link href="/veicoli/nuovo" className="underline font-medium">
              Aggiungine uno
            </Link>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {veicoli?.map((v) => (
          <li key={v.id}>
            <Link
              href={`/veicoli/${v.id}`}
              className="block rounded-2xl bg-white shadow p-4 hover:bg-slate-50"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold tracking-wide">{v.targa}</p>
                <p className="text-xs text-slate-500 truncate">
                  {v.compagnie?.nome ?? '—'}
                </p>
              </div>
              <p className="text-sm text-slate-600 truncate">{v.modello}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
