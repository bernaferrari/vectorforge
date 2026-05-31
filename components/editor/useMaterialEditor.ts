"use client"

import { useCallback, useMemo, useState } from "react"
import type { MaterialPresetId } from "../3d/MaterialPresets"
import {
  MaterialKeyframe,
  MaterialSettingKey,
  MaterialSettings,
  clampNumber,
} from "./EditorModel"
import { materialDefaultSettings } from "./FinishRegistry"
import { interpolateMaterialKeyframes } from "./KeyframeInterpolationModel"
import {
  DEFAULT_MATERIAL_SETTINGS,
  findMaterialKeyframeAtTime,
  materialPlayheadTime,
  upsertMaterialKeyframe,
} from "./MaterialEditorModel"

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
  const [baseMaterialSettings, setBaseMaterialSettings] =
    useState<MaterialSettings>(() => ({
      ...DEFAULT_MATERIAL_SETTINGS,
    }))
  const [materialKeyframes, setMaterialKeyframes] = useState<
    MaterialKeyframe[]
  >([])
  const [isAdvancedMaterialOpen, setIsAdvancedMaterialOpen] =
    useState<boolean>(false)

  const activeMaterialSettings = useMemo(
    () =>
      interpolateMaterialKeyframes(
        currentTime,
        baseMaterialSettings,
        materialKeyframes
      ),
    [baseMaterialSettings, currentTime, materialKeyframes]
  )

  const setMaterialBaseSettings = useCallback((settings: MaterialSettings) => {
    setBaseMaterialSettings(settings)
  }, [])

  const setMaterialBaseSetting = useCallback(
    (key: MaterialSettingKey, value: number) => {
      setBaseMaterialSettings((settings) => ({ ...settings, [key]: value }))
    },
    []
  )

  const updateMaterialSetting = useCallback(
    (key: MaterialSettingKey, value: number, min: number, max: number) => {
      const clamped = clampNumber(value, min, max)
      const playheadTime = materialPlayheadTime(currentTime, duration)
      onEdit()
      setMaterialBaseSetting(key, clamped)
      setMaterialKeyframes((prev) => {
        if (prev.length === 0) return prev
        const nextValue = { ...activeMaterialSettings, [key]: clamped }
        return upsertMaterialKeyframe({
          keyframes: prev,
          time: playheadTime,
          value: nextValue,
        })
      })
    },
    [
      activeMaterialSettings,
      currentTime,
      duration,
      onEdit,
      setMaterialBaseSetting,
    ]
  )

  const applyMaterialPreset = useCallback(
    (preset: MaterialPresetId) => {
      const settings = materialDefaultSettings(preset)
      setMaterialPreset(preset)
      onEdit()
      if (!settings) return

      setMaterialBaseSettings(settings)
      setMaterialKeyframes((prev) => {
        if (prev.length === 0) return prev

        return upsertMaterialKeyframe({
          keyframes: prev,
          time: materialPlayheadTime(currentTime, duration),
          value: settings,
        })
      })
    },
    [currentTime, duration, onEdit, setMaterialBaseSettings]
  )

  const materialKeyframeAtPlayhead = useCallback(() => {
    return findMaterialKeyframeAtTime(
      materialKeyframes,
      materialPlayheadTime(currentTime, duration)
    )
  }, [currentTime, duration, materialKeyframes])

  return {
    materialPreset,
    setMaterialPreset,
    roughness: baseMaterialSettings.roughness,
    metalness: baseMaterialSettings.metalness,
    reflectance: baseMaterialSettings.reflectance,
    clearcoat: baseMaterialSettings.clearcoat,
    clearcoatRoughness: baseMaterialSettings.clearcoatRoughness,
    transmission: baseMaterialSettings.transmission,
    thickness: baseMaterialSettings.thickness,
    emissiveIntensity: baseMaterialSettings.emissiveIntensity,
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
