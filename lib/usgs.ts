export type FlowSection = {
  id: string
  label: string
  usgsSiteId: string
  usgsSiteName: string
  monitoringUrl: string
}

export const FLOW_SECTIONS: FlowSection[] = [
  {
    id: 'shoshone',
    label: 'Shoshone',
    // Shoshone has no gauge of its own — American Whitewater and local guides use
    // the Dotsero gauge as the standard proxy reading for this run.
    usgsSiteId: '09070500',
    usgsSiteName: 'Colorado River near Dotsero, CO',
    monitoringUrl: 'https://waterdata.usgs.gov/monitoring-location/USGS-09070500/#dataTypeId=continuous-00060-0&period=P7D&showFieldMeasurements=true',
  },
  {
    id: 'dotsero',
    label: 'Upper Colorado (Dotsero)',
    usgsSiteId: '09070500',
    usgsSiteName: 'Colorado River near Dotsero, CO',
    monitoringUrl: 'https://waterdata.usgs.gov/monitoring-location/USGS-09070500/#dataTypeId=continuous-00060-0&period=P7D&showFieldMeasurements=true',
  },
]

export function usgsGraphUrl(siteId: string) {
  return `https://nwis.waterdata.usgs.gov/nwisweb/graph?agency_cd=USGS&site_no=${siteId}&parm_cd=00060&period=7`
}

export type UsgsSite = { siteId: string; name: string }

let coSitesCache: Promise<UsgsSite[]> | null = null

// Lazily fetches every active Colorado gauge that reports discharge (CFS),
// so guides can search for flow sections beyond the two quick-select defaults.
function loadColoradoSites(): Promise<UsgsSite[]> {
  if (!coSitesCache) {
    coSitesCache = fetch(
      'https://waterservices.usgs.gov/nwis/site/?format=rdb&stateCd=CO&siteType=ST&siteStatus=active&hasDataTypeCd=iv&parameterCd=00060'
    )
      .then(res => (res.ok ? res.text() : ''))
      .then(text =>
        text
          .split('\n')
          .filter(line => line && !line.startsWith('#'))
          .slice(2) // drop header row + RDB column-width row
          .map(line => {
            const cols = line.split('\t')
            return { siteId: (cols[1] || '').trim(), name: (cols[2] || '').trim() }
          })
          .filter(s => s.siteId && s.name)
      )
      .catch(() => [])
  }
  return coSitesCache
}

export async function searchUsgsSites(query: string, limit = 8): Promise<UsgsSite[]> {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const sites = await loadColoradoSites()
  return sites.filter(s => s.name.toLowerCase().includes(q)).slice(0, limit)
}

export function usgsMonitoringUrl(siteId: string) {
  return `https://waterdata.usgs.gov/monitoring-location/USGS-${siteId}/#dataTypeId=continuous-00060-0&period=P7D&showFieldMeasurements=true`
}

export async function fetchLatestCfs(siteId: string): Promise<{ value: number; dateTime: string } | null> {
  const res = await fetch(
    `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${siteId}&parameterCd=00060&period=P1D`
  )
  if (!res.ok) return null
  const data = await res.json()
  const series = data?.value?.timeSeries?.[0]?.values?.[0]?.value as { value: string; dateTime: string }[] | undefined
  if (!series?.length) return null
  const latest = series[series.length - 1]
  const value = parseFloat(latest.value)
  if (Number.isNaN(value)) return null
  return { value, dateTime: latest.dateTime }
}
