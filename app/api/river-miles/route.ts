import { computeRiverDistance, RiverDistanceError } from '@/lib/riverDistance'

export async function POST(request: Request) {
  let body: {
    putIn?: { lat: number; lng: number }
    takeOut?: { lat: number; lng: number }
    river?: string
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { putIn, takeOut, river } = body
  if (!isCoord(putIn) || !isCoord(takeOut)) {
    return Response.json({ error: 'Both put-in and take-out coordinates are required.' }, { status: 400 })
  }

  try {
    const result = await computeRiverDistance(putIn, takeOut, river)
    return Response.json(result)
  } catch (error) {
    if (error instanceof RiverDistanceError) {
      return Response.json({ error: error.message }, { status: 422 })
    }
    console.error('river-miles failed', error)
    return Response.json({ error: 'Could not calculate river miles right now.' }, { status: 502 })
  }
}

function isCoord(value: unknown): value is { lat: number; lng: number } {
  if (!value || typeof value !== 'object') return false
  const { lat, lng } = value as { lat: unknown; lng: unknown }
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  )
}
