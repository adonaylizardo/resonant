import type { InstrumentId } from '../audio/types'

export interface TrailPoint {
  x: number
  y: number
  alpha: number
}

export interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  instrument: InstrumentId
  trail: TrailPoint[]
  born: number
  lastHitAt: number
}

export const MAX_PARTICLES = 10
export const MAX_TRAIL = 24
export const PARTICLE_RADIUS = 7
/** Minimum pull distance (CSS px) before a throw fires. */
export const DRAG_THRESHOLD = 3

/** Speed at the shortest valid pull — lazy but musical. */
const MIN_LAUNCH_SPEED = 52
/** Speed at a full-screen pull — fast, never a laser. */
const MAX_LAUNCH_SPEED = 420
/** Fallback pull distance (CSS px) that maps to max speed when screen size unknown. */
const REF_PULL_PX = 200

let nextId = 1

export function createParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  instrument: InstrumentId,
): Particle {
  return {
    id: nextId++,
    x,
    y,
    vx,
    vy,
    radius: PARTICLE_RADIUS,
    instrument,
    trail: [],
    born: performance.now(),
    lastHitAt: 0,
  }
}

/**
 * Slingshot: launch opposite the pull. Speed scales with pull distance only
 * (not release velocity). Linear-ish curve from gentle floor to clamped ceiling.
 */
export function computeLaunchVelocity(
  originX: number,
  originY: number,
  pointerX: number,
  pointerY: number,
  screenHeight?: number,
): { vx: number; vy: number } {
  const dx = pointerX - originX
  const dy = pointerY - originY
  const pull = Math.hypot(dx, dy)
  if (pull === 0) return { vx: 0, vy: 0 }

  const refPull = screenHeight ? screenHeight * 0.48 : REF_PULL_PX
  const range = Math.max(refPull - DRAG_THRESHOLD, 1)
  const t = Math.min(1, Math.max(0, (pull - DRAG_THRESHOLD) / range))
  const eased = t * (2 - t)
  const speed = MIN_LAUNCH_SPEED + eased * (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED)

  return {
    vx: (-dx / pull) * speed,
    vy: (-dy / pull) * speed,
  }
}

export function pushTrail(p: Particle) {
  p.trail.unshift({ x: p.x, y: p.y, alpha: 1 })
  if (p.trail.length > MAX_TRAIL) p.trail.pop()
  for (let i = 0; i < p.trail.length; i++) {
    p.trail[i].alpha = 1 - i / MAX_TRAIL
  }
}

export function enforceCap(particles: Particle[]): Particle[] {
  if (particles.length <= MAX_PARTICLES) return particles
  return particles.slice(particles.length - MAX_PARTICLES)
}
