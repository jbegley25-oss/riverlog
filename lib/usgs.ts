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
    usgsSiteId: '09085100',
    usgsSiteName: 'Colorado River below Glenwood Springs, CO',
    monitoringUrl: 'https://waterdata.usgs.gov/monitoring-location/USGS-09085100/#dataTypeId=continuous-00065-0&period=P7D&showFieldMeasurements=true',
  },
  {
    id: 'dotsero',
    label: 'Upper Colorado (Dotsero)',
    usgsSiteId: '09070500',
    usgsSiteName: 'Colorado River near Dotsero, CO',
    monitoringUrl: 'https://waterdata.usgs.gov/monitoring-location/USGS-09070500/#dataTypeId=continuous-00065-0&period=P7D&showFieldMeasurements=true',
  },
]

export function usgsGraphUrl(siteId: string) {
  return `https://nwis.waterdata.usgs.gov/nwisweb/graph?agency_cd=USGS&site_no=${siteId}&parm_cd=00060&period=7`
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
