"use client"

import { useState } from "react"
import {
  DEFAULT_ROTATION_END,
  DEFAULT_ROTATION_START,
  type LightPosition,
  SCALE_DEFAULT,
  type Vector3Keyframe,
} from "./EditorModel"

export function useTransformEditor() {
  const [objectScale, setObjectScale] = useState(SCALE_DEFAULT)
  const [objectScaleAxes, setObjectScaleAxes] = useState<LightPosition>({
    x: 1,
    y: 1,
    z: 1,
  })
  const [moveOffset, setMoveOffset] = useState<LightPosition>({
    x: 0,
    y: 0,
    z: 0,
  })
  const [moveKeyframes, setMoveKeyframes] = useState<Vector3Keyframe[]>([])
  const [rotationOffset, setRotationOffset] = useState<LightPosition>({
    x: 0,
    y: 0,
    z: 0,
  })
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
  const [previewRotationY, setPreviewRotationY] = useState<number | null>(null)
  const [isScaleLocked, setIsScaleLocked] = useState(true)

  return {
    objectScale,
    setObjectScale,
    objectScaleAxes,
    setObjectScaleAxes,
    moveOffset,
    setMoveOffset,
    moveKeyframes,
    setMoveKeyframes,
    rotationOffset,
    setRotationOffset,
    rotationAxisKeyframes,
    setRotationAxisKeyframes,
    previewRotationY,
    setPreviewRotationY,
    isScaleLocked,
    setIsScaleLocked,
  }
}
