"use client"

import type { MotionPropertyControlsOptions } from "./MotionPropertyControlsModel"
import { useLinkedQualityKeyframes } from "./useLinkedQualityKeyframes"
import { useMotionPropertyControls } from "./useMotionPropertyControls"

type EditorMotionSurfaceOptions = MotionPropertyControlsOptions & {
  geometryQuality: number
}

export function useEditorMotionSurface({
  geometryQuality,
  ...motionControlOptions
}: EditorMotionSurfaceOptions) {
  const controls = useMotionPropertyControls(motionControlOptions)

  useLinkedQualityKeyframes({
    tracks: motionControlOptions.tracks,
    geometryQuality,
    setQualityKeyframes: motionControlOptions.setQualityKeyframes,
  })

  return controls
}
