import type { Particle } from './types'

export interface Bounds {
  width: number
  height: number
}

export interface CollisionResult {
  wall: 'top' | 'bottom' | 'left' | 'right' | null
  impactSpeed: number
}

const FRICTION = 0.9995
const MIN_SPEED = 0.3

export function stepParticle(
  p: Particle,
  bounds: Bounds,
  dt: number,
  restitution: number,
): CollisionResult {
  p.vx *= FRICTION
  p.vy *= FRICTION

  p.x += p.vx * dt
  p.y += p.vy * dt

  let wall: CollisionResult['wall'] = null
  let impactSpeed = 0

  if (p.x - p.radius < 0) {
    p.x = p.radius
    impactSpeed = Math.abs(p.vx)
    p.vx = Math.abs(p.vx) * restitution
    wall = 'left'
  } else if (p.x + p.radius > bounds.width) {
    p.x = bounds.width - p.radius
    impactSpeed = Math.abs(p.vx)
    p.vx = -Math.abs(p.vx) * restitution
    wall = 'right'
  }

  if (p.y - p.radius < 0) {
    p.y = p.radius
    const speed = Math.abs(p.vy)
    if (speed > impactSpeed) {
      impactSpeed = speed
      wall = 'top'
    }
    p.vy = Math.abs(p.vy) * restitution
  } else if (p.y + p.radius > bounds.height) {
    p.y = bounds.height - p.radius
    const speed = Math.abs(p.vy)
    if (speed > impactSpeed) {
      impactSpeed = speed
      wall = 'bottom'
    }
    p.vy = -Math.abs(p.vy) * restitution
  }

  const speed = Math.hypot(p.vx, p.vy)
  if (speed < MIN_SPEED && speed > 0) {
    p.vx *= 0.98
    p.vy *= 0.98
  }

  return { wall, impactSpeed }
}
