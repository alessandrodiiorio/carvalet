import { redirect } from 'next/navigation'
import { getUtente, isTitolare } from '@/lib/auth'
import LogoUploader from '@/components/LogoUploader'
import { aggiornaLogo } from './actions'

export const metadata = {
  title: 'Impostazioni',
}

export default async function ImpostazioniPage({ searchParams }) {
  const { profilo, supabase } = await getUtente()
  if (!isTitolare(profilo)) redirect('/movimenti')

  const sp = await searchParams
  const { data: impostazioni } = await supabase
    .from('impostazioni_app')
    .select('logo_url')
    .eq('id', 1)
    .single()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Impostazioni</h1>

      {sp?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {sp.error}
        </div>
      )}
      {sp?.info && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3">
          {sp.info}
        </div>
      )}

      <section className="rounded-2xl bg-white shadow p-5 space-y-3">
        <div>
          <h2 className="font-semibold">Logo</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mostrato nell&apos;header dell&apos;app e nelle email dei report.
          </p>
        </div>
        <LogoUploader
          defaultUrl={impostazioni?.logo_url ?? ''}
          azione={aggiornaLogo}
        />
      </section>
    </div>
  )
}
