// NHTSA vPIC: lista modelli per marca. Cache 24h.
// Es: /api/auto/modelli?marca=FIAT

export const revalidate = 86400

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const marca = (searchParams.get('marca') || '').trim()
  if (!marca) {
    return Response.json({ error: 'param "marca" mancante' }, { status: 400 })
  }

  const url =
    'https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/' +
    encodeURIComponent(marca) +
    '?format=json'

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) {
      return Response.json({ error: 'NHTSA upstream error' }, { status: 502 })
    }
    const json = await res.json()
    const modelli = Array.from(
      new Set(
        (json?.Results ?? [])
          .map((r) => (r.Model_Name || '').trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, 'it'))

    return Response.json({ marca: marca.toUpperCase(), modelli })
  } catch (e) {
    return Response.json({ error: String(e?.message ?? e) }, { status: 500 })
  }
}
