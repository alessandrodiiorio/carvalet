'use client'

export default function PrintButton({ children = 'Stampa / Salva PDF' }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-slate-900 text-white text-sm font-medium px-3 py-2 hover:bg-slate-800"
    >
      {children}
    </button>
  )
}
