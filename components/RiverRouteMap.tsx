'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, Marker, Polyline } from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type MapPoint = { lat: number; lng: number }

type Props = {
  putIn: MapPoint
  takeOut: MapPoint
  /** Traced river course as [lng, lat] pairs, matching GeoJSON order. */
  path: [number, number][]
  onMove: (which: 'putIn' | 'takeOut', point: MapPoint) => void
}

// Leaflet touches `window` on import, so it is pulled in lazily on the client.
export default function RiverRouteMap({ putIn, takeOut, path, onMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const putInRef = useRef<Marker | null>(null)
  const takeOutRef = useRef<Marker | null>(null)
  const lineRef = useRef<Polyline | null>(null)
  // Held in a ref so the drag handler never closes over a stale callback.
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  useEffect(() => {
    let cancelled = false

    async function init() {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, { scrollWheelZoom: false, attributionControl: true })
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map)

      const pin = (color: string, label: string) =>
        L.divIcon({
          className: '',
          html: `<div style="background:${color};color:#04121f;font-size:10px;font-weight:700;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #04121f;box-shadow:0 2px 6px rgba(0,0,0,.5)">${label}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        })

      lineRef.current = L.polyline([], { color: '#22d3ee', weight: 4, opacity: 0.9 }).addTo(map)

      putInRef.current = L.marker([putIn.lat, putIn.lng], { draggable: true, icon: pin('#4ade80', 'IN') })
        .addTo(map)
        .on('dragend', e => {
          const { lat, lng } = e.target.getLatLng()
          onMoveRef.current('putIn', { lat, lng })
        })

      takeOutRef.current = L.marker([takeOut.lat, takeOut.lng], { draggable: true, icon: pin('#fbbf24', 'OUT') })
        .addTo(map)
        .on('dragend', e => {
          const { lat, lng } = e.target.getLatLng()
          onMoveRef.current('takeOut', { lat, lng })
        })

      mapRef.current = map
      draw()
    }

    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function draw() {
    const map = mapRef.current
    if (!map) return
    putInRef.current?.setLatLng([putIn.lat, putIn.lng])
    takeOutRef.current?.setLatLng([takeOut.lat, takeOut.lng])

    const latLngs: [number, number][] = path.length > 1
      ? path.map(([lng, lat]) => [lat, lng])
      : [
          [putIn.lat, putIn.lng],
          [takeOut.lat, takeOut.lng],
        ]
    lineRef.current?.setLatLngs(latLngs)
    map.fitBounds(latLngs, { padding: [30, 30], maxZoom: 14 })
  }

  useEffect(draw, [putIn, takeOut, path])

  // Leaflet mis-sizes itself when its container animates in; nudge it once mounted.
  useEffect(() => {
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 150)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ height: 280, width: '100%', borderRadius: 12, overflow: 'hidden', background: '#0a1628' }}
    />
  )
}
