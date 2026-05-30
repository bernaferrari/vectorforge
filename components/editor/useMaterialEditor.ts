"use client"

import { useMemo, useState } from "react"
import type { MaterialPresetId } from "../3d/MaterialPresets"
import {
  MaterialKeyframe,
  MaterialSettingKey,
  MaterialSettings,
  clampNumber,
  interpolateMaterialKeyframes,
} from "./EditorModel"
import { materialDefaultSettings } from "./FinishRegistry"
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
  }

  const applyMaterialPreset = (preset: MaterialPresetId) => {
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
  }

  const materialKeyframeAtPlayhead = () => {
    return findMaterialKeyframeAtTime(
      materialKeyframes,
      materialPlayheadTime(currentTime, duration)
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
