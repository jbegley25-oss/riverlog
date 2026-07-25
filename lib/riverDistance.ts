// Computes true along-the-river distance between any put-in and take-out in the US
// by snapping both points onto the USGS National Hydrography Dataset flow network.
//
// Three independent sources are computed and cross-checked:
//   A. NHDPlus HR `pathlength` attribute arithmetic (USGS precomputed, 1:24k)
//   B. NHDPlus HR flowline geometry summed along the level path (1:24k)
//   C. NHDPlus V2 network trace via NLDI, geodesic-summed (1:100k)
// Agreement between them drives the reported confidence.
//
// The main accuracy trap is snapping: a naive "nearest flowline" lands on
// irrigation ditches and side channels instead of the main stem, which silently
// produces wrong distances. Candidates are therefore ranked by river-name match
// and stream order before proximity.

const HR_QUERY = 'https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer/3/query'
const NLDI = 'https://api.water.usgs.gov/nldi/linked-data'

const KM_TO_MI = 0.621371
const EARTH_RADIUS_MI = 3958.7613

export type LatLng = { lat: number; lng: number }

export type SnapResult = {
  snapped: LatLng
  snapDistanceMi: number
  riverName: string | null
  streamOrder: number | null
  /** Miles from the snapped point downstream to the network terminus. */
  distanceToTerminusMi: number
  levelPathId: number
  hydroSeq: number
  flowlineLengthMi: number
  /** Miles from the snapped point to the downstream end of its own flowline. */
  toFlowlineEndMi: number
}

export type DistanceSource = { name: string; miles: number }

export type RiverDistanceResult = {
  miles: number
  spreadMi: number
  confidence: 'high' | 'medium' | 'low'
  sources: DistanceSource[]
  putIn: SnapResult
  takeOut: SnapResult
  /** [lng, lat] vertices of the traced river course, for drawing on the map. */
  path: [number, number][]
  /** True when the take-out was upstream of the put-in and the two were swapped. */
  reversed: boolean
  warnings: string[]
}

export class RiverDistanceError extends Error {}

// Colorado is a rectangle: 37–41°N, 102°03'–109°03'W. A tenth of a degree of
// slack keeps access points that sit just over a state line from being rejected.
const CO_BOUNDS = { south: 36.9, north: 41.1, west: -109.16, east: -101.94 }

export function isInColorado({ lat, lng }: LatLng): boolean {
  return lat >= CO_BOUNDS.south && lat <= CO_BOUNDS.north && lng >= CO_BOUNDS.west && lng <= CO_BOUNDS.east
}

type HrAttributes = {
  gnis_name: string | null
  lengthkm: number
  pathlength: number
  hydroseq: number
  levelpathi: number
  streamorde: number
  flowdir: number
}
type HrFeature = { attributes: HrAttributes; geometry?: { paths: [number, number][][] } }

function haversineMi(a: [number, number], b: [number, number]): number {
  const [lon1, lat1] = a
  const [lon2, lat2] = b
  const p1 = (lat1 * Math.PI) / 180
  const p2 = (lat2 * Math.PI) / 180
  const dp = p2 - p1
  const dl = ((lon2 - lon1) * Math.PI) / 180
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h))
}

function pathLengthMi(coords: [number, number][]): number {
  let total = 0
  for (let i = 0; i < coords.length - 1; i++) total += haversineMi(coords[i], coords[i + 1])
  return total
}

/**
 * Nearest point on a polyline, with the along-line distance from that point to
 * the line's final vertex. Projection is done in a locally-scaled planar frame,
 * which is accurate to well under a meter at the scale of a single flowline.
 */
