"use client"

import { useState } from "react"
import {
  EXTRUDE_DEFAULT,
  GEOMETRY_QUALITY_DEFAULT,
  type ScalarKeyframe,
  type Vector3Keyframe,
} from "./EditorModel"

export function useGeometryEditor() {
  const [wireframe] = useState(false)
  const [extrusionDepth, setExtrusionDepth] = useState(EXTRUDE_DEFAULT)
  const [bevelEnabled, setBevelEnabled] = useState(true)
  const [bevelThickness, setBevelThickness] = useState(0.15)
  const [bevelSize, setBevelSize] = useState(0.08)
  const [bevelSegments, setBevelSegments] = useState(3)
  const [geometryQuality, setGeometryQuality] = useState(
    GEOMETRY_QUALITY_DEFAULT
  )
  const [qualityKeyframes, setQualityKeyframes] = useState<ScalarKeyframe[]>([])
  const [layerSpacing, setLayerSpacing] = useState(0.8)
  const [innerElementScale, setInnerElementScale] = useState({
    x: 1,
    y: 1,
    z: 1,
  })
  const [innerScaleKeyframes, setInnerScaleKeyframes] = useState<
    Vector3Keyframe[]
  >([])

  return {
    wireframe,
    extrusionDepth,
    setExtrusionDepth,
    bevelEnabled,
    setBevelEnabled,
    bevelThickness,
    setBevelThickness,
    bevelSize,
    setBevelSize,
    bevelSegments,
    setBevelSegments,
    geometryQuality,
    setGeometryQuality,
    qualityKeyframes,
    setQualityKeyframes,
    layerSpacing,
    setLayerSpacing,
    innerElementScale,
    setInnerElementScale,
    innerScaleKeyframes,
    setInnerScaleKeyframes,
  }
}
