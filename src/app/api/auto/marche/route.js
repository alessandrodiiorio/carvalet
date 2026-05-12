// NHTSA vPIC: lista marche per tipo veicolo "car" (auto passeggeri).
// Cache 24h sul server (dati quasi-statici).

const URL_NHTSA =
  'https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json'

// Marche comuni in IT da mostrare in cima alla lista.
const MARCHE_PRIORITARIE = [
  'FIAT', 'LANCIA', 'ALFA ROMEO', 'FERRARI', 'MASERATI', 'JEEP',
  'VOLKSWAGEN', 'AUDI', 'BMW', 'MERCEDES-BENZ', 'PORSCHE', 'OPEL',
  'PEUGEOT', 'CITROEN', 'CITROËN', 'RENAULT', 'DACIA', 'SEAT', 'SKODA', 'ŠKODA',
  'TOYOTA', 'HONDA', 'NISSAN', 'MAZDA', 'SUZUKI', 'SUBARU', 'MITSUBISHI',
  'HYUNDAI', 'KIA', 'FORD', 'CHEVROLET', 'VOLVO', 'JAGUAR', 'LAND ROVER',
  'MINI', 'SMART', 'TESLA', 'DS', 'CUPRA',
]

export const revalidate = 86400 // 24h

export async function GET() {
  try {
    const res = await fetch(URL_NHTSA, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) {
      return Response.json({ error: 'NHTSA upstream error' }, { status: 502 })
    }
    const json = await res.json()
    const tutte = (json?.Results ?? [])
      .map((r) => (r.MakeName || '').trim().toUpperCase())
      .filter(Boolean)

    const uniche = Array.from(new Set(tutte))
    const prioSet = new Set(MARCHE_PRIORITARIE)
    const top = uniche.filter((m) => prioSet.has(m)).sort()
    const altre = uniche.filter((m) => !prioSet.has(m)).sort()

    return Response.json({ top, altre, count: uniche.length })
  } catch (e) {
    return Response.json({ error: String(e?.message ?? e) }, { status: 500 })
  }
}
