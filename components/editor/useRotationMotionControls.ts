"use client"

import { useCallback } from "react"
import {
  type LightPosition,
  ROTATION_MAX,
  ROTATION_MIN,
  clampNumber,
  quantizeTimeToFrame,
} from "./EditorModel"
import { upsertVectorKeyframeAtTime } from "./EditorKeyframeModel"
import type {
  MarkCustom,
  MotionPropertyControlsOptions,
} from "./MotionPropertyControlsModel"

type RotationMotionControlsOptions = Pick<
  MotionPropertyControlsOptions,
  | "currentTime"
  | "duration"
  | "setSelectedMotionTrackId"
  | "setRotationOffset"
  | "activeRotationOffset"
  | "setRotationAxisKeyframes"
  | "setPreviewRotationY"
> & {
  markCustom: MarkCustom
}

const clampedRotationTarget = (
  target: Partial<{ x: number; y: number; z: number }>
) => ({
  x:
    target.x === undefined
      ? undefined
      : clampNumber(target.x, ROTATION_MIN, ROTATION_MAX),
  y:
    target.y === undefined
      ? undefined
      : clampNumber(target.y, ROTATION_MIN, ROTATION_MAX),
  z:
    target.z === undefined
      ? undefined
      : clampNumber(target.z, ROTATION_MIN, ROTATION_MAX),
})

export function useRotationMotionControls({
  currentTime,
  duration,
  setSelectedMotionTrackId,
  setRotationOffset,
  activeRotationOffset,
  setRotationAxisKeyframes,
  setPreviewRotationY,
  markCustom,
}: RotationMotionControlsOptions) {
  const playheadTime = useCallback(
    () => clampNumber(quantizeTimeToFrame(currentTime), 0, duration),
    [currentTime, duration]
  )

  const commitRotationKeyframe = useCallback(
    (nextRotation: LightPosition, time: number) => {
      setRotationAxisKeyframes((keyframes) =>
        upsertVectorKeyframeAtTime({
          keyframes,
          idPrefix: "rotation",
          value: nextRotation,
          time,
          duration,
          createIfMissing: keyframes.length > 0,
        })
      )
    },
    [duration, setRotationAxisKeyframes]
  )

  const applyRotation = useCallback(
    (nextRotation: LightPosition, time: number) => {
      setRotationOffset(nextRotation)
      commitRotationKeyframe(nextRotation, time)
    },
    [commitRotationKeyframe, setRotationOffset]
  )

  const handleRotationAxisChange = useCallback(
    (axis: keyof LightPosition, newValue: number) => {
      setSelectedMotionTrackId("rotation")
      markCustom()
      setPreviewRotationY(null)
      const nextRotation = {
        ...activeRotationOffset,
        [axis]: clampNumber(newValue, ROTATION_MIN, ROTATION_MAX),
      }
      applyRotation(nextRotation, currentTime)
    },
    [
      activeRotationOffset,
      applyRotation,
      currentTime,
      markCustom,
      setPreviewRotationY,
      setSelectedMotionTrackId,
    ]
  )

  const handleViewRotationCommit = useCallback(
    (delta: { x: number; y: number; z: number }) => {
      setSelectedMotionTrackId("rotation")
      markCustom()
      setPreviewRotationY(null)
      const nextRotation = {
        x: clampNumber(
          activeRotationOffset.x + delta.x,
          ROTATION_MIN,
          ROTATION_MAX
        ),
        y: clampNumber(
          activeRotationOffset.y + delta.y,
          ROTATION_MIN,
          ROTATION_MAX
        ),
        z: clampNumber(
          activeRotationOffset.z + delta.z,
          ROTATION_MIN,
          ROTATION_MAX
        ),
      }

      applyRotation(nextRotation, playheadTime())
    },
    [
      activeRotationOffset,
      applyRotation,
      markCustom,
      playheadTime,
      setPreviewRotationY,
      setSelectedMotionTrackId,
    ]
  )

  const handleViewRotationSet = useCallback(
    (
      target: Partial<{ x: number; y: number; z: number }>,
      options: { commit?: boolean; updateTimeline?: boolean } = {}
    ) => {
      setSelectedMotionTrackId("rotation")
      markCustom()
      const clampedTarget = clampedRotationTarget(target)

      const nextRotation = {
        x: clampedTarget.x ?? activeRotationOffset.x,
        y: clampedTarget.y ?? activeRotationOffset.y,
        z: clampedTarget.z ?? activeRotationOffset.z,
      }
      setRotationOffset(nextRotation)

      if (options.updateTimeline === false) {
        if (clampedTarget.y !== undefined) {
          setPreviewRotationY(clampedTarget.y)
        }
        return
      }

      if (clampedTarget.y !== undefined && options.commit === false) {
        setPreviewRotationY(clampedTarget.y)
        return
      }

      setPreviewRotationY(null)
      applyRotation(nextRotation, playheadTime())
    },
    [
      activeRotationOffset,
      applyRotation,
      markCustom,
      playheadTime,
      setPreviewRotationY,
      setRotationOffset,
      setSelectedMotionTrackId,
    ]
  )

  return {
    handleRotationAxisChange,
    handleViewRotationCommit,
    handleViewRotationSet,
  }
}
