import type { Particle } from './types'

export interface Bounds {
  width: number
  height: number
}

export interface CollisionResult {
  wall: 'top' | 'bottom' | 'left' | 'right' | null
  impactSpeed: number
}

/** No meaningful air friction — energy stays in the system until power off. */
const FRICTION = 1

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

  return { wall, impactSpeed }
}
