import type { Dispatch, SetStateAction } from "react"
import type {
  LightPosition,
  MaterialKeyframe,
  MaterialSettings,
  ScalarKeyframe,
  Vector3Keyframe,
} from "./EditorModel"
import { createEditorId } from "./EditorModel"
import {
  findKeyframeAtTime,
  previousEasingFor,
  upsertVectorKeyframeAtTime,
} from "./EditorKeyframeModel"
import type { FillKeyframe } from "./TimelineModel"
import type { EasingType } from "./TimelineModel"

const STYLE_ROW_PREFIX = "style-"
const KEYFRAME_TIME_THRESHOLD = 0.04

export const styleKeyframeTimeFromId = (keyframeId: string) =>
  Number(keyframeId.replace(STYLE_ROW_PREFIX, ""))

export const matchesStyleKeyframeId = (time: number, keyframeId: string) =>
  Math.abs(time - styleKeyframeTimeFromId(keyframeId)) < KEYFRAME_TIME_THRESHOLD

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

export type TimelinePropertyKeyframeValues = {
  duration: number
  selectedShapeFillStops: FillKeyframe["stops"]
  selectedShapeGradientType: FillKeyframe["gradientType"]
  activeMaterialSettings: MaterialSettings
  activeKeyLightPosition: LightPosition
  activeRotationOffset: LightPosition
  activeMoveOffset: LightPosition
}

export const clearPropertyRowKeyframes = (
  rowId: string,
  setters: TimelinePropertyKeyframeSetters
) => {
  switch (rowId) {
    case "style":
      setters.setFillKeyframes([])
      setters.setMaterialKeyframes([])
      break
    case "fill":
      setters.setFillKeyframes([])
      break
    case "light-position":
      setters.setKeyLightPositionKeyframes([])
      break
    case "rotation":
      setters.setRotationAxisKeyframes([])
      break
    case "move":
      setters.setMoveKeyframes([])
      break
    case "material":
      setters.setMaterialKeyframes([])
      break
    case "quality":
      setters.setQualityKeyframes([])
      break
  }
}

export const removePropertyRowKeyframe = (
  rowId: string,
  keyframeId: string,
  setters: TimelinePropertyKeyframeSetters
) => {
  switch (rowId) {
    case "style":
      setters.setFillKeyframes((prev) =>
        removeStyleKeyframesAtIdTime(prev, keyframeId)
      )
      setters.setMaterialKeyframes((prev) =>
        removeStyleKeyframesAtIdTime(prev, keyframeId)
      )
      break
    case "fill":
      setters.setFillKeyframes((prev) => removeKeyframeById(prev, keyframeId))
      break
    case "light-position":
      setters.setKeyLightPositionKeyframes((prev) =>
        removeKeyframeById(prev, keyframeId)
      )
      break
    case "rotation":
      setters.setRotationAxisKeyframes((prev) =>
        removeKeyframeById(prev, keyframeId)
      )
      break
    case "move":
      setters.setMoveKeyframes((prev) => removeKeyframeById(prev, keyframeId))
      break
    case "material":
      setters.setMaterialKeyframes((prev) =>
        removeKeyframeById(prev, keyframeId)
      )
      break
    case "quality":
      setters.setQualityKeyframes((prev) =>
        removeKeyframeById(prev, keyframeId)
      )
      break
  }
}

export const addFillKeyframe = (
  keyframes: FillKeyframe[],
  time: number,
  values: Pick<
    TimelinePropertyKeyframeValues,
    "selectedShapeFillStops" | "selectedShapeGradientType"
  >
) => {
  if (findKeyframeAtTime(keyframes, time)) return keyframes
  return [
    ...keyframes,
    {
      id: createEditorId("fill"),
      time,
      stops: values.selectedShapeFillStops,
      gradientType: values.selectedShapeGradientType,
      easing: previousEasingFor(keyframes, time),
    },
  ].sort((a, b) => a.time - b.time)
}

export const addMaterialKeyframe = (
  keyframes: MaterialKeyframe[],
  time: number,
  values: Pick<TimelinePropertyKeyframeValues, "activeMaterialSettings">
) => {
  if (findKeyframeAtTime(keyframes, time)) return keyframes
  return [
    ...keyframes,
    {
      id: createEditorId("material"),
      time,
      value: values.activeMaterialSettings,
      easing: previousEasingFor(keyframes, time),
    },
  ].sort((a, b) => a.time - b.time)
}

