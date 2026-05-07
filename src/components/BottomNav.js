'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 12l9-9 9 9" />
        <path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10" />
      </svg>
    ),
  },
  {
    href: '/compagnie',
    label: 'Compagnie',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 21V9h6v12" />
        <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01" />
      </svg>
    ),
  },
  {
    href: '/veicoli',
    label: 'Veicoli',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M5 17h14M5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" />
        <path d="M3 13l1.5-5A2 2 0 0 1 6.4 6.5h11.2a2 2 0 0 1 1.9 1.5L21 13M3 13h18M3 13v4h2M21 13v4h-2" />
      </svg>
    ),
  },
  {
    href: '/movimenti',
    label: 'Movimenti',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M7 17l-4-4 4-4" />
        <path d="M3 13h14" />
        <path d="M17 7l4 4-4 4" />
        <path d="M21 11H7" />
      </svg>
    ),
  },
  {
    href: '/report/giornaliero',
    label: 'Report',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname() || ''

  return (
    <nav
      className="print:hidden fixed bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_12px_rgba(15,23,42,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-3xl mx-auto grid grid-cols-5">
        {NAV.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href.split('/').slice(0, 2).join('/'))

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'group relative flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-indigo-600'
                  : 'text-slate-500 hover:text-slate-900 active:text-slate-900',
              ].join(' ')}
            >
              <span
                className={[
                  'flex items-center justify-center w-10 h-7 rounded-full transition-all',
                  isActive
                    ? 'bg-indigo-100 scale-105'
                    : 'bg-transparent group-active:bg-slate-100',
                ].join(' ')}
              >
                {item.icon}
              </span>
              <span className="leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-indigo-600" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
