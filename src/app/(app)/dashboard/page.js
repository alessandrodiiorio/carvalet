import Link from 'next/link'
import { getUtente, isTitolare } from '@/lib/auth'

export default async function DashboardPage() {
  const { profilo, supabase } = await getUtente()

  const [
    { count: nCompagnie },
    { count: nVeicoli },
    { count: nMovimentiAperti },
  ] = await Promise.all([
    supabase.from('compagnie').select('*', { count: 'exact', head: true }),
    supabase.from('veicoli').select('*', { count: 'exact', head: true }),
    supabase
      .from('movimenti')
      .select('*', { count: 'exact', head: true })
      .eq('stato', 'programmato'),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Ciao {profilo?.nome ?? ''}</h1>

      <section className="grid grid-cols-3 gap-3">
        <StatCard label="Compagnie" value={nCompagnie ?? 0} href="/compagnie" />
        <StatCard label="Veicoli" value={nVeicoli ?? 0} href="/veicoli" />
        <StatCard
          label="Programmati"
          value={nMovimentiAperti ?? 0}
          href="/movimenti"
        />
      </section>

      {isTitolare(profilo) && (
        <section className="rounded-2xl bg-white shadow p-5 space-y-3">
          <h2 className="font-semibold">Azioni rapide</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/movimenti/nuovo"
              className="rounded-lg bg-slate-900 text-white text-sm font-medium px-3 py-2 hover:bg-slate-800"
            >
              + Nuovo movimento
            </Link>
            <Link
              href="/compagnie/nuova"
              className="rounded-lg border border-slate-300 bg-white text-sm font-medium px-3 py-2 hover:bg-slate-50"
            >
              + Compagnia
            </Link>
            <Link
              href="/tariffe"
              className="rounded-lg border border-slate-300 bg-white text-sm font-medium px-3 py-2 hover:bg-slate-50"
            >
              Tariffe
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value, href }) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white shadow p-4 text-center hover:bg-slate-50"
    >
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </Link>
  )
}
