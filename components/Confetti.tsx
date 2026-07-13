'use client'

import { useEffect, useRef } from 'react'

const COLORS = ['#22d3ee', '#0891b2', '#facc15', '#f472b6', '#a3e635', '#fb923c', '#ffffff', '#f87171', '#a855f7', '#38bdf8']

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  shape: 'rect' | 'circle' | 'star'
  drag: number
  wobble: number
  wobbleSpeed: number
}

function makeBurst(originX: number, originY: number, count: number, w: number): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 5 + Math.random() * 14
    const r = Math.random()
    return {
      x: originX + (Math.random() - 0.5) * w * 0.1,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: 6 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 18,
      shape: r > 0.7 ? 'star' : r > 0.4 ? 'rect' : 'circle',
      drag: 0.97 + Math.random() * 0.02,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.08,
    }
  })
}

function makeRain(count: number, w: number): Particle[] {
  return Array.from({ length: count }, () => {
    const r = Math.random()
    return {
      x: Math.random() * w,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      size: 6 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 16,
      shape: r > 0.7 ? 'star' : r > 0.4 ? 'rect' : 'circle',
      drag: 1,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.08,
    }
  })
}

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  const spikes = 5
  const outer = size / 2
  const inner = outer / 2.5
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner
    const a = (Math.PI / spikes) * i
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad)
  }
  ctx.closePath()
  ctx.fill()
}

export default function Confetti({ duration = 3200, onDone }: { duration?: number; onDone?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const w = window.innerWidth
    const h = window.innerHeight

    // Lots of confetti: a few bursts across the width plus a rain layer that
    // keeps the whole screen covered as it falls.
    const particles: Particle[] = [
      ...makeBurst(w * 0.5, h * 0.5, 200, w),
      ...makeBurst(w * 0.2, h * 0.45, 120, w),
      ...makeBurst(w * 0.8, h * 0.45, 120, w),
      ...makeRain(180, w),
    ]

    let raf: number
    const start = performance.now()
    const gravity = 0.22

    function tick(now: number) {
      const elapsed = now - start
      ctx!.clearRect(0, 0, w, h)

      const fadeStart = duration - 700
      const alpha = elapsed > fadeStart ? Math.max(0, 1 - (elapsed - fadeStart) / 700) : 1

      for (const p of particles) {
        p.vy += gravity
        p.vx *= p.drag
        p.vy *= p.drag
        p.wobble += p.wobbleSpeed
        p.x += p.vx + Math.sin(p.wobble) * 1.2
        p.y += p.vy
        p.rotation += p.rotationSpeed

        // Recycle rain particles that fall off the bottom so coverage stays dense
        if (p.y > h + 20 && p.drag === 1 && elapsed < fadeStart) {
          p.y = -20
          p.x = Math.random() * w
          p.vy = 2 + Math.random() * 4
        }

        ctx!.save()
        ctx!.globalAlpha = alpha
        ctx!.translate(p.x, p.y)
        ctx!.rotate((p.rotation * Math.PI) / 180)
        ctx!.fillStyle = p.color
        if (p.shape === 'rect') {
          ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else if (p.shape === 'star') {
          drawStar(ctx!, p.size)
        } else {
          ctx!.beginPath()
          ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx!.fill()
        }
        ctx!.restore()
      }

      if (elapsed < duration) {
        raf = requestAnimationFrame(tick)
      } else {
        ctx!.clearRect(0, 0, w, h)
        onDone?.()
      }
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
      style={{ position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none' }}
    />
  )
}
