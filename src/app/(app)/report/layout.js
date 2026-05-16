import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUtente, isTitolare, isCompagnia } from '@/lib/auth'

export default async function ReportLayout({ children }) {
  const { profilo } = await getUtente()
  const titolare = isTitolare(profilo)
  const compagnia = isCompagnia(profilo)
  if (!titolare && !compagnia) redirect('/movimenti')
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold print:hidden">Report</h1>
      <nav className="flex gap-2 print:hidden flex-wrap">
        <TabLink href="/report/giornaliero">Giornaliero</TabLink>
        <TabLink href="/report/mensile">Mensile</TabLink>
        {titolare && (
          <TabLink href="/report/utile-netto">Utile netto</TabLink>
        )}
      </nav>
      {children}
    </div>
  )
}

function TabLink({ href, children }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-300 bg-white text-sm font-medium px-3 py-2 hover:bg-slate-50"
    >
      {children}
    </Link>
  )
}
