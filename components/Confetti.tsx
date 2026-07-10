'use client'

import { useEffect, useRef } from 'react'

const COLORS = ['#22d3ee', '#0891b2', '#facc15', '#f472b6', '#a3e635', '#fb923c', '#ffffff', '#f87171']

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
}

function makeBurst(originX: number, originY: number, count: number): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    // Bias speed toward the high end for a punchy, explosive launch
    const speed = 9 + Math.random() * 17
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 7 + Math.random() * 9,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 22,
      shape: Math.random() > 0.66 ? 'star' : Math.random() > 0.5 ? 'rect' : 'circle',
      drag: 0.96 + Math.random() * 0.02,
    }
  })
}

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  const spikes = 5
  const outer = size / 2
  const inner = outer / 2.5
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI / spikes) * i
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath()
  ctx.fill()
}

export default function Confetti({ duration = 2800, onDone }: { duration?: number; onDone?: () => void }) {
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

    // Multiple big bursts from different points for a full-screen "explosion" feel
    const particles: Particle[] = [
      ...makeBurst(w * 0.5, h * 0.55, 220),
      ...makeBurst(w * 0.18, h * 0.4, 90),
      ...makeBurst(w * 0.82, h * 0.4, 90),
    ]

    let raf: number
    const start = performance.now()
    const gravity = 0.32

    function tick(now: number) {
      const elapsed = now - start
      ctx!.clearRect(0, 0, w, h)

      const fadeStart = duration - 600
      const alpha = elapsed > fadeStart ? Math.max(0, 1 - (elapsed - fadeStart) / 600) : 1

      for (const p of particles) {
        p.vy += gravity
        p.vx *= p.drag
        p.vy *= p.drag
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed

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
