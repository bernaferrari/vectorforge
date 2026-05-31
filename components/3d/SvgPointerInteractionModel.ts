type PointerPosition = { x: number; y: number }

export type RotationVelocity = { x: number; y: number }

export const VIEW_DRAG_START_THRESHOLD = 3
export const VIEW_ROTATION_VELOCITY_SCALE = 0.006
export const VIEW_INERTIA_START_THRESHOLD = 0.002
export const ZOOM_MIN = 0.3
export const ZOOM_MAX = 3
export const ZOOM_WHEEL_STEP = 0.08

export const clampZoom = (zoom: number) =>
  Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom))

export const pointerDistance = (a: PointerPosition, b: PointerPosition) =>
  Math.hypot(a.x - b.x, a.y - b.y)

export const hasViewDragExceededThreshold = (
  start: PointerPosition,
  current: PointerPosition
) => pointerDistance(start, current) >= VIEW_DRAG_START_THRESHOLD

export const viewRotationVelocityFromPointerDelta = (
  previous: PointerPosition,
  current: PointerPosition
): RotationVelocity => ({
  x: (current.y - previous.y) * VIEW_ROTATION_VELOCITY_SCALE,
  y: (current.x - previous.x) * VIEW_ROTATION_VELOCITY_SCALE,
})

export const shouldStartViewInertia = (velocity: RotationVelocity) =>
  Math.hypot(velocity.x, velocity.y) > VIEW_INERTIA_START_THRESHOLD

export const nextWheelZoom = (currentZoom: number, deltaY: number) => {
  const direction = deltaY > 0 ? -1 : 1
  return clampZoom(currentZoom + direction * ZOOM_WHEEL_STEP)
}
