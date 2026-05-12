import Link from 'next/link'
import { getUtente, isTitolare } from '@/lib/auth'
import BottomNav from '@/components/BottomNav'

export default async function AppLayout({ children }) {
  const { profilo, user } = await getUtente()
  const nome = profilo?.nome ?? user.email
  const ruolo = profilo?.ruolo ?? 'utente'
  const iniziale = (nome || '?').trim().charAt(0).toUpperCase()
  const titolare = isTitolare(profilo)

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-slate-50 to-slate-100">
      <header
        className="print:hidden sticky top-0 z-20 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white shadow-lg"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 flex items-center justify-center font-bold text-white shadow-md ring-2 ring-white/20 shrink-0">
              {iniziale}
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold leading-tight tracking-tight truncate">
                Car Valet
              </p>
              <p className="text-xs text-indigo-200/90 truncate">
                {nome} · <span className="capitalize">{ruolo}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {titolare && (
              <Link
                href="/collaboratori"
                aria-label="Gestione collaboratori"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-sm transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </Link>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-sm font-medium rounded-full border border-white/20 bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-sm px-3.5 py-1.5 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                <span className="hidden sm:inline">Esci</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main
        className="flex-1 max-w-3xl w-full mx-auto p-4"
        style={{ paddingBottom: 'calc(9rem + env(safe-area-inset-bottom))' }}
      >
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
