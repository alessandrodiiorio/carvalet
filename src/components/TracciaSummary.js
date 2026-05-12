// Server component: stats finali + link Google Maps con waypoint

function formatDataOra(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDurata(ms) {
  if (!ms || ms < 0) return '—'
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function googleMapsUrl(traccia) {
  if (!Array.isArray(traccia) || traccia.length < 2) return null
  // Campiona max 9 waypoint (limite URL gestibile)
  const step = Math.max(1, Math.floor(traccia.length / 9))
  const sampled = []
  for (let i = 0; i < traccia.length; i += step) sampled.push(traccia[i])
  if (sampled[sampled.length - 1] !== traccia[traccia.length - 1]) {
    sampled.push(traccia[traccia.length - 1])
  }
  const points = sampled.map((p) => `${p.lat},${p.lon}`).join('/')
  return `https://www.google.com/maps/dir/${points}`
}

export default function TracciaSummary({
  inizioAt,
  fineAt,
  distanzaKm,
  traccia,
}) {
  const durataMs =
    inizioAt && fineAt
      ? new Date(fineAt).getTime() - new Date(inizioAt).getTime()
      : 0
  const mapsUrl = googleMapsUrl(traccia)
  const punti = Array.isArray(traccia) ? traccia.length : 0
  const velMedia =
    durataMs > 0 && distanzaKm
      ? (Number(distanzaKm) / (durataMs / 3600000)).toFixed(0)
      : null

  return (
    <div className="rounded-2xl bg-white shadow p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">✅</span>
        <h2 className="font-semibold">Trasfer completato</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Row label="Inizio" value={formatDataOra(inizioAt)} />
        <Row label="Fine" value={formatDataOra(fineAt)} />
        <Row label="Durata" value={formatDurata(durataMs)} />
        <Row
          label="Distanza"
          value={distanzaKm ? `${Number(distanzaKm).toFixed(2)} km` : '—'}
        />
        {velMedia && <Row label="Velocità media" value={`${velMedia} km/h`} />}
        <Row label="Punti GPS" value={punti} />
      </div>

      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-slate-900 text-white font-medium py-2.5 hover:bg-slate-800 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Apri percorso su Google Maps
        </a>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-[10px] uppercase text-slate-500 font-semibold">
        {label}
      </p>
      <p className="font-medium mt-0.5">{value ?? '—'}</p>
    </div>
  )
}
