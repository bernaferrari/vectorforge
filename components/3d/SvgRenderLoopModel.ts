export type RotationVelocity = {
  x: number
  y: number
}

export const ZOOM_DAMPING = 0.08
export const INERTIA_DECAY = 0.92
export const INERTIA_STOP_THRESHOLD = 0.0007

export const advanceInertiaVelocity = (
  velocity: RotationVelocity
): {
  velocity: RotationVelocity
  active: boolean
} => {
  const nextVelocity = {
    x: velocity.x * INERTIA_DECAY,
    y: velocity.y * INERTIA_DECAY,
  }

  if (Math.hypot(nextVelocity.x, nextVelocity.y) < INERTIA_STOP_THRESHOLD) {
    return {
      velocity: { x: 0, y: 0 },
      active: false,
    }
  }

  return {
    velocity: nextVelocity,
    active: true,
  }
}
