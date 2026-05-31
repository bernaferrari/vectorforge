"use client"

import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import {
  DEFAULT_TRANSFORM_SETTINGS,
  type LightPosition,
  type Vector3Keyframe,
  DEFAULT_ROTATION_END,
  DEFAULT_ROTATION_START,
} from "./EditorModel"
import { useGroupedSettings } from "./useGroupedSettings"

export function useTransformEditor() {
  const [baseTransformSettings, setTransformBaseSettings, setTransformSetting] =
    useGroupedSettings(DEFAULT_TRANSFORM_SETTINGS)
  const [moveKeyframes, setMoveKeyframes] = useState<Vector3Keyframe[]>([])
  const [rotationAxisKeyframes, setRotationAxisKeyframes] = useState<
    Vector3Keyframe[]
  >([
    {
      id: "rotation-axis-start",
      time: 0,
      value: { x: 0, y: DEFAULT_ROTATION_START, z: 0 },
      easing: "ease-in-out",
    },
    {
      id: "rotation-axis-end",
      time: 5,
      value: { x: 0, y: DEFAULT_ROTATION_END, z: 0 },
      easing: "ease-in-out",
    },
  ])

  const setObjectScale: Dispatch<SetStateAction<number>> = useCallback(
    (value) => setTransformSetting("objectScale", value),
    [setTransformSetting]
  )
  const setObjectScaleAxes: Dispatch<SetStateAction<LightPosition>> =
    useCallback(
      (value) => setTransformSetting("objectScaleAxes", value),
      [setTransformSetting]
    )
  const setMoveOffset: Dispatch<SetStateAction<LightPosition>> = useCallback(
    (value) => setTransformSetting("moveOffset", value),
    [setTransformSetting]
  )
  const setRotationOffset: Dispatch<SetStateAction<LightPosition>> =
    useCallback(
      (value) => setTransformSetting("rotationOffset", value),
      [setTransformSetting]
    )
  const setPreviewRotationY: Dispatch<SetStateAction<number | null>> =
    useCallback(
      (value) => setTransformSetting("previewRotationY", value),
      [setTransformSetting]
    )
  const setIsScaleLocked: Dispatch<SetStateAction<boolean>> = useCallback(
    (value) => setTransformSetting("isScaleLocked", value),
    [setTransformSetting]
  )

  return {
    setTransformBaseSettings,
    objectScale: baseTransformSettings.objectScale,
    setObjectScale,
    objectScaleAxes: baseTransformSettings.objectScaleAxes,
    setObjectScaleAxes,
    moveOffset: baseTransformSettings.moveOffset,
    setMoveOffset,
    moveKeyframes,
    setMoveKeyframes,
    rotationOffset: baseTransformSettings.rotationOffset,
    setRotationOffset,
    rotationAxisKeyframes,
    setRotationAxisKeyframes,
    previewRotationY: baseTransformSettings.previewRotationY,
    setPreviewRotationY,
    isScaleLocked: baseTransformSettings.isScaleLocked,
    setIsScaleLocked,
  }
}
