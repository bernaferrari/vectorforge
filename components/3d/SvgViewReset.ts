import type React from "react"
import type { Vector3Value } from "./SvgTypes"

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3)

export const animateSvgViewReset = ({
  resetViewFrameRef,
  viewNudgeFrameRef,
  isInertiaActiveRef,
  rotationVelocityRef,
  liveRotation,
  currentZoomRef,
  targetZoomRef,
  animationStartRef,
  onZoomChange,
  onViewRotationSet,
}: {
  resetViewFrameRef: React.MutableRefObject<number | null>
  viewNudgeFrameRef: React.MutableRefObject<number | null>
  isInertiaActiveRef: React.MutableRefObject<boolean>
  rotationVelocityRef: React.MutableRefObject<{ x: number; y: number }>
  liveRotation: Vector3Value
  currentZoomRef: React.MutableRefObject<number>
  targetZoomRef: React.MutableRefObject<number>
  animationStartRef: React.MutableRefObject<number>
  onZoomChange?: (zoom: number) => void
  onViewRotationSet?: (
    rotation: Partial<Vector3Value>,
    options?: { commit?: boolean; updateTimeline?: boolean }
  ) => void
}) => {
  if (resetViewFrameRef.current !== null) {
    cancelAnimationFrame(resetViewFrameRef.current)
    resetViewFrameRef.current = null
  }
  if (viewNudgeFrameRef.current !== null) {
    cancelAnimationFrame(viewNudgeFrameRef.current)
    viewNudgeFrameRef.current = null
  }

  isInertiaActiveRef.current = false
  rotationVelocityRef.current = { x: 0, y: 0 }

  const startRotation = liveRotation
  const startZoom = currentZoomRef.current
  const duration = 320
  const startTime = performance.now()

  targetZoomRef.current = 1.0
  animationStartRef.current = performance.now()
  onZoomChange?.(1.0)

  const tick = (now: number) => {
    const t = Math.max(0, Math.min(1, (now - startTime) / duration))
    const eased = easeOutCubic(t)

    currentZoomRef.current = startZoom + (1 - startZoom) * eased
    onViewRotationSet?.(
      {
        x: startRotation.x * (1 - eased),
        y: startRotation.y * (1 - eased),
        z: startRotation.z * (1 - eased),
      },
      { commit: false }
    )

    if (t < 1) {
      resetViewFrameRef.current = requestAnimationFrame(tick)
      return
    }

    resetViewFrameRef.current = null
    currentZoomRef.current = 1.0
    onViewRotationSet?.({ x: 0, y: 0, z: 0 }, { commit: true })
  }

  resetViewFrameRef.current = requestAnimationFrame(tick)
}
