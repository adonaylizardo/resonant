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

const THROW_SCALE = 10
const MIN_LAUNCH_SPEED = 90
const MAX_LAUNCH_SPEED = 580

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

/** Slingshot: launch opposite the pull, clamped to a playable speed range. */
export function computeLaunchVelocity(
  originX: number,
  originY: number,
  pointerX: number,
  pointerY: number,
): { vx: number; vy: number } {
  const dx = pointerX - originX
  const dy = pointerY - originY
  let vx = -dx * THROW_SCALE
  let vy = -dy * THROW_SCALE
  const speed = Math.hypot(vx, vy)
  if (speed === 0) return { vx: 0, vy: 0 }
  if (speed < MIN_LAUNCH_SPEED) {
    const scale = MIN_LAUNCH_SPEED / speed
    vx *= scale
    vy *= scale
  } else if (speed > MAX_LAUNCH_SPEED) {
    const scale = MAX_LAUNCH_SPEED / speed
    vx *= scale
    vy *= scale
  }
  return { vx, vy }
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
