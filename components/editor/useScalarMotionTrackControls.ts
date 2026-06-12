"use client"

import { useCallback } from "react"
import type { LightPosition, MotionTrackId } from "./EditorModel"
import { SCALE_MAX, clampNumber } from "./EditorModel"
import type {
  MarkCustom,
  MotionPropertyControlsOptions,
} from "./MotionPropertyControlsModel"
import { setScalarTrackValueAtTime } from "./TrackValueModel"

type ScalarMotionTrackControlsOptions = Pick<
  MotionPropertyControlsOptions,
  | "currentTime"
  | "duration"
  | "tracks"
  | "setTracks"
  | "setSelectedMotionTrackId"
  | "setExtrusionDepth"
  | "setObjectScale"
  | "setObjectScaleAxes"
  | "setIsScaleLocked"
  | "setKeyLightIntensity"
  | "autoKeyEnabled"
> & {
  markCustom: MarkCustom
}

export function useScalarMotionTrackControls({
  currentTime,
  duration,
  tracks,
  setTracks,
  setSelectedMotionTrackId,
  setExtrusionDepth,
  setObjectScale,
  setObjectScaleAxes,
  setIsScaleLocked,
  setKeyLightIntensity,
  autoKeyEnabled,
  markCustom,
}: ScalarMotionTrackControlsOptions) {
  const setTrackValue = useCallback(
    (
      trackId: MotionTrackId,
      nextValue: number,
      syncStaticValue?: (value: number) => void,
      createIfMissing = autoKeyEnabled
    ) => {
      setSelectedMotionTrackId(trackId)
      markCustom()
      const result = setScalarTrackValueAtTime({
        tracks,
        trackId,
        value: nextValue,
        time: currentTime,
        duration,
        createIfMissing,
      })
      syncStaticValue?.(result.value)
      setTracks(result.tracks)
    },
    [
      currentTime,
      duration,
      autoKeyEnabled,
      markCustom,
      setSelectedMotionTrackId,
      setTracks,
      tracks,
    ]
  )

  const handleDepthChange = useCallback(
    (newValue: number) => {
      setTrackValue("extrusion", newValue, setExtrusionDepth)
    },
    [setExtrusionDepth, setTrackValue]
  )

  const handleScaleChange = useCallback(
    (newValue: number) => {
      setTrackValue("scale", newValue, setObjectScale)
    },
    [setObjectScale, setTrackValue]
  )

  const handleScaleAxisChange = useCallback(
    (axis: keyof LightPosition, newValue: number) => {
      setSelectedMotionTrackId("scale")
      markCustom()
      setIsScaleLocked(false)
      setObjectScaleAxes((prev) => ({
        ...prev,
        [axis]: clampNumber(newValue, 0.1, SCALE_MAX),
      }))
    },
    [markCustom, setIsScaleLocked, setObjectScaleAxes, setSelectedMotionTrackId]
  )

  const handleBrightnessChange = useCallback(
    (newValue: number) => {
      setTrackValue("lighting", newValue, setKeyLightIntensity)
    },
    [setKeyLightIntensity, setTrackValue]
  )

  return {
    handleDepthChange,
    handleScaleChange,
    handleScaleAxisChange,
    handleBrightnessChange,
  }
}
