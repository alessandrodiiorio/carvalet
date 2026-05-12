// Nominatim reverse geocoding: lat/lon -> indirizzo.

const USER_AGENT = 'CarValet/1.0 (https://carvalet.vercel.app)'

export const revalidate = 3600

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon') || searchParams.get('lng')
  if (!lat || !lon) {
    return Response.json({ error: 'lat e lon obbligatori' }, { status: 400 })
  }

  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', lat)
  url.searchParams.set('lon', lon)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('accept-language', 'it')

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'it' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      return Response.json({ error: 'Nominatim upstream error' }, { status: 502 })
    }
    const r = await res.json()
    const a = r.address || {}
    const via = [a.road, a.house_number].filter(Boolean).join(' ')
    const citta = a.city || a.town || a.village || a.municipality
    const cap = a.postcode
    const short = [via, [cap, citta].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', ')

    return Response.json({
      label: r.display_name,
      short: short || r.display_name,
      lat: r.lat,
      lon: r.lon,
    })
  } catch (e) {
    return Response.json({ error: String(e?.message ?? e) }, { status: 500 })
  }
}
