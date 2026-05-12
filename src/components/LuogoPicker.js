'use client'

import { useEffect, useId, useRef, useState } from 'react'

export default function LuogoPicker({
  label,
  name,
  defaultValue = '',
  placeholder = 'Cerca indirizzo o usa posizione',
  required = false,
}) {
  const id = useId()
  const [valore, setValore] = useState(defaultValue)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [aperto, setAperto] = useState(false)
  const [errore, setErrore] = useState(null)
  const timeoutRef = useRef(null)
  const blurTimeoutRef = useRef(null)

  // Debounced search
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (!valore || valore.trim().length < 3) {
      setResults([])
      return
    }
    timeoutRef.current = setTimeout(async () => {
      setLoading(true)
      setErrore(null)
      try {
        const r = await fetch('/api/geo/search?q=' + encodeURIComponent(valore))
        const j = await r.json()
        if (j?.error) setErrore(j.error)
        else setResults(j.results || [])
      } catch (e) {
        setErrore(String(e?.message ?? e))
      } finally {
        setLoading(false)
      }
    }, 500)
    return () => clearTimeout(timeoutRef.current)
  }, [valore])

  function selezionaSuggerimento(r) {
    setValore(r.short || r.label)
    setResults([])
    setAperto(false)
  }

  async function usaPosizione() {
    if (!('geolocation' in navigator)) {
      setErrore('Geolocalizzazione non supportata dal browser.')
      return
    }
    setGpsLoading(true)
    setErrore(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const r = await fetch(
            `/api/geo/reverse?lat=${latitude}&lon=${longitude}`,
          )
          const j = await r.json()
          if (j?.error) setErrore(j.error)
          else setValore(j.short || j.label)
        } catch (e) {
          setErrore(String(e?.message ?? e))
        } finally {
          setGpsLoading(false)
        }
      },
      (err) => {
        setErrore('Errore GPS: ' + err.message)
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label} {required && '*'}
      </label>
      <div className="relative">
        <div className="flex gap-2">
          <input
            id={id}
            type="text"
            value={valore}
            onChange={(e) => {
              setValore(e.target.value)
              setAperto(true)
            }}
            onFocus={() => setAperto(true)}
            onBlur={() => {
              // Ritardo per permettere click su suggerimento
              blurTimeoutRef.current = setTimeout(() => setAperto(false), 200)
            }}
            placeholder={placeholder}
            required={required}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <button
            type="button"
            onClick={usaPosizione}
            disabled={gpsLoading}
            aria-label="Usa posizione attuale"
            className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 transition-colors"
            title="Usa posizione attuale"
          >
            {gpsLoading ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            )}
          </button>
        </div>

        {aperto && (loading || results.length > 0) && (
          <ul className="absolute z-30 mt-1 left-0 right-0 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {loading && (
              <li className="px-3 py-2 text-sm text-slate-500">Cerco…</li>
            )}
            {!loading &&
              results.map((r, i) => (
                <li key={`${r.lat}-${r.lon}-${i}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selezionaSuggerimento(r)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 active:bg-slate-100"
                  >
                    <p className="font-medium truncate">{r.short}</p>
                    <p className="text-xs text-slate-500 truncate">{r.label}</p>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      {errore && <p className="text-xs text-red-600">{errore}</p>}
    </div>
  )
}
