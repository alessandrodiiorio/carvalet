import Link from 'next/link'
import { getUtente } from '@/lib/auth'

const NAV = [
  { href: '/dashboard', label: 'Home' },
  { href: '/compagnie', label: 'Compagnie' },
  { href: '/veicoli', label: 'Veicoli' },
  { href: '/movimenti', label: 'Movimenti' },
  { href: '/report/giornaliero', label: 'Report' },
]

export default async function AppLayout({ children }) {
  const { profilo, user } = await getUtente()

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <header className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-base font-bold leading-tight">Car Walet</p>
            <p className="text-xs text-slate-500">
              {profilo?.nome ?? user.email} · {profilo?.ruolo ?? 'utente'}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm rounded-lg border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100"
            >
              Esci
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 pb-24">
        {children}
      </main>

      <nav className="print:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-10">
        <div className="max-w-3xl mx-auto grid grid-cols-5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-center py-3 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
