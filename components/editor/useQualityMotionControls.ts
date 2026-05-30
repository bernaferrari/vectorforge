"use client"

import { useCallback } from "react"
import { clampNumber } from "./EditorModel"
import { findKeyframeAtTime } from "./EditorKeyframeModel"
import type {
  MarkCustom,
  MotionPropertyControlsOptions,
} from "./MotionPropertyControlsModel"

type QualityMotionControlsOptions = Pick<
  MotionPropertyControlsOptions,
  "currentTime" | "setGeometryQuality" | "setQualityKeyframes"
> & {
  markCustom: MarkCustom
}

export function useQualityMotionControls({
  currentTime,
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
        if (prev.length === 0) return prev
        const existing = findKeyframeAtTime(prev, currentTime)
        if (existing)
          return prev.map((kf) =>
            kf.id === existing.id ? { ...kf, value: clamped } : kf
          )
        return prev
      })
    },
    [currentTime, markCustom, setGeometryQuality, setQualityKeyframes]
  )

  return { updateQuality }
}