function nearestOnPath(path: [number, number][], point: [number, number]) {
  let best = { distMi: Infinity, snapped: path[0], segIndex: 0, t: 0 }
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]
    const b = path[i + 1]
    const kx = Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180))
    const ax = a[0] * kx
    const bx = b[0] * kx
    const px = point[0] * kx
    const dx = bx - ax
    const dy = b[1] - a[1]
    const len2 = dx * dx + dy * dy
    let t = len2 ? ((px - ax) * dx + (point[1] - a[1]) * dy) / len2 : 0
    t = Math.max(0, Math.min(1, t))
    const snapped: [number, number] = [(ax + t * dx) / kx, a[1] + t * dy]
    const distMi = haversineMi(point, snapped)
    if (distMi < best.distMi) best = { distMi, snapped, segIndex: i, t }
  }
  let toEnd = haversineMi(best.snapped, path[best.segIndex + 1])
  for (let i = best.segIndex + 1; i < path.length - 1; i++) toEnd += haversineMi(path[i], path[i + 1])
  return { ...best, toEndMi: toEnd }
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': 'riverlog/1.0 (river trip logbook)', ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new RiverDistanceError(`Upstream request failed (${res.status})`)
  return res.json()
}

async function queryHr(params: Record<string, string>) {
  const search = new URLSearchParams({ f: 'json', ...params })
  const data = await fetchJson(`${HR_QUERY}?${search}`)
  if (data.error) throw new RiverDistanceError(data.error.message ?? 'NHD query failed')
  return (data.features ?? []) as HrFeature[]
}

const HR_FIELDS = 'gnis_name,lengthkm,pathlength,hydroseq,levelpathi,streamorde,flowdir'

/**
 * Snaps a coordinate onto the main stem. Widening search radii are tried in turn;
 * within each, candidates are scored so that a name match beats a bigger stream,
 * which in turn beats raw proximity — this is what keeps pins off side channels.
 */
export async function snapToRiver(point: LatLng, riverNameHint?: string): Promise<SnapResult> {
  const target: [number, number] = [point.lng, point.lat]
  const hint = normalizeRiverName(riverNameHint)

  // Always search a wide radius before ranking. Returning as soon as a narrow
  // search finds anything is how pins end up on irrigation ditches that happen
  // to run closer to the parking lot than the river does.
  for (const meters of [1500, 4000, 10000]) {
    const features = await queryHr({
      geometry: JSON.stringify({ x: point.lng, y: point.lat, spatialReference: { wkid: 4326 } }),
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      distance: String(meters),
      units: 'esriSRUnit_Meter',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: HR_FIELDS,
      returnGeometry: 'true',
      outSR: '4326',
    })

    const scored = features
      .filter(f => f.geometry?.paths?.length && f.attributes.levelpathi != null)
      .map(f => {
        const line = orientedPath(f)
        const near = nearestOnPath(line, target)
        const nameMatch = hint != null && normalizeRiverName(f.attributes.gnis_name) === hint
        const order = f.attributes.streamorde ?? 0
        const named = f.attributes.gnis_name ? 1 : 0
        // Proximity only breaks ties; a named/larger channel a little farther away
        // is nearly always the intended river. Distance is squared so that a pin
        // dropped right on the water still wins among equally-plausible channels.
        const score = (nameMatch ? 1000 : 0) + named * 25 + order * 15 - near.distMi ** 2
        return { feature: f, line, near, score }
      })

    if (!scored.length) continue
    scored.sort((a, b) => b.score - a.score)
    const winner = scored[0]
    const attrs = winner.feature.attributes
    const lengthMi = attrs.lengthkm * KM_TO_MI

    return {
      snapped: { lat: winner.near.snapped[1], lng: winner.near.snapped[0] },
      snapDistanceMi: winner.near.distMi,
      riverName: attrs.gnis_name,
      streamOrder: attrs.streamorde ?? null,
      distanceToTerminusMi: attrs.pathlength * KM_TO_MI + winner.near.toEndMi,
      levelPathId: attrs.levelpathi,
      hydroSeq: attrs.hydroseq,
      flowlineLengthMi: lengthMi,
      toFlowlineEndMi: winner.near.toEndMi,
    }
  }

  throw new RiverDistanceError('No mapped river channel found near that location.')
}

/** HR geometry is digitized in the direction of flow unless flowdir says otherwise. */
function orientedPath(feature: HrFeature): [number, number][] {
  const path = feature.geometry!.paths[0].map(([x, y]) => [x, y] as [number, number])
  return feature.attributes.flowdir === 1 ? path : path.reverse()
}

