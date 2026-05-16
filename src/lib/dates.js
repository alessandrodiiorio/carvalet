const TZ = 'Europe/Rome'

const fmtYmd = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const fmtYm = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
})

export function oggiItaliaYmd() {
  return fmtYmd.format(new Date())
}

export function meseItaliaYm() {
  return fmtYm.format(new Date()).slice(0, 7)
}

function offsetMinutiItalia(date) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = f.formatToParts(date).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {})
  const ora = parts.hour === '24' ? 0 : Number(parts.hour)
  const local = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    ora,
    Number(parts.minute),
    Number(parts.second)
  )
  return Math.round((local - date.getTime()) / 60000)
}

function mezzanotteItalia(yyyy, mm, dd) {
  const guess = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0))
  const off = offsetMinutiItalia(guess)
  return new Date(guess.getTime() - off * 60000)
}

export function boundsGiornoIso(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  const start = mezzanotteItalia(y, m, d)
  const end = mezzanotteItalia(y, m, d + 1)
  return { da: start.toISOString(), a: end.toISOString() }
}

export function boundsMeseIso(ym) {
  const [y, m] = ym.split('-').map(Number)
  const start = mezzanotteItalia(y, m, 1)
  const end = mezzanotteItalia(y, m + 1, 1)
  return { da: start.toISOString(), a: end.toISOString() }
}

export function formatDataLunga(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatMeseLungo(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatOraIta(iso) {
  return new Date(iso).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

export function formatPrezzo(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n))
}

// IVA standard IT
export const IVA_RATE = 0.22

export function calcolaIva(imponibile) {
  return Number(imponibile) * IVA_RATE
}

export function totaleLordo(imponibile) {
  return Number(imponibile) * (1 + IVA_RATE)
}
