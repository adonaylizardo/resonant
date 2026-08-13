import { useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import type { InstrumentId } from '../audio/types'
import { INSTRUMENT_COLORS } from '../audio/types'
import { getAudioEngine } from '../audio/engine'
import {
  createParticle,
  enforceCap,
  pushTrail,
  DRAG_THRESHOLD,
  computeLaunchVelocity,
  PARTICLE_RADIUS,
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
  onParticleCountChange?: (count: number) => void
}

interface SlingshotState {
  active: boolean
  originX: number
  originY: number
  pointerX: number
  pointerY: number
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

function drawGhostOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  [r, g, b]: [number, number, number],
) {
  ctx.save()
  ctx.globalAlpha = 0.6
  ctx.shadowBlur = 14
  ctx.shadowColor = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  const core = ctx.createRadialGradient(x, y, 0, x, y, radius)
  core.addColorStop(0, 'rgba(255,255,255,0.85)')
  core.addColorStop(0.45, color)
  core.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.25)`)
  ctx.fillStyle = core
  ctx.fill()
  ctx.restore()
}

function drawSlingshot(
  ctx: CanvasRenderingContext2D,
  shot: SlingshotState,
  color: string,
  rgb: [number, number, number],
) {
  const { originX, originY, pointerX, pointerY } = shot

  ctx.save()
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.9
  ctx.lineWidth = 2.25
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(originX, originY)
  ctx.lineTo(pointerX, pointerY)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.65
  ctx.lineWidth = 1
  const arm = 7
  ctx.beginPath()
  ctx.moveTo(originX - arm, originY)
  ctx.lineTo(originX + arm, originY)
  ctx.moveTo(originX, originY - arm)
  ctx.lineTo(originX, originY + arm)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(originX, originY, 3.5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  drawGhostOrb(ctx, pointerX, pointerY, PARTICLE_RADIUS, color, rgb)

  const dx = originX - pointerX
  const dy = originY - pointerY
  const len = Math.hypot(dx, dy) || 1
  const tickLen = Math.min(48, len * 0.4)
  ctx.save()
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.22
  ctx.lineWidth = 1
  ctx.setLineDash([3, 5])
  ctx.beginPath()
  ctx.moveTo(originX, originY)
  ctx.lineTo(originX + (dx / len) * tickLen, originY + (dy / len) * tickLen)
  ctx.stroke()
  ctx.restore()
}

export const StageCanvas = forwardRef<StageCanvasHandle, StageCanvasProps>(
  function StageCanvas(
    { activeInstrument, powered, hasThrown, onFirstThrow, onParticleCountChange },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const particlesRef = useRef<Particle[]>([])
    const slingshotRef = useRef<SlingshotState | null>(null)
    const rafRef = useRef<number>(0)
    const instrumentRef = useRef(activeInstrument)
    const poweredRef = useRef(powered)
    const countCbRef = useRef(onParticleCountChange)

    const emitCount = useCallback((count: number) => {
      countCbRef.current?.(count)
    }, [])

    useImperativeHandle(ref, () => ({
      clearParticles: () => {
        particlesRef.current = []
        slingshotRef.current = null
        emitCount(0)
      },
    }))

    useEffect(() => {
      countCbRef.current = onParticleCountChange
    }, [onParticleCountChange])

    useEffect(() => {
      instrumentRef.current = activeInstrument
    }, [activeInstrument])

    useEffect(() => {
      poweredRef.current = powered
      if (!powered) {
        particlesRef.current = []
        slingshotRef.current = null
        emitCount(0)
      }
    }, [powered, emitCount])

    const spawnParticle = useCallback(
      async (x: number, y: number, vx: number, vy: number) => {
        if (!poweredRef.current) return
        const engine = getAudioEngine()
        await engine.ensureStarted()

        const particle = createParticle(x, y, vx, vy, instrumentRef.current)
        particlesRef.current = enforceCap([...particlesRef.current, particle])
        emitCount(particlesRef.current.length)

        if (!hasThrown) onFirstThrow()
      },
      [hasThrown, onFirstThrow, emitCount],
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
        if (rect.width === 0 || rect.height === 0) return
        canvas.width = Math.round(rect.width * dpr)
        canvas.height = Math.round(rect.height * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }

      resize()

      const ro = new ResizeObserver(() => {
        resize()
      })
      ro.observe(canvas)

      const screenEl = canvas.closest('.device__screen')
      if (screenEl) ro.observe(screenEl)

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

          const shot = slingshotRef.current
          if (shot?.active) {
            const rgb = INSTRUMENT_RGB[instrumentRef.current]
            const color = resolveColor(instrumentRef.current)
            drawSlingshot(ctx, shot, color, rgb)
          }
        }

        drawScanlines(ctx, w, h)

        rafRef.current = requestAnimationFrame(loop)
      }

      rafRef.current = requestAnimationFrame(loop)

      return () => {
        ro.disconnect()
        cancelAnimationFrame(rafRef.current)
      }
    }, [])

    const onPointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (!poweredRef.current) return
        e.preventDefault()
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.setPointerCapture(e.pointerId)
        const { x, y } = getPoint(e.clientX, e.clientY)
        slingshotRef.current = {
          active: true,
          originX: x,
          originY: y,
          pointerX: x,
          pointerY: y,
          pointerId: e.pointerId,
        }
      },
      [getPoint],
    )

    const onPointerMove = useCallback(
      (e: React.PointerEvent) => {
        const shot = slingshotRef.current
        if (!shot?.active || shot.pointerId !== e.pointerId) return
        const { x, y } = getPoint(e.clientX, e.clientY)
        shot.pointerX = x
        shot.pointerY = y
      },
      [getPoint],
    )

    const onPointerUp = useCallback(
      (e: React.PointerEvent) => {
        const shot = slingshotRef.current
        if (!shot?.active || shot.pointerId !== e.pointerId) return

        const dx = shot.pointerX - shot.originX
        const dy = shot.pointerY - shot.originY
        const dist = Math.hypot(dx, dy)

        if (dist >= DRAG_THRESHOLD) {
          const { vx, vy } = computeLaunchVelocity(
            shot.originX,
            shot.originY,
            shot.pointerX,
            shot.pointerY,
          )
          void spawnParticle(shot.originX, shot.originY, vx, vy)
        }

        slingshotRef.current = null
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
