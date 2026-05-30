"use client"

import { useRef } from "react"
import { GIZMO_SNAP_DEGREES } from "./SvgSceneUtils"
import type { SvgCanvasLiveRenderProps } from "./useSvgCanvasLiveRefs"
import type { Vector3Value } from "./SvgTypes"

type ViewNudgeAxis = "x" | "y"
type ViewNudgeState = {
  value: number | null
  target: number | null
}

interface SvgViewNudgeOptions {
  liveRenderPropsRef: React.MutableRefObject<SvgCanvasLiveRenderProps>
  isInertiaActiveRef: React.MutableRefObject<boolean>
  rotationVelocityRef: React.MutableRefObject<{ x: number; y: number }>
  onViewRotationSetRef: React.MutableRefObject<
    | ((
        rotation: Partial<Vector3Value>,
        options?: { commit?: boolean; updateTimeline?: boolean }
      ) => void)
    | undefined
  >
}

export function useSvgViewNudge({
  liveRenderPropsRef,
  isInertiaActiveRef,
  rotationVelocityRef,
  onViewRotationSetRef,
}: SvgViewNudgeOptions) {
  const viewNudgeFrameRef = useRef<number | null>(null)
  const viewNudgeStateRef = useRef<Record<ViewNudgeAxis, ViewNudgeState>>({
    x: { value: null, target: null },
    y: { value: null, target: null },
  })

  const cancelViewNudge = () => {
    if (viewNudgeFrameRef.current !== null) {
      cancelAnimationFrame(viewNudgeFrameRef.current)
      viewNudgeFrameRef.current = null
    }
  }

  const nudgeViewRotation = (axis: ViewNudgeAxis, direction: -1 | 1) => {
    isInertiaActiveRef.current = false
    rotationVelocityRef.current = { x: 0, y: 0 }
    const current = liveRenderPropsRef.current.rotationOffset
    const nudgeState = viewNudgeStateRef.current[axis]
    const startValue = nudgeState.value ?? current[axis]
    const targetBase = nudgeState.target ?? current[axis]
    const epsilon = 0.001
    const targetValue =
      direction > 0
        ? Math.floor((targetBase + epsilon) / GIZMO_SNAP_DEGREES) *
            GIZMO_SNAP_DEGREES +
          GIZMO_SNAP_DEGREES
        : Math.ceil((targetBase - epsilon) / GIZMO_SNAP_DEGREES) *
            GIZMO_SNAP_DEGREES -
          GIZMO_SNAP_DEGREES

    cancelViewNudge()
    nudgeState.target = targetValue
    const startTime = performance.now()
    const duration = 220
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - startTime) / duration))
      const eased = 1 - Math.pow(1 - t, 3)
      const next = startValue + (targetValue - startValue) * eased
      nudgeState.value = next
      onViewRotationSetRef.current?.({ [axis]: next }, { commit: t >= 1 })
      if (t < 1) {
        viewNudgeFrameRef.current = requestAnimationFrame(tick)
      } else {
        viewNudgeFrameRef.current = null
        nudgeState.value = null
        nudgeState.target = null
      }
    }
    viewNudgeFrameRef.current = requestAnimationFrame(tick)
  }

  return {
    viewNudgeFrameRef,
    cancelViewNudge,
    nudgeViewRotation,
  }
}
