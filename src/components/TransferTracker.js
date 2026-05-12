'use client'

import { useEffect, useRef, useState, useTransition } from 'react'

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

const SOGLIA_MIN_METRI = 10

async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(`/api/geo/reverse?lat=${lat}&lon=${lon}`)
    const j = await r.json()
    if (j?.error) return null
    return j.short || j.label || null
  } catch {
    return null
  }
}

function getPosizione() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('GPS non supportato'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          acc: pos.coords.accuracy,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    )
  })
}

export default function TransferTracker({
  movimentoId,
  inizioAt,
  fineAt,
  azioneInizia,
  azioneTermina,
  azioneAnnulla,
}) {
  const [punti, setPunti] = useState([])
  const [distanza, setDistanza] = useState(0)
  const [errore, setErrore] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [statoInizio, setStatoInizio] = useState('idle') // idle | gps | invio
  const [statoFine, setStatoFine] = useState('idle')
  const [, startTransition] = useTransition()
  const watchIdRef = useRef(null)

  const tracking = !!inizioAt && !fineAt

  useEffect(() => {
    if (!tracking) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [tracking])

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
            const dist = distanzaKm(last, nuovo) * 1000
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

  async function handleInizia() {
    setErrore(null)
    setStatoInizio('gps')
    let luogo = null
    try {
      const pos = await getPosizione()
      luogo = await reverseGeocode(pos.lat, pos.lon)
    } catch (e) {
      setErrore('GPS: ' + (e?.message || 'errore'))
      // Procedi anche senza luogo
    }
    setStatoInizio('invio')
    const fd = new FormData()
    fd.set('id', movimentoId)
    if (luogo) fd.set('luogo_ritiro', luogo)
    startTransition(async () => {
      try {
        await azioneInizia(fd)
      } catch (e) {
        setErrore(String(e?.message ?? e))
      } finally {
        setStatoInizio('idle')
      }
    })
  }

  async function handleTermina() {
    setErrore(null)
    setStatoFine('gps')
    let luogo = null
    const last = punti[punti.length - 1]
    try {
      if (last) {
        luogo = await reverseGeocode(last.lat, last.lon)
      } else {
        const pos = await getPosizione()
        luogo = await reverseGeocode(pos.lat, pos.lon)
      }
    } catch (e) {
      setErrore('GPS: ' + (e?.message || 'errore'))
    }
    setStatoFine('invio')
    const fd = new FormData()
    fd.set('id', movimentoId)
    fd.set('traccia', JSON.stringify(punti))
    fd.set('distanza_km', distanza.toFixed(3))
    if (luogo) fd.set('luogo_consegna', luogo)
    localStorage.removeItem(`tracking_${movimentoId}`)
    startTransition(async () => {
      try {
        await azioneTermina(fd)
      } catch (e) {
        setErrore(String(e?.message ?? e))
      } finally {
        setStatoFine('idle')
      }
    })
  }

  if (!inizioAt) {
    const labelInizia =
      statoInizio === 'gps'
        ? 'Acquisizione GPS…'
        : statoInizio === 'invio'
        ? 'Avvio…'
        : '▶ Inizia trasfer'
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
              Registra percorso, tempi e luoghi automaticamente.
            </p>
          </div>
        </div>
        {errore && <p className="text-xs text-red-600">{errore}</p>}
        <button
          type="button"
          onClick={handleInizia}
          disabled={statoInizio !== 'idle'}
          className="w-full rounded-lg bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 transition-colors"
        >
          {labelInizia}
        </button>
      </div>
    )
  }

  if (tracking) {
    const labelTermina =
      statoFine === 'gps'
        ? 'Acquisizione GPS…'
        : statoFine === 'invio'
        ? 'Chiusura…'
        : '■ Termina'
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

        {errore && <p className="text-xs text-red-600">{errore}</p>}

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
          <button
            type="button"
            onClick={handleTermina}
            disabled={statoFine !== 'idle'}
            className="w-full rounded-lg bg-green-600 text-white font-semibold py-2.5 hover:bg-green-700 active:bg-green-800 disabled:opacity-60"
          >
            {labelTermina}
          </button>
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
