'use client'
import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').then(reg => {
      // Re-check for a new version whenever the app is reopened/resumed —
      // standalone home-screen apps often resume instead of doing a fresh load.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update()
      })
    }).catch(console.error)

    // Once a new service worker takes over, reload so the update is visible immediately
    // instead of requiring the user to force-quit and reopen the app.
    let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return
      reloaded = true
      window.location.reload()
    })
  }, [])
  return null
}
