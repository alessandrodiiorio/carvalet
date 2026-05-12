'use client'

import { useEffect, useRef, useState } from 'react'

// Haversine in km
function distanzaKm(a, b) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function formatDurata(ms) {
  if (!ms || ms < 0) return '0m'
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const SOGLIA_MIN_METRI = 10 // filtra punti GPS troppo vicini

export default function TransferTracker({
  movimentoId,
  inizioAt,
  fineAt,
  azioneInizia,
  azioneTermina,
  azioneAnnulla,
}) {
  const inProgressLocal = useRef(false)
  const [punti, setPunti] = useState([])
  const [distanza, setDistanza] = useState(0)
  const [errore, setErrore] = useState(null)
  const [now, setNow] = useState(Date.now())
  const watchIdRef = useRef(null)

  const tracking = !!inizioAt && !fineAt

  // Tick per durata live
  useEffect(() => {
    if (!tracking) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [tracking])

  // Avvia/ferma GPS watchPosition quando tracking attivo
  useEffect(() => {
    if (!tracking) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if (!('geolocation' in navigator)) {
      setErrore('GPS non supportato dal browser.')
      return
    }

    inProgressLocal.current = true
    const cached = localStorage.getItem(`tracking_${movimentoId}`)
    if (cached) {
      try {
        const obj = JSON.parse(cached)
        setPunti(obj.punti || [])
        setDistanza(obj.distanza || 0)
      } catch {}
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const nuovo = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          ts: Date.now(),
          acc: pos.coords.accuracy,
        }
        setPunti((prev) => {
          const last = prev[prev.length - 1]
          if (last) {
            const dist = distanzaKm(last, nuovo) * 1000 // metri
            if (dist < SOGLIA_MIN_METRI) return prev
            setDistanza((d) => {
              const nuovaDist = d + distanzaKm(last, nuovo)
              localStorage.setItem(
                `tracking_${movimentoId}`,
                JSON.stringify({ punti: [...prev, nuovo], distanza: nuovaDist }),
              )
              return nuovaDist
            })
          } else {
            localStorage.setItem(
              `tracking_${movimentoId}`,
              JSON.stringify({ punti: [nuovo], distanza: 0 }),
            )
          }
          return [...prev, nuovo]
        })
      },
      (err) => setErrore('GPS: ' + err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [tracking, movimentoId])

  const durataMs = tracking
    ? now - new Date(inizioAt).getTime()
    : inizioAt && fineAt
    ? new Date(fineAt).getTime() - new Date(inizioAt).getTime()
    : 0

  if (!inizioAt) {
    // Stato: non avviato
    return (
      <div className="rounded-2xl bg-white shadow p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">Tracking trasfer</p>
            <p className="text-xs text-slate-500">
              Avvia per registrare percorso e tempi via GPS.
            </p>
          </div>
        </div>
        <form action={azioneInizia}>
          <input type="hidden" name="id" value={movimentoId} />
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            ▶ Inizia trasfer
          </button>
        </form>
      </div>
    )
  }

  if (tracking) {
    // Stato: in corso
    return (
      <div className="rounded-2xl bg-white shadow p-5 space-y-3 border-2 border-indigo-200">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <p className="font-semibold">Tracking in corso</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Durata" value={formatDurata(durataMs)} />
          <Stat label="Distanza" value={`${distanza.toFixed(2)} km`} />
          <Stat label="Punti" value={punti.length} />
        </div>

        {errore && (
          <p className="text-xs text-red-600">{errore}</p>
        )}

        <p className="text-xs text-slate-500 text-center">
          Mantieni schermo acceso. GPS attivo.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <form action={azioneAnnulla}>
            <input type="hidden" name="id" value={movimentoId} />
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-300 bg-white text-sm font-medium py-2.5 hover:bg-slate-50"
              onClick={() => localStorage.removeItem(`tracking_${movimentoId}`)}
            >
              Annulla
            </button>
          </form>
          <form action={azioneTermina}>
            <input type="hidden" name="id" value={movimentoId} />
            <input type="hidden" name="traccia" value={JSON.stringify(punti)} />
            <input type="hidden" name="distanza_km" value={distanza.toFixed(3)} />
            <button
              type="submit"
              className="w-full rounded-lg bg-green-600 text-white font-semibold py-2.5 hover:bg-green-700 active:bg-green-800"
              onClick={() => localStorage.removeItem(`tracking_${movimentoId}`)}
            >
              ■ Termina
            </button>
          </form>
        </div>
      </div>
    )
  }

  return null
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <p className="text-[10px] uppercase text-slate-500 font-semibold">
        {label}
      </p>
      <p className="font-bold text-sm mt-0.5">{value}</p>
    </div>
  )
}
