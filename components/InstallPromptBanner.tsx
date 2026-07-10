'use client'

import { useEffect, useState } from 'react'
import { X, Smartphone } from 'lucide-react'

const DISMISS_KEY = 'installBannerDismissed_v1'

type Platform = 'ios' | 'android' | 'other'
type BIPEvent = Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }

let deferredPrompt: BIPEvent | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BIPEvent
  })
}

export default function InstallPromptBanner() {
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<Platform>('other')
  const [expanded, setExpanded] = useState(false)
  const [canPrompt, setCanPrompt] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    const dismissed = localStorage.getItem(DISMISS_KEY) === '1'
    const ua = navigator.userAgent
    setPlatform(/iphone|ipad|ipod/i.test(ua) ? 'ios' : /android/i.test(ua) ? 'android' : 'other')
    if (!isStandalone && !dismissed) setVisible(true)

    const check = setInterval(() => {
      if (deferredPrompt) {
        setCanPrompt(true)
        clearInterval(check)
      }
    }, 300)
    return () => clearInterval(check)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    dismiss()
  }

  if (!visible) return null

  const steps = platform === 'ios'
    ? [
        'Tap the Share icon in Safari (or the ••• menu, then Share).',
        'Scroll down and tap "Add to Home Screen."',
        'Tap "Add" in the top right.',
      ]
    : [
        'Open your browser menu (⋮ or •••).',
        'Tap "Add to Home screen" or "Install app."',
        'Confirm to add it.',
      ]

  return (
    <div style={{ background: 'rgba(8,145,178,0.12)', borderBottom: '1px solid rgba(34,211,238,0.2)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Smartphone size={18} color="#22d3ee" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>Install RiverLog on your phone. </span>
            {platform === 'android' && canPrompt ? (
              <button
                onClick={install}
                style={{ fontSize: 13, fontWeight: 700, color: '#22d3ee', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
              >
                Install now
              </button>
            ) : (
              <button
                onClick={() => setExpanded(v => !v)}
                style={{ fontSize: 13, fontWeight: 700, color: '#22d3ee', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
              >
                {expanded ? 'Hide steps' : 'Show me how'}
              </button>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>
        {expanded && (
          <ol style={{ margin: '10px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {steps.map((step, i) => (
              <li key={i} style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{step}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