export const addPropertyRowKeyframe = (
  rowId: string,
  time: number,
  values: TimelinePropertyKeyframeValues,
  setters: TimelinePropertyKeyframeSetters
) => {
  switch (rowId) {
    case "style":
      setters.setFillKeyframes((prev) => addFillKeyframe(prev, time, values))
      setters.setMaterialKeyframes((prev) =>
        addMaterialKeyframe(prev, time, values)
      )
      break
    case "fill":
      setters.setFillKeyframes((prev) => addFillKeyframe(prev, time, values))
      break
    case "material":
      setters.setMaterialKeyframes((prev) =>
        addMaterialKeyframe(prev, time, values)
      )
      break
    case "light-position":
      setters.setKeyLightPositionKeyframes((prev) =>
        upsertVectorKeyframeAtTime({
          keyframes: prev,
          idPrefix: "light-position",
          value: values.activeKeyLightPosition,
          time,
          duration: values.duration,
          createIfMissing: true,
        })
      )
      break
    case "rotation":
      setters.setRotationAxisKeyframes((prev) =>
        upsertVectorKeyframeAtTime({
          keyframes: prev,
          idPrefix: "rotation",
          value: values.activeRotationOffset,
          time,
          duration: values.duration,
          createIfMissing: true,
        })
      )
      break
    case "move":
      setters.setMoveKeyframes((prev) =>
        upsertVectorKeyframeAtTime({
          keyframes: prev,
          idPrefix: "move",
          value: values.activeMoveOffset,
          time,
          duration: values.duration,
          createIfMissing: true,
        })
      )
      break
  }
}

export const movePropertyRowKeyframe = (
  rowId: string,
  keyframeId: string,
  time: number,
  setters: TimelinePropertyKeyframeSetters
) => {
  switch (rowId) {
    case "style":
      setters.setFillKeyframes((prev) =>
        moveStyleKeyframesAtIdTime(prev, keyframeId, time)
      )
      setters.setMaterialKeyframes((prev) =>
        moveStyleKeyframesAtIdTime(prev, keyframeId, time)
      )
      break
    case "fill":
      setters.setFillKeyframes((prev) =>
        moveKeyframeById(prev, keyframeId, time)
      )
      break
    case "light-position":
      setters.setKeyLightPositionKeyframes((prev) =>
        moveKeyframeById(prev, keyframeId, time)
      )
      break
    case "rotation":
      setters.setRotationAxisKeyframes((prev) =>
        moveKeyframeById(prev, keyframeId, time)
      )
      break
    case "move":
      setters.setMoveKeyframes((prev) =>
        moveKeyframeById(prev, keyframeId, time)
      )
      break
    case "material":
      setters.setMaterialKeyframes((prev) =>
        moveKeyframeById(prev, keyframeId, time)
      )
      break
    case "quality":
      setters.setQualityKeyframes((prev) =>
        moveKeyframeById(prev, keyframeId, time)
      )
      break
  }
}

export const setPropertyRowKeyframeEasing = (
  rowId: string,
  keyframeId: string | null,
  easing: EasingType,
  setters: TimelinePropertyKeyframeSetters
) => {
  switch (rowId) {
    case "style":
      setters.setFillKeyframes((prev) =>
        setStyleKeyframesEasingAtIdTime(prev, keyframeId, easing)
      )
      setters.setMaterialKeyframes((prev) =>
        setStyleKeyframesEasingAtIdTime(prev, keyframeId, easing)
      )
      break
    case "fill":
      setters.setFillKeyframes((prev) =>
        setKeyframeEasingById(prev, keyframeId, easing)
      )
      break
    case "light-position":
      setters.setKeyLightPositionKeyframes((prev) =>
        setKeyframeEasingById(prev, keyframeId, easing)
      )
      break
    case "rotation":
      setters.setRotationAxisKeyframes((prev) =>
        setKeyframeEasingById(prev, keyframeId, easing)
      )
      break
    case "move":
      setters.setMoveKeyframes((prev) =>
        setKeyframeEasingById(prev, keyframeId, easing)
      )
      break
    case "material":
      setters.setMaterialKeyframes((prev) =>
        setKeyframeEasingById(prev, keyframeId, easing)
      )
      break
    case "quality":
      setters.setQualityKeyframes((prev) =>
        setKeyframeEasingById(prev, keyframeId, easing)
      )
      break
  }
}
