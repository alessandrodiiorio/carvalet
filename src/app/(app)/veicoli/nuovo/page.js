import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUtente, isTitolare } from '@/lib/auth'
import { creaVeicolo } from '../actions'
import VeicoloForm from '../VeicoloForm'

export default async function NuovoVeicoloPage({ searchParams }) {
  const { profilo, supabase } = await getUtente()
  if (!isTitolare(profilo)) redirect('/veicoli')

  const params = await searchParams
  const error = params?.error

  const { data: compagnie } = await supabase
    .from('compagnie')
    .select('id, nome')
    .order('nome', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nuovo veicolo</h1>
        <Link href="/veicoli" className="text-sm text-slate-600 underline">
          Annulla
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      {compagnie?.length === 0 ? (
        <div className="rounded-2xl bg-white shadow p-6 text-sm text-slate-700 space-y-3">
          <p>
            Per registrare un veicolo serve almeno una compagnia. Crea prima una compagnia.
          </p>
          <Link
            href="/compagnie/nuova"
            className="inline-block rounded-lg bg-slate-900 text-white text-sm font-medium px-3 py-2"
          >
            + Nuova compagnia
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow p-5">
          <VeicoloForm
            action={creaVeicolo}
            compagnie={compagnie ?? []}
            submitLabel="Crea veicolo"
          />
        </div>
      )}
    </div>
  )
}
