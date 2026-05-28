"use client"

import { useMemo, useState } from "react"
import type { MaterialPresetId } from "../3d/MaterialPresets"
import {
  MaterialKeyframe,
  MaterialSettingKey,
  MaterialSettings,
  TimeKeyframe,
  clampNumber,
  createEditorId,
  interpolateMaterialKeyframes,
  quantizeTimeToFrame,
} from "./EditorModel"
import { materialDefaultSettings } from "./FinishRegistry"
import type { FillKeyframe } from "./TimelineModel"

const DEFAULT_MATERIAL_SETTINGS: MaterialSettings = {
  roughness: 0.075,
  metalness: 0.48,
  reflectance: 1,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
  transmission: 0,
  thickness: 1,
  emissiveIntensity: 0.08,
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

export function useMaterialEditor({
  currentTime,
  duration,
  onEdit,
}: {
  currentTime: number
  duration: number
  onEdit: () => void
}) {
  const [materialPreset, setMaterialPreset] =
    useState<MaterialPresetId>("chrome")
  const [roughness, setRoughness] = useState<number>(
    DEFAULT_MATERIAL_SETTINGS.roughness
  )
  const [metalness, setMetalness] = useState<number>(
    DEFAULT_MATERIAL_SETTINGS.metalness
  )
  const [reflectance, setReflectance] = useState<number>(
    DEFAULT_MATERIAL_SETTINGS.reflectance
  )
  const [clearcoat, setClearcoat] = useState<number>(
    DEFAULT_MATERIAL_SETTINGS.clearcoat
  )
  const [clearcoatRoughness, setClearcoatRoughness] = useState<number>(
    DEFAULT_MATERIAL_SETTINGS.clearcoatRoughness
  )
  const [transmission, setTransmission] = useState<number>(
    DEFAULT_MATERIAL_SETTINGS.transmission
  )
  const [thickness, setThickness] = useState<number>(
    DEFAULT_MATERIAL_SETTINGS.thickness
  )
  const [emissiveIntensity, setEmissiveIntensity] = useState<number>(
    DEFAULT_MATERIAL_SETTINGS.emissiveIntensity
  )
  const [materialKeyframes, setMaterialKeyframes] = useState<
    MaterialKeyframe[]
  >([])
  const [isAdvancedMaterialOpen, setIsAdvancedMaterialOpen] =
    useState<boolean>(false)

  const baseMaterialSettings = useMemo<MaterialSettings>(
    () => ({
      roughness,
      metalness,
      reflectance,
      clearcoat,
      clearcoatRoughness,
      transmission,
      thickness,
      emissiveIntensity,
    }),
    [
      roughness,
      metalness,
      reflectance,
      clearcoat,
      clearcoatRoughness,
      transmission,
      thickness,
      emissiveIntensity,
    ]
  )

  const activeMaterialSettings = useMemo(
    () =>
      interpolateMaterialKeyframes(
        currentTime,
        baseMaterialSettings,
        materialKeyframes
      ),
    [baseMaterialSettings, currentTime, materialKeyframes]
  )

  const keyframeTimeMatchesPlayhead = (time: number) =>
    Math.abs(time - quantizeTimeToFrame(currentTime)) < 0.04

  const setMaterialBaseSettings = (settings: MaterialSettings) => {
    setRoughness(settings.roughness)
    setMetalness(settings.metalness)
    setReflectance(settings.reflectance)
    setClearcoat(settings.clearcoat)
    setClearcoatRoughness(settings.clearcoatRoughness)
    setTransmission(settings.transmission)
    setThickness(settings.thickness)
    setEmissiveIntensity(settings.emissiveIntensity)
  }

  const setMaterialBaseSetting = (key: MaterialSettingKey, value: number) => {
    setMaterialBaseSettings({ ...baseMaterialSettings, [key]: value })
  }

  const updateMaterialSetting = (
    key: MaterialSettingKey,
    value: number,
    min: number,
    max: number
  ) => {
    const clamped = clampNumber(value, min, max)
    const playheadTime = clampNumber(
      quantizeTimeToFrame(currentTime),
      0,
      duration
    )
    onEdit()
    setMaterialBaseSetting(key, clamped)
    setMaterialKeyframes((prev) => {
      if (prev.length === 0) return prev
      const nextValue = { ...activeMaterialSettings, [key]: clamped }
      const existing = prev.find(
        (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
      )
      if (existing) {
        return prev.map((keyframe) =>
          keyframe.id === existing.id
            ? { ...keyframe, value: nextValue }
            : keyframe
        )
      }

      return [
        ...prev,
        {
          id: createEditorId("material"),
          time: playheadTime,
          value: nextValue,
          easing: previousEasingFor(prev, playheadTime),
        },
      ].sort((a, b) => a.time - b.time)
    })
  }

  const applyMaterialPreset = (preset: MaterialPresetId) => {
    const settings = materialDefaultSettings(preset)
    setMaterialPreset(preset)
    onEdit()
    if (!settings) return

    setMaterialBaseSettings(settings)
    setMaterialKeyframes((prev) => {
      if (prev.length === 0) return prev

      const playheadTime = clampNumber(
        quantizeTimeToFrame(currentTime),
        0,
        duration
      )
      const existing = prev.find((keyframe) =>
        keyframeTimeMatchesPlayhead(keyframe.time)
      )
      if (existing) {
        return prev.map((keyframe) =>
          keyframe.id === existing.id
            ? { ...keyframe, value: settings }
            : keyframe
        )
      }

      return [
        ...prev,
        {
          id: createEditorId("material"),
          time: playheadTime,
          value: settings,
          easing: previousEasingFor(prev, playheadTime),
        },
      ].sort((a, b) => a.time - b.time)
    })
  }

  const materialKeyframeAtPlayhead = () => {
    const playheadTime = quantizeTimeToFrame(currentTime)
    return materialKeyframes.find(
      (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
    )
  }

  return {
    materialPreset,
    setMaterialPreset,
    roughness,
    metalness,
    reflectance,
    clearcoat,
    clearcoatRoughness,
    transmission,
    thickness,
    emissiveIntensity,
    materialKeyframes,
    setMaterialKeyframes,
    isAdvancedMaterialOpen,
    setIsAdvancedMaterialOpen,
    baseMaterialSettings,
    activeMaterialSettings,
    setMaterialBaseSettings,
    updateMaterialSetting,
    applyMaterialPreset,
    materialKeyframeAtPlayhead,
  }
}
