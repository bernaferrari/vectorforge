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
  addKeyframeAtTime,
  moveKeyframeById,
  removeKeyframeById,
  setKeyframeEasingById,
  upsertVectorKeyframeAtTime,
} from "./EditorKeyframeModel"
import type { FillKeyframe } from "./TimelineModel"
import type { EasingType } from "./TimelineModel"

const STYLE_ROW_PREFIX = "style-"
const KEYFRAME_TIME_THRESHOLD = 0.04

type KeyframeArraySetter<T> = Dispatch<SetStateAction<T[]>>

const updateKeyframes = <T>(
  setter: KeyframeArraySetter<T>,
  updater: (keyframes: T[]) => T[]
) => {
  setter((prev) => updater(prev))
}

const removeKeyframe = <T extends { id: string }>(
  setter: KeyframeArraySetter<T>,
  keyframeId: string
) => updateKeyframes(setter, (prev) => removeKeyframeById(prev, keyframeId))

const moveKeyframe = <T extends { id: string; time: number }>(
  setter: KeyframeArraySetter<T>,
  keyframeId: string,
  time: number
) => updateKeyframes(setter, (prev) => moveKeyframeById(prev, keyframeId, time))

const setKeyframeEasing = <T extends { id: string; easing: EasingType }>(
  setter: KeyframeArraySetter<T>,
  keyframeId: string | null,
  easing: EasingType
) =>
  updateKeyframes(setter, (prev) =>
    setKeyframeEasingById(prev, keyframeId, easing)
  )

const addVectorKeyframe = (
  setter: KeyframeArraySetter<Vector3Keyframe>,
  idPrefix: string,
  value: LightPosition,
  time: number,
  duration: number
) =>
  updateKeyframes(setter, (prev) =>
    upsertVectorKeyframeAtTime({
      keyframes: prev,
      idPrefix,
      value,
      time,
      duration,
      createIfMissing: true,
    })
  )

export const styleKeyframeTimeFromId = (keyframeId: string) =>
  Number(keyframeId.replace(STYLE_ROW_PREFIX, ""))

export const matchesStyleKeyframeId = (time: number, keyframeId: string) =>
  Math.abs(time - styleKeyframeTimeFromId(keyframeId)) < KEYFRAME_TIME_THRESHOLD

export const removeStyleKeyframesAtIdTime = <T extends { time: number }>(
  keyframes: T[],
  keyframeId: string
) =>
  keyframes.filter(
    (keyframe) => !matchesStyleKeyframeId(keyframe.time, keyframeId)
  )

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
      removeKeyframe(setters.setFillKeyframes, keyframeId)
      break
    case "light-position":
      removeKeyframe(setters.setKeyLightPositionKeyframes, keyframeId)
      break
    case "rotation":
      removeKeyframe(setters.setRotationAxisKeyframes, keyframeId)
      break
    case "move":
      removeKeyframe(setters.setMoveKeyframes, keyframeId)
      break
    case "material":
      removeKeyframe(setters.setMaterialKeyframes, keyframeId)
      break
    case "quality":
      removeKeyframe(setters.setQualityKeyframes, keyframeId)
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
  return addKeyframeAtTime({
    keyframes,
    time,
    create: (easing) => ({
      id: createEditorId("fill"),
      time,
      stops: values.selectedShapeFillStops,
      gradientType: values.selectedShapeGradientType,
      easing,
    }),
  })
}

export const addMaterialKeyframe = (
  keyframes: MaterialKeyframe[],
  time: number,
  values: Pick<TimelinePropertyKeyframeValues, "activeMaterialSettings">
) => {
  return addKeyframeAtTime({
    keyframes,
    time,
    create: (easing) => ({
      id: createEditorId("material"),
      time,
      value: values.activeMaterialSettings,
      easing,
    }),
  })
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
      addVectorKeyframe(
        setters.setKeyLightPositionKeyframes,
        "light-position",
        values.activeKeyLightPosition,
        time,
        values.duration
      )
      break
    case "rotation":
      addVectorKeyframe(
        setters.setRotationAxisKeyframes,
        "rotation",
        values.activeRotationOffset,
        time,
        values.duration
      )
      break
    case "move":
      addVectorKeyframe(
        setters.setMoveKeyframes,
        "move",
        values.activeMoveOffset,
        time,
        values.duration
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
      moveKeyframe(setters.setFillKeyframes, keyframeId, time)
      break
    case "light-position":
      moveKeyframe(setters.setKeyLightPositionKeyframes, keyframeId, time)
      break
    case "rotation":
      moveKeyframe(setters.setRotationAxisKeyframes, keyframeId, time)
      break
    case "move":
      moveKeyframe(setters.setMoveKeyframes, keyframeId, time)
      break
    case "material":
      moveKeyframe(setters.setMaterialKeyframes, keyframeId, time)
      break
    case "quality":
      moveKeyframe(setters.setQualityKeyframes, keyframeId, time)
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
      setKeyframeEasing(setters.setFillKeyframes, keyframeId, easing)
      break
    case "light-position":
      setKeyframeEasing(
        setters.setKeyLightPositionKeyframes,
        keyframeId,
        easing
      )
      break
    case "rotation":
      setKeyframeEasing(setters.setRotationAxisKeyframes, keyframeId, easing)
      break
    case "move":
      setKeyframeEasing(setters.setMoveKeyframes, keyframeId, easing)
      break
    case "material":
      setKeyframeEasing(setters.setMaterialKeyframes, keyframeId, easing)
      break
    case "quality":
      setKeyframeEasing(setters.setQualityKeyframes, keyframeId, easing)
      break
  }
}
