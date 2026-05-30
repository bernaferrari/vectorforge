import type { Dispatch, SetStateAction } from "react"
import type {
  MaterialKeyframe,
  ScalarKeyframe,
  Vector3Keyframe,
} from "./EditorModel"
import type { FillKeyframe } from "./TimelineModel"
import type { EasingType, TimelineTrack } from "./TimelineModel"

const STYLE_ROW_PREFIX = "style-"
const KEYFRAME_TIME_THRESHOLD = 0.04

export const styleKeyframeTimeFromId = (keyframeId: string) =>
  Number(keyframeId.replace(STYLE_ROW_PREFIX, ""))

export const matchesStyleKeyframeId = (time: number, keyframeId: string) =>
  Math.abs(time - styleKeyframeTimeFromId(keyframeId)) < KEYFRAME_TIME_THRESHOLD

export const clearTrackKeyframes = (tracks: TimelineTrack[], trackId: string) =>
  tracks.map((track) =>
    track.id === trackId ? { ...track, keyframes: [] } : track
  )

export const removeKeyframeById = <T extends { id: string }>(
  keyframes: T[],
  keyframeId: string
) => keyframes.filter((keyframe) => keyframe.id !== keyframeId)

export const removeStyleKeyframesAtIdTime = <T extends { time: number }>(
  keyframes: T[],
  keyframeId: string
) =>
  keyframes.filter(
    (keyframe) => !matchesStyleKeyframeId(keyframe.time, keyframeId)
  )

export const moveKeyframeById = <T extends { id: string; time: number }>(
  keyframes: T[],
  keyframeId: string,
  time: number
) =>
  keyframes
    .map((keyframe) =>
      keyframe.id === keyframeId ? { ...keyframe, time } : keyframe
    )
    .sort((a, b) => a.time - b.time)

export const moveStyleKeyframesAtIdTime = <T extends { time: number }>(
  keyframes: T[],
  keyframeId: string,
  time: number
) =>
  keyframes.map((keyframe) =>
    matchesStyleKeyframeId(keyframe.time, keyframeId)
      ? { ...keyframe, time }
      : keyframe
  )

export const setKeyframeEasingById = <
  T extends { id: string; easing: EasingType },
>(
  keyframes: T[],
  keyframeId: string | null,
  easing: EasingType
) =>
  keyframes.map((keyframe) =>
    keyframeId === null || keyframe.id === keyframeId
      ? { ...keyframe, easing }
      : keyframe
  )

export const setStyleKeyframesEasingAtIdTime = <
  T extends { time: number; easing: EasingType },
>(
  keyframes: T[],
  keyframeId: string | null,
  easing: EasingType
) =>
  keyframes.map((keyframe) =>
    keyframeId === null || matchesStyleKeyframeId(keyframe.time, keyframeId)
      ? { ...keyframe, easing }
      : keyframe
  )

export type TimelinePropertyKeyframeSetters = {
  setFillKeyframes: Dispatch<SetStateAction<FillKeyframe[]>>
  setMaterialKeyframes: Dispatch<SetStateAction<MaterialKeyframe[]>>
  setKeyLightPositionKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setRotationAxisKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setMoveKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setQualityKeyframes: Dispatch<SetStateAction<ScalarKeyframe[]>>
}

export const clearPropertyRowKeyframes = (
  rowId: string,
  setters: TimelinePropertyKeyframeSetters
) => {
  if (rowId === "style") {
    setters.setFillKeyframes([])
    setters.setMaterialKeyframes([])
    return
  }
  if (rowId === "fill") setters.setFillKeyframes([])
  if (rowId === "light-position") setters.setKeyLightPositionKeyframes([])
  if (rowId === "rotation") setters.setRotationAxisKeyframes([])
  if (rowId === "move") setters.setMoveKeyframes([])
  if (rowId === "material") setters.setMaterialKeyframes([])
  if (rowId === "quality") setters.setQualityKeyframes([])
}

