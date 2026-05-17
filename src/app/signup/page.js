import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signup } from './actions'

export default async function SignupPage({ searchParams }) {
  const params = await searchParams
  const error = params?.error
  const info = params?.info

  const supabase = await createClient()
  const { data: imp } = await supabase
    .from('impostazioni_app')
    .select('logo_url, nome_azienda')
    .eq('id', 1)
    .maybeSingle()
  const nomeAzienda = imp?.nome_azienda || 'Car Valet'
  const logoUrl = imp?.logo_url || null

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-5">
        <div className="text-center space-y-3">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo"
              className="mx-auto max-h-20 max-w-full object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{nomeAzienda}</h1>
            <p className="text-sm text-slate-500">Crea un nuovo account</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
            {error}
          </div>
        )}

        {info && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm p-3">
            {info}
          </div>
        )}

        <form action={signup} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium mb-1">
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              autoComplete="name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <p className="text-xs text-slate-500 mt-1">Minimo 6 caratteri</p>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 text-white font-medium py-2.5 hover:bg-slate-800 transition"
          >
            Crea account
          </button>
        </form>

        <p className="text-sm text-slate-600 text-center">
          Hai già un account?{' '}
          <Link href="/login" className="text-slate-900 font-medium underline">
            Accedi
          </Link>
        </p>
      </div>
    </main>
  )
}
