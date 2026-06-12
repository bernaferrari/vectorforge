"use client"

import { useCallback } from "react"
import { clampNumber, createEditorId, quantizeTimeToFrame } from "./EditorModel"
import { findKeyframeAtTime } from "./EditorKeyframeModel"
import type {
  MarkCustom,
  MotionPropertyControlsOptions,
} from "./MotionPropertyControlsModel"

type QualityMotionControlsOptions = Pick<
  MotionPropertyControlsOptions,
  | "currentTime"
  | "duration"
  | "autoKeyEnabled"
  | "setGeometryQuality"
  | "setQualityKeyframes"
> & {
  markCustom: MarkCustom
}

export function useQualityMotionControls({
  currentTime,
  duration,
  autoKeyEnabled,
  setGeometryQuality,
  setQualityKeyframes,
  markCustom,
}: QualityMotionControlsOptions) {
  const updateQuality = useCallback(
    (value: number) => {
      const clamped = clampNumber(value, 0.015, 0.12)
      markCustom()
      setGeometryQuality(clamped)
      setQualityKeyframes((prev) => {
        const playheadTime = clampNumber(
          quantizeTimeToFrame(currentTime),
          0,
          duration
        )
        const existing = findKeyframeAtTime(prev, currentTime)
        if (existing)
          return prev.map((kf) =>
            kf.id === existing.id ? { ...kf, value: clamped } : kf
          )
        if (autoKeyEnabled) {
          return [
            ...prev,
            {
              id: createEditorId("quality"),
              time: playheadTime,
              value: clamped,
              easing: "ease-in-out" as const,
            },
          ].sort((a, b) => a.time - b.time)
        }
        return prev
      })
    },
    [
      autoKeyEnabled,
      currentTime,
      duration,
      markCustom,
      setGeometryQuality,
      setQualityKeyframes,
    ]
  )

  return { updateQuality }
}
