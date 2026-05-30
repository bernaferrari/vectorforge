import React, { useMemo } from "react"
import {
  MaterialKeyframe,
  ScalarKeyframe,
  Vector3Keyframe,
  clampNumber,
  quantizeTimeToFrame,
} from "./EditorModel"
import {
  createTimelineBreakpoints,
  getAdjacentTimelineBreakpoints,
} from "./TimelineNavigationModel"
import {
  clearTrackKeyframes,
  clearPropertyRowKeyframes,
  movePropertyRowKeyframe,
  removePropertyRowKeyframe,
  setPropertyRowKeyframeEasing,
} from "./TimelineDockKeyframeModel"
import { createTimelinePropertyRows } from "./TimelinePropertyRowsModel"
import type {
  EasingType,
  FillKeyframe,
  ShapeStop,
  TimelineTrack,
} from "./TimelineModel"

export function useTimelineDockController({
  currentTime,
  seekToTime,
  duration,
  setDuration,
  tracks,
  setTracks,
  sortedShapes,
  setShapes,
  fillKeyframes,
  setFillKeyframes,
  materialKeyframes,
  setMaterialKeyframes,
  keyLightPositionKeyframes,
  setKeyLightPositionKeyframes,
  rotationAxisKeyframes,
  setRotationAxisKeyframes,
  moveKeyframes,
  setMoveKeyframes,
  setQualityKeyframes,
  markCustom,
}: {
  currentTime: number
  seekToTime: (time: number, options?: { animated?: boolean }) => void
  duration: number
  setDuration: React.Dispatch<React.SetStateAction<number>>
  tracks: TimelineTrack[]
  setTracks: React.Dispatch<React.SetStateAction<TimelineTrack[]>>
  sortedShapes: ShapeStop[]
  setShapes: React.Dispatch<React.SetStateAction<ShapeStop[]>>
  fillKeyframes: FillKeyframe[]
  setFillKeyframes: React.Dispatch<React.SetStateAction<FillKeyframe[]>>
  materialKeyframes: MaterialKeyframe[]
  setMaterialKeyframes: React.Dispatch<React.SetStateAction<MaterialKeyframe[]>>
  keyLightPositionKeyframes: Vector3Keyframe[]
  setKeyLightPositionKeyframes: React.Dispatch<
    React.SetStateAction<Vector3Keyframe[]>
  >
  rotationAxisKeyframes: Vector3Keyframe[]
  setRotationAxisKeyframes: React.Dispatch<
    React.SetStateAction<Vector3Keyframe[]>
  >
  moveKeyframes: Vector3Keyframe[]
  setMoveKeyframes: React.Dispatch<React.SetStateAction<Vector3Keyframe[]>>
  setQualityKeyframes: React.Dispatch<React.SetStateAction<ScalarKeyframe[]>>
  markCustom: () => void
}) {
  const timelineBreakpoints = useMemo(
    () =>
      createTimelineBreakpoints({
        duration,
        shapes: sortedShapes,
        fillKeyframes,
        tracks,
        rotationAxisKeyframes,
        moveKeyframes,
        keyLightPositionKeyframes,
        materialKeyframes,
      }),
    [
      duration,
      sortedShapes,
      fillKeyframes,
      tracks,
      rotationAxisKeyframes,
      moveKeyframes,
      keyLightPositionKeyframes,
      materialKeyframes,
    ]
  )

  const timelinePropertyRows = useMemo(
    () =>
      createTimelinePropertyRows({
        fillKeyframes,
        materialKeyframes,
        keyLightPositionKeyframes,
        rotationAxisKeyframes,
        moveKeyframes,
        duration,
      }),
    [
      fillKeyframes,
      materialKeyframes,
      keyLightPositionKeyframes,
      rotationAxisKeyframes,
      moveKeyframes,
      duration,
    ]
  )

  const { previousBreakpoint, nextBreakpoint } = getAdjacentTimelineBreakpoints(
    {
      breakpoints: timelineBreakpoints,
      currentTime,
    }
  )

  const goToTime = (time: number) => {
    seekToTime(quantizeTimeToFrame(clampNumber(time, 0, duration)))
  }

  const handleDurationChange = (value: number) => {
    const next = clampNumber(value, 0.5, 30)
    setDuration(next)
    seekToTime(clampNumber(currentTime, 0, next), { animated: false })
    markCustom()
  }

  const clearTimelineTrackRow = (trackId: string) => {
    setTracks((prev) => clearTrackKeyframes(prev, trackId))
    markCustom()
  }

  const clearTimelinePropertyRow = (rowId: string) => {
    clearPropertyRowKeyframes(rowId, {
      setFillKeyframes,
      setMaterialKeyframes,
      setKeyLightPositionKeyframes,
      setRotationAxisKeyframes,
      setMoveKeyframes,
      setQualityKeyframes,
    })
    markCustom()
  }

  const removeTimelinePropertyKeyframe = (
    rowId: string,
    keyframeId: string
  ) => {
    removePropertyRowKeyframe(rowId, keyframeId, {
      setFillKeyframes,
      setMaterialKeyframes,
      setKeyLightPositionKeyframes,
      setRotationAxisKeyframes,
      setMoveKeyframes,
      setQualityKeyframes,
    })
    markCustom()
  }

  const moveTimelinePropertyKeyframe = (
    rowId: string,
    keyframeId: string,
    time: number
  ) => {
    const nextTime = quantizeTimeToFrame(clampNumber(time, 0, duration))
    movePropertyRowKeyframe(rowId, keyframeId, nextTime, {
      setFillKeyframes,
      setMaterialKeyframes,
      setKeyLightPositionKeyframes,
      setRotationAxisKeyframes,
      setMoveKeyframes,
      setQualityKeyframes,
    })
    markCustom()
  }

  const setTimelinePropertyEasing = (
    rowId: string,
    keyframeId: string | null,
    easing: EasingType
  ) => {
    setPropertyRowKeyframeEasing(rowId, keyframeId, easing, {
      setFillKeyframes,
      setMaterialKeyframes,
      setKeyLightPositionKeyframes,
      setRotationAxisKeyframes,
      setMoveKeyframes,
      setQualityKeyframes,
    })
    markCustom()
  }

  const setShapeBlend = (
    shapeId: string,
    patch: Partial<Pick<ShapeStop, "transitionType" | "wipeDirection">>
  ) => {
    markCustom()
    setShapes((prev) =>
      prev.map((shape) =>
        shape.id === shapeId ? { ...shape, ...patch } : shape
      )
    )
  }

  return {
    timelinePropertyRows,
    previousBreakpoint,
    nextBreakpoint,
    atTimelineStart: currentTime <= 0.04,
    atTimelineEnd: currentTime >= duration - 0.04,
    playbackProgress:
      duration > 0 ? clampNumber(currentTime / duration, 0, 1) : 0,
    goToPreviousBreakpoint: () => {
      if (previousBreakpoint !== undefined) goToTime(previousBreakpoint)
    },
    goToNextBreakpoint: () => {
      if (nextBreakpoint !== undefined) goToTime(nextBreakpoint)
    },
    goToEnd: () => goToTime(duration),
    handleDurationChange,
    handleTracksChange: (nextTracks: TimelineTrack[]) => {
      setTracks(nextTracks)
      markCustom()
    },
    clearTimelineTrackRow,
    clearTimelinePropertyRow,
    removeTimelinePropertyKeyframe,
    moveTimelinePropertyKeyframe,
    setTimelinePropertyEasing,
    setShapeBlend,
  }
}
