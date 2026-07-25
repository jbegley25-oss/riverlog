// Resolves a typed put-in/take-out name into candidate coordinates.
// Runs server-side so the OSM Nominatim usage policy (identifying User-Agent,
// modest request rate) is honoured in one place rather than from every phone.

type NominatimResult = { lat: string; lon: string; display_name: string }

// This log book only covers Colorado, so every search is clamped to the state
// rectangle. Without it "Bridge Street" happily lands in Oregon.
const CO_VIEWBOX = '-109.16,41.1,-101.94,36.9'

function coloradoSearch(q: string) {
  return new URLSearchParams({
    q,
    format: 'json',
    limit: '5',
    countrycodes: 'us',
    viewbox: CO_VIEWBOX,
    bounded: '1',
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const river = searchParams.get('river')?.trim()

  if (!query || query.length < 2) return Response.json({ results: [] })

  // Accept a pasted "lat, lng" pair directly.
  const coordMatch = query.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1])
    const lng = parseFloat(coordMatch[2])
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return Response.json({ results: [{ label: `${lat}, ${lng}`, lat, lng }] })
    }
  }

  // Naming a river alongside the access point disambiguates the many
  // "Bridge Street" and "Second Bridge" style put-ins around the state.
  const search = coloradoSearch(river ? `${query}, ${river}, Colorado` : `${query}, Colorado`)

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${search}`, {
      headers: { 'User-Agent': 'riverlog/1.0 (river trip logbook)' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return Response.json({ results: [] })
    const data = (await res.json()) as NominatimResult[]

    let results = data.map(r => ({
      label: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }))

    // Retry without the river qualifier if it over-constrained the search.
    if (!results.length && river) {
      const retry = coloradoSearch(`${query}, Colorado`)
      const res2 = await fetch(`https://nominatim.openstreetmap.org/search?${retry}`, {
        headers: { 'User-Agent': 'riverlog/1.0 (river trip logbook)' },
        next: { revalidate: 86400 },
      })
      if (res2.ok) {
        results = ((await res2.json()) as NominatimResult[]).map(r => ({
          label: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        }))
      }
    }

    return Response.json({ results })
  } catch {
    return Response.json({ results: [] })
  }
}
