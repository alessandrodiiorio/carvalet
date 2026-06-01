'use client'

import { useState } from 'react'

const MOTIVAZIONE_DIPENDENTE = 'Spesa giornaliera dipendente'

export default function SpesaForm({ azione, profili, dataOggi }) {
  const [motivazione, setMotivazione] = useState('')

  return (
    <form
      action={azione}
      className="rounded-2xl bg-white shadow p-4 space-y-3"
    >
      <p className="font-semibold text-sm">Nuova spesa</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="data" className="block text-xs font-medium mb-1">
            Data *
          </label>
          <input
            id="data"
            name="data"
            type="date"
            defaultValue={dataOggi}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div>
          <label htmlFor="importo" className="block text-xs font-medium mb-1">
            Importo (€) *
          </label>
          <input
            id="importo"
            name="importo"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0,00"
            inputMode="decimal"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="motivazione" className="block text-xs font-medium mb-1">
          Motivazione *
        </label>
        <select
          id="motivazione"
          name="motivazione"
          required
          value={motivazione}
          onChange={(e) => setMotivazione(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="" disabled>Seleziona</option>
          <option value="Spesa carburante">Spesa carburante</option>
          <option value={MOTIVAZIONE_DIPENDENTE}>
            {MOTIVAZIONE_DIPENDENTE}
          </option>
        </select>
      </div>

      {motivazione === MOTIVAZIONE_DIPENDENTE && (
        <div>
          <label htmlFor="dipendente_id" className="block text-xs font-medium mb-1">
            Dipendente *
          </label>
          <select
            id="dipendente_id"
            name="dipendente_id"
            required
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="" disabled>Seleziona dipendente</option>
            {profili.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} ({p.ruolo})
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded-lg bg-slate-900 text-white font-semibold py-2.5 hover:bg-slate-800 transition-colors"
      >
        Registra spesa
      </button>
    </form>
  )
}
