"use client"

import { useCallback, useMemo, useState, type SetStateAction } from "react"
import {
  DEFAULT_LIGHT_SETTINGS,
  LightPosition,
  LightPositionKeyframe,
  clampNumber,
  createEditorId,
  quantizeTimeToFrame,
} from "./EditorModel"
import { previousEasingFor } from "./EditorKeyframeModel"
import { interpolateLightPositionKeyframes } from "./KeyframeInterpolationModel"
import { useGroupedSettings } from "./useGroupedSettings"

export const STATIC_STUDIO_LIGHTING = {
  ambientColor: "#ffffff",
  ambientIntensity: 0.6,
  rimLightColor: "#a48bff",
  rimLightIntensity: 0.8,
}

export function useLightEditor({
  currentTime,
  duration,
  onEdit,
}: {
  currentTime: number
  duration: number
  onEdit: () => void
}) {
  const [baseLightSettings, setLightBaseSettings, setLightSetting] =
    useGroupedSettings(DEFAULT_LIGHT_SETTINGS)
  const [keyLightPositionKeyframes, setKeyLightPositionKeyframes] = useState<
    LightPositionKeyframe[]
  >([])

  const setKeyLightColor = useCallback(
    (value: SetStateAction<string>) => setLightSetting("keyLightColor", value),
    [setLightSetting]
  )
  const setKeyLightIntensity = useCallback(
    (value: SetStateAction<number>) =>
      setLightSetting("keyLightIntensity", value),
    [setLightSetting]
  )
  const setKeyLightPosition = useCallback(
    (value: SetStateAction<LightPosition>) =>
      setLightSetting("keyLightPosition", value),
    [setLightSetting]
  )
  const setKeyLightSoftness = useCallback(
    (value: SetStateAction<number>) =>
      setLightSetting("keyLightSoftness", value),
    [setLightSetting]
  )

  const activeKeyLightPosition = useMemo(
    () =>
      interpolateLightPositionKeyframes(
        currentTime,
        baseLightSettings.keyLightPosition,
        keyLightPositionKeyframes
      ),
    [currentTime, baseLightSettings.keyLightPosition, keyLightPositionKeyframes]
  )

  const lightPositionKeyframeAtPlayhead = useCallback(() => {
    const playheadTime = quantizeTimeToFrame(currentTime)
    return keyLightPositionKeyframes.find(
      (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
    )
  }, [currentTime, keyLightPositionKeyframes])

  const toggleLightPositionKeyframeAtPlayhead = useCallback(() => {
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
  }, [activeKeyLightPosition, currentTime, duration, onEdit])

  const updateLightPositionXY = useCallback(
    (x: number, y: number) => {
      const clampedX = clampNumber(x, -12, 12)
      const clampedY = clampNumber(y, -12, 12)
      const playheadTime = clampNumber(
        quantizeTimeToFrame(currentTime),
        0,
        duration
      )
      const nextPosition = {
        ...activeKeyLightPosition,
        x: clampedX,
        y: clampedY,
      }
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
    },
    [activeKeyLightPosition, currentTime, duration, onEdit]
  )

  return {
    ...STATIC_STUDIO_LIGHTING,
    setLightBaseSettings,
    keyLightColor: baseLightSettings.keyLightColor,
    setKeyLightColor,
    keyLightIntensity: baseLightSettings.keyLightIntensity,
    setKeyLightIntensity,
    keyLightPosition: baseLightSettings.keyLightPosition,
    setKeyLightPosition,
    keyLightSoftness: baseLightSettings.keyLightSoftness,
    setKeyLightSoftness,
    keyLightPositionKeyframes,
    setKeyLightPositionKeyframes,
    activeKeyLightPosition,
    lightPositionKeyframeAtPlayhead,
    toggleLightPositionKeyframeAtPlayhead,
    updateLightPositionXY,
  }
}
