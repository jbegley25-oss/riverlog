'use client'

import { useEffect, useRef } from 'react'

const PALETTES = [
  ['#ff2d55', '#ff6b9d', '#ffd1dc'],
  ['#22d3ee', '#67e8f9', '#a5f3fc'],
  ['#facc15', '#fde047', '#fff7c2'],
  ['#a3e635', '#bef264', '#ecfccb'],
  ['#fb923c', '#fdba74', '#ffedd5'],
  ['#a855f7', '#c084fc', '#e9d5ff'],
  ['#38bdf8', '#7dd3fc', '#e0f2fe'],
  ['#ffffff', '#fef08a', '#fecdd3'],
]

type Spark = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  drag: number
  flicker: boolean
  trail: { x: number; y: number }[]
}

type Rocket = {
  x: number
  y: number
  vx: number
  vy: number
  targetY: number
  color: string
  palette: string[]
  trail: { x: number; y: number }[]
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeExplosion(
  x: number,
  y: number,
  palette: string[],
  sparks: Spark[],
) {
  const type = Math.random()
  const count = 70 + Math.floor(Math.random() * 70)

  if (type > 0.66) {
    // Ring / shell burst — even ring of sparks
    const ringCount = count
    const baseSpeed = 6 + Math.random() * 4
    for (let i = 0; i < ringCount; i++) {
      const a = (Math.PI * 2 * i) / ringCount + Math.random() * 0.05
      const speed = baseSpeed + Math.random() * 1.5
      sparks.push(makeSpark(x, y, a, speed, palette))
    }
  } else if (type > 0.33) {
    // Double ring
    for (let ring = 0; ring < 2; ring++) {
      const speed = 4 + ring * 4 + Math.random() * 2
      const rc = Math.floor(count / 2)
      for (let i = 0; i < rc; i++) {
        const a = (Math.PI * 2 * i) / rc
        sparks.push(makeSpark(x, y, a, speed + Math.random(), palette))
      }
    }
  } else {
    // Chaotic burst — random directions, varied speed
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 9
      sparks.push(makeSpark(x, y, a, speed, palette))
    }
  }
}

function makeSpark(
  x: number,
  y: number,
  angle: number,
  speed: number,
  palette: string[],
): Spark {
  const maxLife = 60 + Math.random() * 55
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: maxLife,
    maxLife,
    size: 1.6 + Math.random() * 2.6,
    color: pick(palette),
    drag: 0.965 + Math.random() * 0.02,
    flicker: Math.random() > 0.6,
    trail: [],
  }
}

export default function Confetti({
  duration = 5200,
  onDone,
}: {
  duration?: number
  onDone?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    let w = window.innerWidth
    let h = window.innerHeight
    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const rockets: Rocket[] = []
    const sparks: Spark[] = []
    let flash = 0

    const launchRocket = () => {
      const x = w * (0.15 + Math.random() * 0.7)
      const palette = pick(PALETTES)
      rockets.push({
        x,
        y: h + 10,
        vx: (Math.random() - 0.5) * 2,
        vy: -(11 + Math.random() * 4),
        targetY: h * (0.12 + Math.random() * 0.33),
        color: palette[1],
        palette,
        trail: [],
      })
    }

    // Big opening barrage
    launchRocket()
    launchRocket()
    launchRocket()

    const gravity = 0.12
    const start = performance.now()
    let lastLaunch = start
    let raf: number

    function tick(now: number) {
      const elapsed = now - start
      const stopLaunching = elapsed > duration - 1400

      // Auto-launch rockets on a randomized cadence
      if (!stopLaunching && now - lastLaunch > 180 + Math.random() * 260) {
        launchRocket()
        if (Math.random() > 0.6) launchRocket()
        lastLaunch = now
      }

      // Fade the canvas slightly instead of clearing → glowing light trails
      ctx!.globalCompositeOperation = 'source-over'
      ctx!.fillStyle = 'rgba(6, 10, 24, 0.22)'
      ctx!.fillRect(0, 0, w, h)

      // Screen flash on explosion
      if (flash > 0) {
        ctx!.fillStyle = `rgba(255,255,255,${flash * 0.35})`
        ctx!.fillRect(0, 0, w, h)
        flash *= 0.82
        if (flash < 0.01) flash = 0
      }

      ctx!.globalCompositeOperation = 'lighter'

      // Rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]
        r.vy += gravity
        r.x += r.vx
        r.y += r.vy
        r.trail.push({ x: r.x, y: r.y })
        if (r.trail.length > 8) r.trail.shift()

        // Draw glowing trail
        for (let t = 0; t < r.trail.length; t++) {
          const pt = r.trail[t]
          const a = t / r.trail.length
          ctx!.beginPath()
          ctx!.fillStyle = r.color
          ctx!.globalAlpha = a * 0.9
          ctx!.arc(pt.x, pt.y, 2.4 * a + 0.6, 0, Math.PI * 2)
          ctx!.fill()
        }
        ctx!.globalAlpha = 1

        // Explode at apex
        if (r.y <= r.targetY || r.vy >= 0) {
          makeExplosion(r.x, r.y, r.palette, sparks)
          flash = Math.min(1, flash + 0.6)
          rockets.splice(i, 1)
        }
      }

      // Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.vy += gravity * 0.9
        s.vx *= s.drag
        s.vy *= s.drag
        s.x += s.vx
        s.y += s.vy
        s.life--

        const lifeRatio = s.life / s.maxLife
        if (s.life <= 0) {
          sparks.splice(i, 1)
          continue
        }

        const flickerOn = !s.flicker || Math.random() > 0.4
        if (flickerOn) {
          ctx!.globalAlpha = Math.max(0, lifeRatio)
          ctx!.fillStyle = s.color
          ctx!.beginPath()
          ctx!.arc(s.x, s.y, s.size * (0.4 + lifeRatio * 0.6), 0, Math.PI * 2)
          ctx!.fill()

          // Bright hot core
          ctx!.globalAlpha = Math.max(0, lifeRatio) * 0.6
          ctx!.fillStyle = '#ffffff'
          ctx!.beginPath()
          ctx!.arc(s.x, s.y, s.size * 0.4 * lifeRatio, 0, Math.PI * 2)
          ctx!.fill()
        }
      }
      ctx!.globalAlpha = 1
      ctx!.globalCompositeOperation = 'source-over'

      if (elapsed < duration || sparks.length > 0 || rockets.length > 0) {
        if (elapsed < duration + 2000) {
          raf = requestAnimationFrame(tick)
          return
        }
      }
      ctx!.clearRect(0, 0, w, h)
      onDone?.()
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [duration, onDone])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        pointerEvents: 'none',
      }}
    />
  )
}