export function normalizeRiverName(name?: string | null): string | null {
  if (!name) return null
  return name.toLowerCase().replace(/\b(river|creek|fork|the)\b/g, '').replace(/[^a-z]/g, '') || null
}

/**
 * Source B + the map polyline: every flowline between the two points on their
 * shared level path, ordered upstream to downstream and trimmed to the pins.
 */
async function traceLevelPath(putIn: SnapResult, takeOut: SnapResult) {
  if (putIn.levelPathId !== takeOut.levelPathId) return null

  const [lo, hi] = [takeOut.hydroSeq, putIn.hydroSeq].sort((a, b) => a - b)
  const features = await queryHr({
    where: `levelpathi=${putIn.levelPathId} AND hydroseq>=${lo} AND hydroseq<=${hi}`,
    outFields: HR_FIELDS,
    returnGeometry: 'true',
    outSR: '4326',
    resultRecordCount: '4000',
  })
  if (!features.length) return null

  // hydroseq increases going upstream, so descending order walks downstream.
  features.sort((a, b) => b.attributes.hydroseq - a.attributes.hydroseq)

  const totalMi = features.reduce((sum, f) => sum + f.attributes.lengthkm * KM_TO_MI, 0)
  const abovePutIn = putIn.flowlineLengthMi - putIn.toFlowlineEndMi
  const trimmed = totalMi - abovePutIn - takeOut.toFlowlineEndMi

  const path: [number, number][] = []
  for (const f of features) {
    for (const vertex of orientedPath(f)) {
      const last = path[path.length - 1]
      if (!last || last[0] !== vertex[0] || last[1] !== vertex[1]) path.push(vertex)
    }
  }

  return { miles: trimmed, path: trimPathToPins(path, putIn, takeOut) }
}

function trimPathToPins(path: [number, number][], putIn: SnapResult, takeOut: SnapResult): [number, number][] {
  if (path.length < 2) return path
  const start = nearestOnPath(path, [putIn.snapped.lng, putIn.snapped.lat])
  const end = nearestOnPath(path, [takeOut.snapped.lng, takeOut.snapped.lat])
  const from = Math.min(start.segIndex + 1, end.segIndex + 1)
  const to = Math.max(start.segIndex, end.segIndex)
  return [
    [putIn.snapped.lng, putIn.snapped.lat],
    ...path.slice(from, to + 1),
    [takeOut.snapped.lng, takeOut.snapped.lat],
  ]
}

/** Source C: independent trace over the coarser NHDPlus V2 network via NLDI. */
async function traceV2(
  putIn: SnapResult,
  takeOut: SnapResult
): Promise<{ miles: number; path: [number, number][] } | null> {
  const locate = async (p: LatLng) => {
    const data = await fetchJson(`${NLDI}/hydrolocation?coords=POINT(${p.lng} ${p.lat})`)
    const props = data?.features?.[0]?.properties
    if (typeof props?.comid !== 'number' || typeof props?.measure !== 'number') return null
    return { comid: props.comid as number, measure: props.measure as number }
  }

  const [p, t] = await Promise.all([locate(putIn.snapped), locate(takeOut.snapped)])
  if (!p || !t) return null

  const nav = await fetchJson(
    `${NLDI}/comid/${p.comid}/navigation/DM/flowlines?f=json&distance=500`
  )
  const features = (nav?.features ?? []) as {
    properties: { nhdplus_comid: number }
    geometry: { coordinates: [number, number][] }
  }[]

  let total = 0
  let firstLen: number | null = null
  let lastLen: number | null = null
  const path: [number, number][] = []
  for (const feature of features) {
    const len = pathLengthMi(feature.geometry.coordinates)
    if (feature.properties.nhdplus_comid === p.comid) firstLen = len
    total += len
    for (const vertex of feature.geometry.coordinates) {
      const last = path[path.length - 1]
      if (!last || last[0] !== vertex[0] || last[1] !== vertex[1]) path.push(vertex)
    }
    if (feature.properties.nhdplus_comid === t.comid) {
      lastLen = len
      break
    }
  }
  if (firstLen == null || lastLen == null) return null

  // NHDPlus measure is the percent along the flowline from its downstream end.
  const miles = total - (1 - p.measure / 100) * firstLen - (t.measure / 100) * lastLen
  return { miles, path: trimPathToPins(path, putIn, takeOut) }
}

