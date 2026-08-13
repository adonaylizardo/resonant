import { useCallback, useEffect, useRef } from 'react'
import type { InstrumentId } from '../audio/types'
import { INSTRUMENT_COLORS } from '../audio/types'
import { getAudioEngine } from '../audio/engine'
import {
  createParticle,
  enforceCap,
  pushTrail,
  DRAG_THRESHOLD,
  type Particle,
} from './types'
import { stepParticle } from './physics'

const INSTRUMENT_RGB: Record<InstrumentId, [number, number, number]> = {
  pulse: [232, 165, 75],
  glass: [126, 224, 234],
  drift: [196, 123, 255],
}

interface StageCanvasProps {
  activeInstrument: InstrumentId
  powered: boolean
  hasThrown: boolean
  onFirstThrow: () => void
  onPowerOn: () => void
}

interface DragState {
  active: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
  pointerId: number
}

const COLOR_CACHE: Partial<Record<InstrumentId, string>> = {}

function resolveColor(instrument: InstrumentId): string {
  if (COLOR_CACHE[instrument]) return COLOR_CACHE[instrument]!
  const raw = INSTRUMENT_COLORS[instrument]
  const probe = document.createElement('span')
  probe.style.color = raw
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  document.body.removeChild(probe)
  COLOR_CACHE[instrument] = resolved
  return resolved
}

function drawGrainOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const step = 3
  for (let x = 0; x < w; x += step) {
    for (let y = 0; y < h; y += step) {
      const a = Math.random() * 0.04
      ctx.fillStyle = `rgba(255,255,255,${a})`
      ctx.fillRect(x, y, 1, 1)
    }
  }
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.85)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  color: string,
  [r, g, b]: [number, number, number],
) {
  for (let i = p.trail.length - 1; i >= 0; i--) {
    const pt = p.trail[i]
    const alpha = pt.alpha * 0.55
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, p.radius * (0.35 + pt.alpha * 0.55), 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
    ctx.fill()
  }

  ctx.save()
  ctx.shadowBlur = 22
  ctx.shadowColor = color
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
  const core = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius)
  core.addColorStop(0, `rgba(255,255,255,0.95)`)
  core.addColorStop(0.35, color)
  core.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.15)`)
  ctx.fillStyle = core
  ctx.fill()
  ctx.restore()
}

function drawAimLine(
  ctx: CanvasRenderingContext2D,
  drag: DragState,
  color: string,
) {
  const dx = drag.startX - drag.currentX
  const dy = drag.startY - drag.currentY
  ctx.save()
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 6])
  ctx.beginPath()
  ctx.moveTo(drag.startX, drag.startY)
  ctx.lineTo(drag.startX + dx * 0.35, drag.startY + dy * 0.35)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.shadowBlur = 14
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.globalAlpha = 0.7
  ctx.beginPath()
  ctx.arc(drag.startX, drag.startY, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function StageCanvas({
  activeInstrument,
  powered,
  hasThrown,
  onFirstThrow,
  onPowerOn,
}: StageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const dragRef = useRef<DragState | null>(null)
  const rafRef = useRef<number>(0)
  const instrumentRef = useRef(activeInstrument)
  const poweredRef = useRef(powered)

  useEffect(() => {
    instrumentRef.current = activeInstrument
  }, [activeInstrument])

  useEffect(() => {
    poweredRef.current = powered
  }, [powered])

  const spawnParticle = useCallback(
    async (x: number, y: number, vx: number, vy: number) => {
      const engine = getAudioEngine()
      await engine.ensureStarted()
      if (!poweredRef.current) {
        onPowerOn()
        engine.setPowered(true)
      }

      const particle = createParticle(x, y, vx, vy, instrumentRef.current)
      particlesRef.current = enforceCap([...particlesRef.current, particle])

      if (!hasThrown) onFirstThrow()
    },
    [hasThrown, onFirstThrow, onPowerOn],
  )

  const getPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(32, now - last) / 16.67
      last = now

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const engine = getAudioEngine()
      const restitution = engine.getRestitution()

      ctx.fillStyle = '#070708'
      ctx.fillRect(0, 0, w, h)

      const particles = particlesRef.current
      for (const p of particles) {
        const { wall, impactSpeed } = stepParticle(p, { width: w, height: h }, dt, restitution)
        pushTrail(p)

        if (wall && impactSpeed > 40 && now - p.lastHitAt > 90) {
          p.lastHitAt = now
          const normalizedY = p.y / h
          engine.playWallHit(p.instrument, wall, normalizedY, impactSpeed)
        }
      }

      for (const p of particles) {
        const rgb = INSTRUMENT_RGB[p.instrument]
        const color = resolveColor(p.instrument)
        drawParticle(ctx, p, color, rgb)
      }

      const drag = dragRef.current
      if (drag?.active) {
        const color = resolveColor(instrumentRef.current)
        drawAimLine(ctx, drag, color)
      }

      if (Math.floor(now / 120) % 2 === 0) {
        ctx.save()
        ctx.globalCompositeOperation = 'overlay'
        ctx.globalAlpha = 0.35
        drawGrainOverlay(ctx, w, h)
        ctx.restore()
      }

      drawVignette(ctx, w, h)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.setPointerCapture(e.pointerId)
      const { x, y } = getPoint(e.clientX, e.clientY)
      dragRef.current = {
        active: true,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
        pointerId: e.pointerId,
      }
    },
    [getPoint],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current
      if (!drag?.active || drag.pointerId !== e.pointerId) return
      const { x, y } = getPoint(e.clientX, e.clientY)
      drag.currentX = x
      drag.currentY = y
    },
    [getPoint],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current
      if (!drag?.active || drag.pointerId !== e.pointerId) return

      const dx = drag.currentX - drag.startX
      const dy = drag.currentY - drag.startY
      const dist = Math.hypot(dx, dy)

      if (dist >= DRAG_THRESHOLD) {
        const throwScale = 12
        const vx = -dx * throwScale
        const vy = -dy * throwScale
        void spawnParticle(drag.startX, drag.startY, vx, vy)
      }

      dragRef.current = null
      canvasRef.current?.releasePointerCapture(e.pointerId)
    },
    [spawnParticle],
  )

  return (
    <canvas
      ref={canvasRef}
      className="stage-canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  )
}
