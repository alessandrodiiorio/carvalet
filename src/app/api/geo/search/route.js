// Nominatim search proxy. Respect usage policy (User-Agent + rate limit).
// Cache risultati per query (1h).

const USER_AGENT = 'DriverSolution2025/1.0 (https://driversolution2025.vercel.app)'

export const revalidate = 3600

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  if (q.length < 3) {
    return Response.json({ results: [] })
  }

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '6')
  url.searchParams.set('accept-language', 'it')
  url.searchParams.set('countrycodes', 'it')

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'it' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      return Response.json({ error: 'Nominatim upstream error' }, { status: 502 })
    }
    const data = await res.json()
    const results = (data || []).map((r) => ({
      label: r.display_name,
      short: shortLabel(r),
      lat: r.lat,
      lon: r.lon,
    }))
    return Response.json({ results })
  } catch (e) {
    return Response.json({ error: String(e?.message ?? e) }, { status: 500 })
  }
}

function shortLabel(r) {
  const a = r.address || {}
  const via = [a.road, a.house_number].filter(Boolean).join(' ')
  const citta = a.city || a.town || a.village || a.municipality
  const cap = a.postcode
  const parts = [via, [cap, citta].filter(Boolean).join(' ')].filter(Boolean)
  return parts.join(', ') || r.display_name
}
