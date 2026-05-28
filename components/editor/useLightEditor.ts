"use client"

import { useMemo, useState } from "react"
import {
  LightPosition,
  LightPositionKeyframe,
  TimeKeyframe,
  clampNumber,
  createEditorId,
  interpolateLightPositionKeyframes,
  quantizeTimeToFrame,
} from "./EditorModel"
import type { FillKeyframe } from "./TimelineModel"

export const STATIC_STUDIO_LIGHTING = {
  ambientColor: "#ffffff",
  ambientIntensity: 0.6,
  rimLightColor: "#a48bff",
  rimLightIntensity: 0.8,
}

const previousEasingFor = <
  T extends TimeKeyframe & { easing?: FillKeyframe["easing"] },
>(
  keyframes: T[],
  time: number
): FillKeyframe["easing"] =>
  [...keyframes]
    .sort((a, b) => a.time - b.time)
    .filter((keyframe) => keyframe.time <= time)
    .pop()?.easing ?? ("ease-in-out" as const)

export function useLightEditor({
  currentTime,
  duration,
  onEdit,
}: {
  currentTime: number
  duration: number
  onEdit: () => void
}) {
  const [keyLightColor, setKeyLightColor] = useState<string>("#ffffff")
  const [keyLightIntensity, setKeyLightIntensity] = useState<number>(1.2)
  const [keyLightPosition, setKeyLightPosition] = useState<LightPosition>({
    x: 5,
    y: 5,
    z: 4,
  })
  const [keyLightSoftness, setKeyLightSoftness] = useState<number>(0.35)
  const [keyLightPositionKeyframes, setKeyLightPositionKeyframes] = useState<
    LightPositionKeyframe[]
  >([])

  const activeKeyLightPosition = useMemo(
    () =>
      interpolateLightPositionKeyframes(
        currentTime,
        keyLightPosition,
        keyLightPositionKeyframes
      ),
    [currentTime, keyLightPosition, keyLightPositionKeyframes]
  )

  const lightPositionKeyframeAtPlayhead = () => {
    const playheadTime = quantizeTimeToFrame(currentTime)
    return keyLightPositionKeyframes.find(
      (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
    )
  }

  const toggleLightPositionKeyframeAtPlayhead = () => {
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    onEdit()
    setKeyLightPositionKeyframes((prev) => {
      const existing = prev.find(
        (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
      )
      if (existing)
        return prev.filter((keyframe) => keyframe.id !== existing.id)

      return [
        ...prev,
        {
          id: createEditorId("light-position"),
          time: playheadTime,
          value: activeKeyLightPosition,
          easing: previousEasingFor(prev, playheadTime),
        },
      ].sort((a, b) => a.time - b.time)
    })
  }

  const updateLightPositionXY = (x: number, y: number) => {
    const clampedX = clampNumber(x, -12, 12)
    const clampedY = clampNumber(y, -12, 12)
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    const nextPosition = { ...activeKeyLightPosition, x: clampedX, y: clampedY }
    onEdit()
    setKeyLightPosition(nextPosition)
    setKeyLightPositionKeyframes((prev) => {
      if (prev.length === 0) return prev
      const existing = prev.find(
        (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
      )
      if (existing) {
        return prev.map((keyframe) =>
          keyframe.id === existing.id
            ? { ...keyframe, value: nextPosition }
            : keyframe
        )
      }

      return [
        ...prev,
        {
          id: createEditorId("light-position"),
          time: playheadTime,
          value: nextPosition,
          easing: previousEasingFor(prev, playheadTime),
        },
      ].sort((a, b) => a.time - b.time)
    })
  }

  return {
    ...STATIC_STUDIO_LIGHTING,
    keyLightColor,
    setKeyLightColor,
    keyLightIntensity,
    setKeyLightIntensity,
    keyLightPosition,
    setKeyLightPosition,
    keyLightSoftness,
    setKeyLightSoftness,
    keyLightPositionKeyframes,
    setKeyLightPositionKeyframes,
    activeKeyLightPosition,
    lightPositionKeyframeAtPlayhead,
    toggleLightPositionKeyframeAtPlayhead,
    updateLightPositionXY,
  }
}
