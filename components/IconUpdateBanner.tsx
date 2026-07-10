'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const DISMISS_KEY = 'iconUpdateBannerDismissed_v1'

type Platform = 'ios' | 'android' | 'other'

export default function IconUpdateBanner() {
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<Platform>('other')

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    const dismissed = localStorage.getItem(DISMISS_KEY) === '1'
    const ua = navigator.userAgent
    setPlatform(/iphone|ipad|ipod/i.test(ua) ? 'ios' : /android/i.test(ua) ? 'android' : 'other')
    if (isStandalone && !dismissed) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  const steps = platform === 'ios'
    ? [
        'Long-press the RiverLog icon on your Home Screen and tap "Remove App" → "Delete App."',
        'Open Safari (not this app) and go to riverlog-tau.vercel.app.',
        'Tap the Share icon, then "Add to Home Screen."',
      ]
    : platform === 'android'
    ? [
        'Long-press the RiverLog icon on your Home Screen and tap "Uninstall" or "Remove."',
        'Open Chrome (not this app) and go to riverlog-tau.vercel.app.',
        'Tap the ⋮ menu, then "Add to Home screen" / "Install app."',
      ]
    : [
        'Remove RiverLog from your Home Screen.',
        'Open riverlog-tau.vercel.app in your browser.',
        'Use your browser\'s "Add to Home Screen" option.',
      ]

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
      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 10, lineHeight: 1.5 }}>
        Home screen icons don't auto-update — your phone won't let this app open your browser for
        you. To get the new icon:
      </p>
      <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map((step, i) => (
          <li key={i} style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>{step}</li>
        ))}
      </ol>
      <button
        onClick={dismiss}
        style={{
          marginTop: 12, fontSize: 13, fontWeight: 700, color: '#0a1628',
          background: 'linear-gradient(135deg, #0891b2, #22d3ee)',
          border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
        }}
      >
        Got it
      </button>
    </div>
  )
}
