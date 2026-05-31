"use client"

import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import {
  DEFAULT_GEOMETRY_SETTINGS,
  type GeometrySettings,
  type ScalarKeyframe,
  type Vector3Keyframe,
} from "./EditorModel"

const applySettingValue = <T>(value: SetStateAction<T>, previous: T) =>
  typeof value === "function" ? (value as (current: T) => T)(previous) : value

export function useGeometryEditor() {
  const [wireframe] = useState(false)
  const [baseGeometrySettings, setGeometryBaseSettings] = useState(
    DEFAULT_GEOMETRY_SETTINGS
  )
  const [qualityKeyframes, setQualityKeyframes] = useState<ScalarKeyframe[]>([])
  const [innerScaleKeyframes, setInnerScaleKeyframes] = useState<
    Vector3Keyframe[]
  >([])

  const setGeometrySetting = useCallback(
    <Key extends keyof GeometrySettings>(
      key: Key,
      value: SetStateAction<GeometrySettings[Key]>
    ) => {
      setGeometryBaseSettings((settings) => ({
        ...settings,
        [key]: applySettingValue(value, settings[key]),
      }))
    },
    []
  )

  const setExtrusionDepth: Dispatch<SetStateAction<number>> = useCallback(
    (value) => setGeometrySetting("extrusionDepth", value),
    [setGeometrySetting]
  )
  const setBevelEnabled: Dispatch<SetStateAction<boolean>> = useCallback(
    (value) => setGeometrySetting("bevelEnabled", value),
    [setGeometrySetting]
  )
  const setBevelThickness: Dispatch<SetStateAction<number>> = useCallback(
    (value) => setGeometrySetting("bevelThickness", value),
    [setGeometrySetting]
  )
  const setBevelSize: Dispatch<SetStateAction<number>> = useCallback(
    (value) => setGeometrySetting("bevelSize", value),
    [setGeometrySetting]
  )
  const setBevelSegments: Dispatch<SetStateAction<number>> = useCallback(
    (value) => setGeometrySetting("bevelSegments", value),
    [setGeometrySetting]
  )
  const setGeometryQuality: Dispatch<SetStateAction<number>> = useCallback(
    (value) => setGeometrySetting("geometryQuality", value),
    [setGeometrySetting]
  )
  const setLayerSpacing: Dispatch<SetStateAction<number>> = useCallback(
    (value) => setGeometrySetting("layerSpacing", value),
    [setGeometrySetting]
  )
  const setInnerElementScale: Dispatch<
    SetStateAction<GeometrySettings["innerElementScale"]>
  > = useCallback(
    (value) => setGeometrySetting("innerElementScale", value),
    [setGeometrySetting]
  )

  return {
    wireframe,
    setGeometryBaseSettings,
    extrusionDepth: baseGeometrySettings.extrusionDepth,
    setExtrusionDepth,
    bevelEnabled: baseGeometrySettings.bevelEnabled,
    setBevelEnabled,
    bevelThickness: baseGeometrySettings.bevelThickness,
    setBevelThickness,
    bevelSize: baseGeometrySettings.bevelSize,
    setBevelSize,
    bevelSegments: baseGeometrySettings.bevelSegments,
    setBevelSegments,
    geometryQuality: baseGeometrySettings.geometryQuality,
    setGeometryQuality,
    qualityKeyframes,
    setQualityKeyframes,
    layerSpacing: baseGeometrySettings.layerSpacing,
    setLayerSpacing,
    innerElementScale: baseGeometrySettings.innerElementScale,
    setInnerElementScale,
    innerScaleKeyframes,
    setInnerScaleKeyframes,
  }
}
