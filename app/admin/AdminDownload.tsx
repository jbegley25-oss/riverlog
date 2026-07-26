'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LogEntry, Profile } from '@/lib/types'

export default function AdminDownload({ profiles }: { profiles: (Profile & { log_entries: LogEntry[] })[] }) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)

  async function downloadAll() {
    setGenerating(true)
    try {
      const [{ generateLogSheetPDF }, { default: JSZip }] = await Promise.all([
        import('@/lib/pdf/generatePDF'),
        import('jszip'),
      ])
      const zip = new JSZip()
      const exportedIds: string[] = []

      for (const p of profiles) {
        if (!p.log_entries?.length) continue
        // One guide's PDF failing (bad data, etc.) shouldn't stop the rest.
        try {
          const blob = await generateLogSheetPDF(p as Profile, p.log_entries)
          const first = (p.first_name || 'Unknown').trim().replace(/\s+/g, '_')
          const last = (p.last_name || 'Unknown').trim().replace(/\s+/g, '_')
          zip.file(`${first}_${last}_RiverLog2026.pdf`, blob)
          exportedIds.push(...p.log_entries.map(e => e.id))
        } catch (e) {
          console.error(`Failed to generate PDF for ${p.first_name} ${p.last_name}`, e)
        }
      }

      if (!exportedIds.length) return

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `RiverLog2026_AllGuides.zip`
      a.click()
      URL.revokeObjectURL(url)

      const supabase = createClient()
      await supabase.from('log_entries').update({ exported_at: new Date().toISOString() }).in('id', exportedIds)
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button onClick={downloadAll} disabled={generating}
      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#22d3ee', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>
      <Download size={14} />
      {generating ? 'Generating…' : 'Export All'}
    </button>
  )
}
