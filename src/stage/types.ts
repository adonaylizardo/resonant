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
export const DRAG_THRESHOLD = 6

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
