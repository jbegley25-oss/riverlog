// Known commercially-run put-in/take-out reaches and their mileage, so the
// log wizard can auto-fill "Miles on River" instead of making guides guess.
//
// Sources: American Whitewater run descriptions and published outfitter
// section guides (Wilderness Aware, AVA, etc). These are APPROXIMATE —
// published figures often round or vary slightly by exact access point.
// Treat as a starting estimate; the miles field stays editable so a guide
// can always correct it. Coverage is partial — rivers/reaches not listed
// here (or point combos not in this table) simply fall back to manual entry.
export type RiverSegment = { putIn: string; takeOut: string; miles: number }

export const RIVER_SEGMENTS: Record<string, RiverSegment[]> = {
  'Arkansas River': [
    { putIn: 'Ruby Mountain', takeOut: 'Hecla Junction', miles: 8 }, // Browns Canyon
    { putIn: 'Parkdale', takeOut: 'Centennial Park (Cañon City)', miles: 9 }, // Royal Gorge
  ],
  'Colorado River': [
    { putIn: 'Gore Canyon', takeOut: 'Pumphouse', miles: 9.2 },
    { putIn: 'Pumphouse', takeOut: 'Rancho del Rio', miles: 11.6 },
    { putIn: 'State Bridge', takeOut: 'Dotsero', miles: 45 },
    { putIn: 'Shoshone', takeOut: 'Grizzly Creek', miles: 1.6 },
  ],
  'Clear Creek': [
    { putIn: 'Idaho Springs', takeOut: "Kermit's", miles: 5 },
    { putIn: "Kermit's", takeOut: 'Hwy 6/119', miles: 3.6 },
  ],
  'Animas River': [
    { putIn: 'Rockwood', takeOut: 'Tacoma', miles: 24.2 },
    { putIn: 'Trimble', takeOut: '32nd Street', miles: 5.5 },
  ],
  'Dolores River': [
    { putIn: 'Bradfield Bridge', takeOut: 'Mountain Sheep Point', miles: 19 },
    { putIn: 'Mountain Sheep Point', takeOut: 'Slick Rock', miles: 28.3 },
    { putIn: 'Slick Rock', takeOut: 'Gypsum Valley', miles: 14 },
    { putIn: 'Slick Rock', takeOut: 'Bedrock', miles: 50 },
  ],
  'Gunnison River': [
    { putIn: 'Chukar', takeOut: 'Gunnison Forks', miles: 14 },
  ],
  'Blue River': [
    { putIn: 'Blue River Campground', takeOut: 'Columbine Landing', miles: 2.5 },
    { putIn: 'Hammer Bridge', takeOut: 'Columbine Landing', miles: 5 },
    { putIn: 'Green Mountain Dam', takeOut: 'Kremmling', miles: 13.8 },
    { putIn: 'Spring Creek Road', takeOut: 'Kremmling', miles: 10 },
  ],
  'Roaring Fork': [
    { putIn: 'Slaughterhouse Bridge', takeOut: 'Cemetery Lane', miles: 5 },
    { putIn: 'Upper Woody Creek Bridge', takeOut: 'Basalt', miles: 10 },
    { putIn: 'Lower Woody Creek Bridge', takeOut: 'Basalt', miles: 6.2 },
  ],
  'Taylor River': [
    { putIn: 'Lottis Creek', takeOut: 'Southbank', miles: 8 },
    { putIn: 'Southbank', takeOut: 'Five-Mile Bridge', miles: 2.5 },
  ],
  'North Platte': [
    { putIn: 'Routt Access', takeOut: 'Six-Mile Gap', miles: 9.8 }, // Northgate Canyon
  ],
  'Rio Grande': [
    { putIn: 'Wagon Wheel Gap', takeOut: 'South Fork', miles: 9 },
    { putIn: 'River Hill Campground', takeOut: 'Box Canyon Bridge', miles: 6.5 },
  ],
  'South Platte': [
    { putIn: 'Eleven Mile Reservoir', takeOut: 'Lake George', miles: 6 },
  ],
  'Green River': [
    { putIn: 'Gates of Lodore', takeOut: 'Echo Park', miles: 19 },
    { putIn: 'Rainbow Park', takeOut: 'Split Mountain', miles: 9 },
  ],
  'Cache la Poudre': [
    { putIn: 'Upper Mishawaka', takeOut: 'The Bridges', miles: 10.3 },
    { putIn: 'Poudre Park', takeOut: 'The Bridges', miles: 2 },
  ],
}

/** Exact-match lookup, checked in both directions. Returns null if the pair isn't known. */
export function getRiverMiles(river: string, putIn: string, takeOut: string): number | null {
  const segments = RIVER_SEGMENTS[river]
  if (!segments || !putIn || !takeOut) return null
  const match = segments.find(
    s => (s.putIn === putIn && s.takeOut === takeOut) || (s.putIn === takeOut && s.takeOut === putIn)
  )
  return match ? match.miles : null
}

/** Unique named access points for a river, for quick-select buttons. */
export function getRiverPoints(river: string): string[] {
  const segments = RIVER_SEGMENTS[river]
  if (!segments) return []
  const points = new Set<string>()
  segments.forEach(s => {
    points.add(s.putIn)
    points.add(s.takeOut)
  })
  return Array.from(points)
}
