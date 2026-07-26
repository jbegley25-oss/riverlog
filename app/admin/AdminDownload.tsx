'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { LogEntry, Profile } from '@/lib/types'

export default function AdminDownload({ profiles }: { profiles: (Profile & { log_entries: LogEntry[] })[] }) {
  const [generating, setGenerating] = useState(false)

  async function downloadAll() {
    setGenerating(true)
    try {
      const { generateLogSheetPDF } = await import('@/lib/pdf/generatePDF')
      for (const p of profiles) {
        if (!p.log_entries?.length) continue
        const blob = await generateLogSheetPDF(p as Profile, p.log_entries)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const first = p.first_name.trim().replace(/\s+/g, '_')
        const last = p.last_name.trim().replace(/\s+/g, '_')
        a.download = `${first}_${last}_RiverLog2026.pdf`
        a.click()
        URL.revokeObjectURL(url)
        await new Promise(r => setTimeout(r, 300))
      }
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
