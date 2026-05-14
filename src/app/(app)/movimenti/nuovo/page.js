import Link from 'next/link'
import { getUtente } from '@/lib/auth'
import { creaMovimento } from '../actions'
import MovimentoForm from '../MovimentoForm'

export default async function NuovoMovimentoPage({ searchParams }) {
  const { profilo, supabase } = await getUtente()

  const params = await searchParams
  const error = params?.error

  const [
    { data: veicoli },
    { data: compagnie },
    { data: profili },
  ] = await Promise.all([
    supabase
      .from('veicoli')
      .select('id, targa, modello, compagnie ( nome )')
      .order('targa', { ascending: true }),
    supabase.from('compagnie').select('id, nome').order('nome', { ascending: true }),
    supabase.from('profili').select('id, nome, ruolo').order('nome', { ascending: true }),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nuovo movimento</h1>
        <Link href="/movimenti" className="text-sm text-slate-600 underline">
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
          <p>Per creare un movimento serve almeno una compagnia in anagrafica.</p>
          <Link
            href="/compagnie/nuova"
            className="inline-block rounded-lg bg-slate-900 text-white text-sm font-medium px-3 py-2"
          >
            + Nuova compagnia
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow p-5">
          <MovimentoForm
            action={creaMovimento}
            veicoli={veicoli ?? []}
            compagnie={compagnie ?? []}
            profili={profili ?? []}
            submitLabel="Crea movimento"
          />
        </div>
      )}
    </div>
  )
}