export async function computeRiverDistance(
  putInPoint: LatLng,
  takeOutPoint: LatLng,
  riverNameHint?: string
): Promise<RiverDistanceResult> {
  if (!isInColorado(putInPoint) || !isInColorado(takeOutPoint)) {
    throw new RiverDistanceError('This log book only covers Colorado rivers — both points must be in Colorado.')
  }

  let [putIn, takeOut] = await Promise.all([
    snapToRiver(putInPoint, riverNameHint),
    snapToRiver(takeOutPoint, riverNameHint),
  ])

  const warnings: string[] = []

  // Distance to the network terminus decreases downstream, so a negative
  // difference means the trip was entered the wrong way round.
  const reversed = putIn.distanceToTerminusMi < takeOut.distanceToTerminusMi
  if (reversed) {
    ;[putIn, takeOut] = [takeOut, putIn]
    warnings.push('Take-out was upstream of the put-in, so the two were swapped.')
  }

  const sources: DistanceSource[] = []
  const pathlengthMiles = putIn.distanceToTerminusMi - takeOut.distanceToTerminusMi
  if (pathlengthMiles > 0) sources.push({ name: 'NHDPlus HR pathlength', miles: pathlengthMiles })

  const levelPath = await traceLevelPath(putIn, takeOut)
  if (levelPath && levelPath.miles > 0) {
    sources.push({ name: 'NHDPlus HR flowline geometry', miles: levelPath.miles })
  }

  let v2: { miles: number; path: [number, number][] } | null = null
  try {
    v2 = await traceV2(putIn, takeOut)
    if (v2 && v2.miles > 0) sources.push({ name: 'NHDPlus V2 network trace', miles: v2.miles })
  } catch {
    // The coarser dataset is a cross-check only; losing it is not fatal.
  }

  if (sources.length < 2) {
    warnings.push('Only one dataset could trace this route, so the distance is unverified.')
  }

  if (!sources.length) {
    throw new RiverDistanceError(
      'Could not trace a continuous river course between those two points. Check that both pins are on the same river.'
    )
  }

  const values = sources.map(s => s.miles).sort((a, b) => a - b)
  const median =
    values.length % 2
      ? values[(values.length - 1) / 2]
      : (values[values.length / 2 - 1] + values[values.length / 2]) / 2
  const spreadMi = values[values.length - 1] - values[0]
  const worstSnapMi = Math.max(putIn.snapDistanceMi, takeOut.snapDistanceMi)

  if (worstSnapMi > 0.25) {
    warnings.push('One of the pins was well off the water — drag it onto the river for a better result.')
  }
  if (putIn.riverName && takeOut.riverName && putIn.riverName !== takeOut.riverName) {
    warnings.push(`Pins landed on different waterways (${putIn.riverName} and ${takeOut.riverName}).`)
  }

  const confidence =
    sources.length >= 2 && spreadMi <= 0.3 && worstSnapMi <= 0.1
      ? 'high'
      : spreadMi <= 1 && worstSnapMi <= 0.35
      ? 'medium'
      : 'low'

  return {
    miles: Math.round(median * 10) / 10,
    spreadMi: Math.round(spreadMi * 100) / 100,
    confidence,
    sources: sources.map(s => ({ name: s.name, miles: Math.round(s.miles * 100) / 100 })),
    putIn,
    takeOut,
    // Prefer the high-resolution course; fall back to the coarser trace before
    // ever drawing a meaningless straight line between the pins.
    path: levelPath?.path ??
      v2?.path ?? [
        [putIn.snapped.lng, putIn.snapped.lat],
        [takeOut.snapped.lng, takeOut.snapped.lat],
      ],
    reversed,
    warnings,
  }
}
