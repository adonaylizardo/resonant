import { useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
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

export interface StageCanvasHandle {
  clearParticles: () => void
}

interface StageCanvasProps {
  activeInstrument: InstrumentId
  powered: boolean
  hasThrown: boolean
  onFirstThrow: () => void
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

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const step = 18
  ctx.strokeStyle = 'rgba(201, 196, 188, 0.055)'
  ctx.lineWidth = 1
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, h)
    ctx.stroke()
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(w, y + 0.5)
    ctx.stroke()
  }
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.04)'
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1)
  }
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  color: string,
  [r, g, b]: [number, number, number],
) {
  for (let i = p.trail.length - 1; i >= 0; i--) {
    const pt = p.trail[i]
    const alpha = pt.alpha * 0.5
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, p.radius * (0.35 + pt.alpha * 0.5), 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
    ctx.fill()
  }

  ctx.save()
  ctx.shadowBlur = 16
  ctx.shadowColor = color
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
  const core = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius)
  core.addColorStop(0, 'rgba(255,255,255,0.92)')
  core.addColorStop(0.4, color)
  core.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.2)`)
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
  ctx.globalAlpha = 0.4
  ctx.lineWidth = 1
  ctx.setLineDash([3, 5])
  ctx.beginPath()
  ctx.moveTo(drag.startX, drag.startY)
  ctx.lineTo(drag.startX + dx * 0.3, drag.startY + dy * 0.3)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.shadowBlur = 10
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.globalAlpha = 0.75
  ctx.beginPath()
  ctx.arc(drag.startX, drag.startY, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export const StageCanvas = forwardRef<StageCanvasHandle, StageCanvasProps>(
  function StageCanvas({ activeInstrument, powered, hasThrown, onFirstThrow }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const particlesRef = useRef<Particle[]>([])
    const dragRef = useRef<DragState | null>(null)
    const rafRef = useRef<number>(0)
    const instrumentRef = useRef(activeInstrument)
    const poweredRef = useRef(powered)

    useImperativeHandle(ref, () => ({
      clearParticles: () => {
        particlesRef.current = []
        dragRef.current = null
      },
    }))

    useEffect(() => {
      instrumentRef.current = activeInstrument
    }, [activeInstrument])

    useEffect(() => {
      poweredRef.current = powered
      if (!powered) {
        particlesRef.current = []
        dragRef.current = null
      }
    }, [powered])

    const spawnParticle = useCallback(
      async (x: number, y: number, vx: number, vy: number) => {
        if (!poweredRef.current) return
        const engine = getAudioEngine()
        await engine.ensureStarted()

        const particle = createParticle(x, y, vx, vy, instrumentRef.current)
        particlesRef.current = enforceCap([...particlesRef.current, particle])

        if (!hasThrown) onFirstThrow()
      },
      [hasThrown, onFirstThrow],
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
        drawGrid(ctx, w, h)

        if (poweredRef.current) {
          const particles = particlesRef.current
          for (const p of particles) {
            const { wall, impactSpeed } = stepParticle(
              p,
              { width: w, height: h },
              dt,
              restitution,
            )
            pushTrail(p)

            if (wall && impactSpeed > 12 && now - p.lastHitAt > 70) {
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
        }

        drawScanlines(ctx, w, h)

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
        if (!poweredRef.current) return
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
          const throwScale = 10
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
  },
)
