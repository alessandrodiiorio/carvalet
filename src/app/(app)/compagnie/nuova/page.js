import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUtente, isTitolare } from '@/lib/auth'
import { creaCompagnia } from '../actions'
import CompagniaForm from '../CompagniaForm'

export default async function NuovaCompagniaPage({ searchParams }) {
  const { profilo } = await getUtente()
  if (!isTitolare(profilo)) redirect('/compagnie')

  const params = await searchParams
  const error = params?.error

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nuova compagnia</h1>
        <Link
          href="/compagnie"
          className="text-sm text-slate-600 underline"
        >
          Annulla
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white shadow p-5">
        <CompagniaForm action={creaCompagnia} submitLabel="Crea compagnia" />
      </div>
    </div>
  )
}