export const removePropertyRowKeyframe = (
  rowId: string,
  keyframeId: string,
  setters: TimelinePropertyKeyframeSetters
) => {
  if (rowId === "style") {
    setters.setFillKeyframes((prev) =>
      removeStyleKeyframesAtIdTime(prev, keyframeId)
    )
    setters.setMaterialKeyframes((prev) =>
      removeStyleKeyframesAtIdTime(prev, keyframeId)
    )
    return
  }
  if (rowId === "fill") {
    setters.setFillKeyframes((prev) => removeKeyframeById(prev, keyframeId))
  }
  if (rowId === "light-position") {
    setters.setKeyLightPositionKeyframes((prev) =>
      removeKeyframeById(prev, keyframeId)
    )
  }
  if (rowId === "rotation") {
    setters.setRotationAxisKeyframes((prev) =>
      removeKeyframeById(prev, keyframeId)
    )
  }
  if (rowId === "move") {
    setters.setMoveKeyframes((prev) => removeKeyframeById(prev, keyframeId))
  }
  if (rowId === "material") {
    setters.setMaterialKeyframes((prev) => removeKeyframeById(prev, keyframeId))
  }
  if (rowId === "quality") {
    setters.setQualityKeyframes((prev) => removeKeyframeById(prev, keyframeId))
  }
}

export const movePropertyRowKeyframe = (
  rowId: string,
  keyframeId: string,
  time: number,
  setters: TimelinePropertyKeyframeSetters
) => {
  if (rowId === "style") {
    setters.setFillKeyframes((prev) =>
      moveStyleKeyframesAtIdTime(prev, keyframeId, time)
    )
    setters.setMaterialKeyframes((prev) =>
      moveStyleKeyframesAtIdTime(prev, keyframeId, time)
    )
    return
  }
  if (rowId === "fill") {
    setters.setFillKeyframes((prev) => moveKeyframeById(prev, keyframeId, time))
  }
  if (rowId === "light-position") {
    setters.setKeyLightPositionKeyframes((prev) =>
      moveKeyframeById(prev, keyframeId, time)
    )
  }
  if (rowId === "rotation") {
    setters.setRotationAxisKeyframes((prev) =>
      moveKeyframeById(prev, keyframeId, time)
    )
  }
  if (rowId === "move") {
    setters.setMoveKeyframes((prev) => moveKeyframeById(prev, keyframeId, time))
  }
  if (rowId === "material") {
    setters.setMaterialKeyframes((prev) =>
      moveKeyframeById(prev, keyframeId, time)
    )
  }
  if (rowId === "quality") {
    setters.setQualityKeyframes((prev) =>
      moveKeyframeById(prev, keyframeId, time)
    )
  }
}

export const setPropertyRowKeyframeEasing = (
  rowId: string,
  keyframeId: string | null,
  easing: EasingType,
  setters: TimelinePropertyKeyframeSetters
) => {
  if (rowId === "style") {
    setters.setFillKeyframes((prev) =>
      setStyleKeyframesEasingAtIdTime(prev, keyframeId, easing)
    )
    setters.setMaterialKeyframes((prev) =>
      setStyleKeyframesEasingAtIdTime(prev, keyframeId, easing)
    )
    return
  }
  if (rowId === "fill") {
    setters.setFillKeyframes((prev) =>
      setKeyframeEasingById(prev, keyframeId, easing)
    )
  }
  if (rowId === "light-position") {
    setters.setKeyLightPositionKeyframes((prev) =>
      setKeyframeEasingById(prev, keyframeId, easing)
    )
  }
  if (rowId === "rotation") {
    setters.setRotationAxisKeyframes((prev) =>
      setKeyframeEasingById(prev, keyframeId, easing)
    )
  }
  if (rowId === "move") {
    setters.setMoveKeyframes((prev) =>
      setKeyframeEasingById(prev, keyframeId, easing)
    )
  }
  if (rowId === "material") {
    setters.setMaterialKeyframes((prev) =>
      setKeyframeEasingById(prev, keyframeId, easing)
    )
  }
  if (rowId === "quality") {
    setters.setQualityKeyframes((prev) =>
      setKeyframeEasingById(prev, keyframeId, easing)
    )
  }
}
