'use client'

import { useEffect, useState } from 'react'
import { X, ExternalLink } from 'lucide-react'

const DISMISS_KEY = 'iconUpdateBannerDismissed_v1'

export default function IconUpdateBanner() {
  const [visible, setVisible] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    const dismissed = localStorage.getItem(DISMISS_KEY) === '1'
    setOrigin(window.location.origin)
    if (isStandalone && !dismissed) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="glass" style={{ borderRadius: 14, padding: '16px 18px', marginBottom: 24, position: 'relative' }}>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 }}
      >
        <X size={16} />
      </button>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6, paddingRight: 20 }}>
        We updated the RiverLog icon 🎨
      </div>
      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12, lineHeight: 1.5 }}>
        Your home screen icon won't auto-update. To get the new one: remove RiverLog from your home
        screen, then re-add it from your browser.
      </p>
      <a
        href={origin}
        target="_blank"
        rel="noopener noreferrer"
        onClick={dismiss}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 700, color: '#0a1628',
          background: 'linear-gradient(135deg, #0891b2, #22d3ee)',
          borderRadius: 8, padding: '8px 14px', textDecoration: 'none',
        }}
      >
        Open in Browser <ExternalLink size={14} />
      </a>
    </div>
  )
}
