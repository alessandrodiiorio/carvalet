'use client'

import { useEffect, useId, useMemo, useState } from 'react'

// Prova a separare "Fiat Panda" -> { marca: "FIAT", modello: "Panda" }
function splitModello(combinato) {
  if (!combinato) return { marca: '', modello: '' }
  const parts = combinato.trim().split(/\s+/)
  if (parts.length < 2) return { marca: parts[0]?.toUpperCase() ?? '', modello: '' }
  return {
    marca: parts[0].toUpperCase(),
    modello: parts.slice(1).join(' '),
  }
}

export default function ModelloPicker({
  name = 'modello',
  defaultValue = '',
  required = false,
}) {
  const id = useId()
  const split = useMemo(() => splitModello(defaultValue), [defaultValue])

  const [marca, setMarca] = useState(split.marca)
  const [modello, setModello] = useState(split.modello)
  const [marche, setMarche] = useState({ top: [], altre: [] })
  const [modelli, setModelli] = useState([])
  const [loadingMarche, setLoadingMarche] = useState(false)
  const [loadingModelli, setLoadingModelli] = useState(false)
  const [errore, setErrore] = useState(null)

  // Carica marche al mount
  useEffect(() => {
    let alive = true
    setLoadingMarche(true)
    fetch('/api/auto/marche')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        if (j?.error) setErrore(j.error)
        else setMarche({ top: j.top || [], altre: j.altre || [] })
      })
      .catch((e) => alive && setErrore(String(e?.message ?? e)))
      .finally(() => alive && setLoadingMarche(false))
    return () => {
      alive = false
    }
  }, [])

  // Quando cambia marca, carica modelli
  useEffect(() => {
    if (!marca) {
      setModelli([])
      return
    }
    let alive = true
    setLoadingModelli(true)
    fetch('/api/auto/modelli?marca=' + encodeURIComponent(marca))
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        if (j?.error) setErrore(j.error)
        else setModelli(j.modelli || [])
      })
      .catch((e) => alive && setErrore(String(e?.message ?? e)))
      .finally(() => alive && setLoadingModelli(false))
    return () => {
      alive = false
    }
  }, [marca])

  const combinato = useMemo(() => {
    const m = marca.trim()
    const mo = modello.trim()
    if (!m && !mo) return ''
    if (!m) return mo
    if (!mo) return m
    return `${m} ${mo}`
  }, [marca, modello])

  const tutteLeMarche = useMemo(
    () => [...marche.top, ...marche.altre],
    [marche],
  )

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        Marca e modello {required && '*'}
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <input
            list={`${id}-marche`}
            type="text"
            value={marca}
            onChange={(e) => setMarca(e.target.value.toUpperCase())}
            placeholder={loadingMarche ? 'Caricamento…' : 'Marca'}
            autoCapitalize="characters"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <datalist id={`${id}-marche`}>
            {marche.top.map((m) => (
              <option key={`t-${m}`} value={m} />
            ))}
            {marche.altre.map((m) => (
              <option key={`a-${m}`} value={m} />
            ))}
          </datalist>
        </div>

        <div>
          <input
            list={`${id}-modelli`}
            type="text"
            value={modello}
            onChange={(e) => setModello(e.target.value)}
            placeholder={
              loadingModelli ? 'Caricamento…' : marca ? 'Modello' : 'Scegli marca'
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <datalist id={`${id}-modelli`}>
            {modelli.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Suggerimenti da database NHTSA. Puoi anche scrivere manualmente.
      </p>

      {errore && (
        <p className="text-xs text-red-600">Lookup fallito: {errore}</p>
      )}

      <input
        type="hidden"
        name={name}
        value={combinato}
        required={required}
      />
    </div>
  )
}
