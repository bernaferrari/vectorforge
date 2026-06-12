"use client"

import { useCallback } from "react"
import { type LightPosition, clampNumber } from "./EditorModel"
import { upsertVectorKeyframeAtTime } from "./EditorKeyframeModel"
import type {
  MarkCustom,
  MotionPropertyControlsOptions,
} from "./MotionPropertyControlsModel"

type MoveMotionControlsOptions = Pick<
  MotionPropertyControlsOptions,
  | "currentTime"
  | "duration"
  | "setSelectedMotionTrackId"
  | "activeMoveOffset"
  | "setMoveOffset"
  | "setMoveKeyframes"
  | "autoKeyEnabled"
> & {
  markCustom: MarkCustom
}

export function useMoveMotionControls({
  currentTime,
  duration,
  setSelectedMotionTrackId,
  activeMoveOffset,
  setMoveOffset,
  setMoveKeyframes,
  autoKeyEnabled,
  markCustom,
}: MoveMotionControlsOptions) {
  const applyMove = useCallback(
    (nextMove: LightPosition) => {
      setMoveOffset(nextMove)
      setMoveKeyframes((prev) =>
        upsertVectorKeyframeAtTime({
          keyframes: prev,
          idPrefix: "move",
          value: nextMove,
          time: currentTime,
          duration,
          createIfMissing: autoKeyEnabled,
        })
      )
    },
    [autoKeyEnabled, currentTime, duration, setMoveKeyframes, setMoveOffset]
  )

  const updateMoveAxis = useCallback(
    (axis: keyof LightPosition, value: number) => {
      const clamped = clampNumber(value, -100, 100)
      const nextMove = { ...activeMoveOffset, [axis]: clamped }
      setSelectedMotionTrackId("move")
      markCustom()
      applyMove(nextMove)
    },
    [activeMoveOffset, applyMove, markCustom, setSelectedMotionTrackId]
  )

  const resetMovePositionToOrigin = useCallback(() => {
    const origin = { x: 0, y: 0, z: 0 }

    markCustom()
    applyMove(origin)
  }, [applyMove, markCustom])

  return {
    updateMoveAxis,
    resetMovePositionToOrigin,
  }
}
